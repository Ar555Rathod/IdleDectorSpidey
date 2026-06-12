import Cocoa
import WebKit

class AppDelegate: NSObject, NSApplicationDelegate, WKScriptMessageHandler, WKNavigationDelegate {
    var statusItem: NSStatusItem!
    var overlayWindow: NSWindow!
    var webView: WKWebView!
    
    // Timers
    var idleTimer: Timer?
    var hoverTimer: Timer?
    
    // Application state
    var isEnabled = true
    var timeout: TimeInterval = 60
    var soundEnabled = false
    var isBerserk = false
    var isSystemFullScreen = false
    
    // UI elements to update state
    var enableMenuItem: NSMenuItem!
    var soundMenuItem: NSMenuItem!
    var timeoutMenu: NSMenu!
    
    func applicationDidFinishLaunching(_ notification: Notification) {
        print("Spidey Watch starting native lifecycle...")
        
        // Load Settings
        loadSettings()
        
        // Setup Menu Bar Status Item
        setupStatusItem()
        
        // Setup Transparent Overlay Window & WebView
        setupOverlayWindow()
        
        // Start Background Loops
        startTimers()
    }
    
    func loadSettings() {
        let defaults = UserDefaults.standard
        if defaults.object(forKey: "enabled") == nil {
            defaults.set(true, forKey: "enabled")
        }
        if defaults.object(forKey: "timeout") == nil {
            defaults.set(60.0, forKey: "timeout")
        }
        if defaults.object(forKey: "sound") == nil {
            defaults.set(false, forKey: "sound")
        }
        
        isEnabled = defaults.bool(forKey: "enabled")
        timeout = defaults.double(forKey: "timeout")
        soundEnabled = defaults.bool(forKey: "sound")
        
        print("Settings loaded - enabled: \(isEnabled), timeout: \(timeout)s, sound: \(soundEnabled)")
    }
    
    func saveSettings() {
        let defaults = UserDefaults.standard
        defaults.set(isEnabled, forKey: "enabled")
        defaults.set(timeout, forKey: "timeout")
        defaults.set(soundEnabled, forKey: "sound")
        updateJSSettings()
        print("Settings saved.")
    }
    
    func setupStatusItem() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        if let button = statusItem.button {
            button.title = "🕷️"
        }
        
        let menu = NSMenu()
        
        // Header
        let titleItem = NSMenuItem(title: "Spidey Watch", action: nil, keyEquivalent: "")
        titleItem.isEnabled = false
        menu.addItem(titleItem)
        menu.addItem(NSMenuItem.separator())
        
        // Toggle Enabled
        enableMenuItem = NSMenuItem(title: "Enable Spidey", action: #selector(toggleEnabled), keyEquivalent: "e")
        enableMenuItem.state = isEnabled ? .on : .off
        menu.addItem(enableMenuItem)
        
        // Toggle Sound
        soundMenuItem = NSMenuItem(title: "Web Sound Effects", action: #selector(toggleSound), keyEquivalent: "s")
        soundMenuItem.state = soundEnabled ? .on : .off
        menu.addItem(soundMenuItem)
        
        // Timeout Submenu
        let timeoutItem = NSMenuItem(title: "Idle Timeout", action: nil, keyEquivalent: "")
        timeoutMenu = NSMenu()
        
        let timeouts: [(String, TimeInterval)] = [
            ("10 Seconds", 10),
            ("30 Seconds", 30),
            ("60 Seconds", 60),
            ("2 Minutes", 120),
            ("5 Minutes", 300)
        ]
        
        for (title, value) in timeouts {
            let item = NSMenuItem(title: title, action: #selector(changeTimeout(_:)), keyEquivalent: "")
            item.representedObject = value
            item.state = (timeout == value) ? .on : .off
            timeoutMenu.addItem(item)
        }
        timeoutItem.submenu = timeoutMenu
        menu.addItem(timeoutItem)
        
        menu.addItem(NSMenuItem.separator())
        
        // Quit
        menu.addItem(NSMenuItem(title: "Quit", action: #selector(quitApp), keyEquivalent: "q"))
        
        statusItem.menu = menu
        print("Status menu initialised.")
    }
    
    @objc func toggleEnabled() {
        isEnabled.toggle()
        enableMenuItem.state = isEnabled ? .on : .off
        saveSettings()
        
        if isEnabled {
            if !isSystemFullScreen {
                setWindowSize(fullScreen: false)
                overlayWindow.orderFront(nil)
            }
        } else {
            // Force end berserk and hide
            webView.evaluateJavaScript("window.endBerserkMode(true);", completionHandler: nil)
            isBerserk = false
            overlayWindow.orderOut(nil)
        }
    }
    
    @objc func toggleSound() {
        soundEnabled.toggle()
        soundMenuItem.state = soundEnabled ? .on : .off
        saveSettings()
    }
    
    @objc func changeTimeout(_ sender: NSMenuItem) {
        if let val = sender.representedObject as? TimeInterval {
            timeout = val
            for item in timeoutMenu.items {
                item.state = (item.representedObject as? TimeInterval == val) ? .on : .off
            }
            saveSettings()
        }
    }
    
    @objc func quitApp() {
        print("Quitting Spidey Watch native companion...")
        NSApplication.shared.terminate(nil)
    }
    
    func setupOverlayWindow() {
        let initialRect = NSRect(x: 0, y: 0, width: 150, height: 160)
        
        overlayWindow = NSWindow(
            contentRect: initialRect,
            styleMask: [.borderless],
            backing: .buffered,
            defer: false
        )
        
        overlayWindow.backgroundColor = .clear
        overlayWindow.isOpaque = false
        overlayWindow.hasShadow = false
        overlayWindow.level = .statusBar // Float above menu bar and other windows
        overlayWindow.ignoresMouseEvents = true // Make click-through by default
        overlayWindow.collectionBehavior = [.canJoinAllSpaces, .ignoresCycle, .fullScreenAuxiliary]
        
        // WebKit Configuration
        let config = WKWebViewConfiguration()
        let contentController = WKUserContentController()
        contentController.add(self, name: "spideyLog")
        contentController.add(self, name: "spideyAction")
        config.userContentController = contentController
        
        // Transparent WebView configurations
        config.setValue(false, forKey: "drawsBackground")
        
        webView = WKWebView(frame: initialRect, configuration: config)
        webView.autoresizingMask = [.width, .height]
        webView.navigationDelegate = self
        webView.setValue(false, forKey: "drawsBackground")
        
        // Load web/index.html
        if let indexURL = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "web") {
            print("Loading index URL: \(indexURL)")
            webView.loadFileURL(indexURL, allowingReadAccessTo: indexURL.deletingLastPathComponent())
        } else {
            print("ERROR: index.html not found in bundle resources!")
        }
        
        overlayWindow.contentView = webView
        
        setWindowSize(fullScreen: false)
        
        if isEnabled && !isSystemFullScreen {
            overlayWindow.makeKeyAndOrderFront(nil)
        }
        print("Overlay window set up: 150x160")
    }
    
    func setWindowSize(fullScreen: Bool) {
        guard let screen = NSScreen.main else { return }
        let screenRect = screen.frame
        
        let targetFrame: NSRect
        if fullScreen {
            targetFrame = screenRect
        } else {
            let width: CGFloat = 150
            let height: CGFloat = 160
            targetFrame = NSRect(
                x: screenRect.maxX - width,
                y: screenRect.maxY - height,
                width: width,
                height: height
            )
        }
        
        overlayWindow.setFrame(targetFrame, display: true, animate: false)
    }
    
    // WKNavigationDelegate
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        print("WebView navigation finished successfully. Injected settings.")
        updateJSSettings()
    }
    
    func updateJSSettings() {
        let enabledStr = isEnabled ? "true" : "false"
        let soundStr = soundEnabled ? "true" : "false"
        let js = "window.applySettings({ enabled: \(enabledStr), timeout: \(timeout), sound: \(soundStr) });"
        webView.evaluateJavaScript(js) { (result, error) in
            if let err = error {
                print("JS Evaluation Error: \(err)")
            }
        }
    }
    
    func startTimers() {
        // Core idle check & full screen check every 0.5 seconds
        idleTimer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] _ in
            self?.checkIdleAndFullScreenState()
        }
        
        // Hover checking every 0.1 seconds
        hoverTimer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
            self?.checkHoverState()
        }
        print("Timers started.")
    }
    
    func checkIdleAndFullScreenState() {
        guard isEnabled else { return }
        
        // 1. Full Screen Check (Battery Saver)
        let fullScreen = isAnyAppFullScreen()
        
        if fullScreen && !isSystemFullScreen {
            print("[Battery Saver] Fullscreen app detected. Pausing tracking and hiding Spidey.")
            isSystemFullScreen = true
            
            // Force end berserk mode silently to reset positions
            webView.evaluateJavaScript("window.endBerserkMode(true);", completionHandler: nil)
            isBerserk = false
            
            // Hide the window completely so it consumes no CPU/compositor resources
            overlayWindow.orderOut(nil)
        } else if !fullScreen && isSystemFullScreen {
            print("[Battery Saver] Exited fullscreen mode. Resuming tracking and showing Spidey.")
            isSystemFullScreen = false
            
            // Re-show overlay window
            setWindowSize(fullScreen: isBerserk)
            overlayWindow.orderFront(nil)
            updateJSSettings()
        }
        
        guard !isSystemFullScreen else { return }
        
        // 2. Idle Tracking Check
        let idleTime = CGEventSource.secondsSinceLastEventType(.hidSystemState, eventType: CGEventType(rawValue: ~0)!)
        
        if idleTime >= timeout {
            if !isBerserk {
                print("System idle for \(Int(idleTime))s >= \(Int(timeout))s. Activating Berserk Mode.")
                isBerserk = true
                setWindowSize(fullScreen: true)
                webView.evaluateJavaScript("window.startBerserkMode();", completionHandler: nil)
            }
        } else {
            if isBerserk {
                print("System activity detected (idle time \(Int(idleTime))s). Deactivating Berserk Mode.")
                isBerserk = false
                webView.evaluateJavaScript("window.endBerserkMode(false);", completionHandler: nil)
            }
        }
    }
    
    func checkHoverState() {
        guard isEnabled && !isSystemFullScreen else { return }
        
        let mousePos = NSEvent.mouseLocation
        let screenFrame = NSScreen.main?.frame ?? NSRect.zero
        
        // Map global Cocoa mouse pos (bottom-left origin) to screen top-left origin
        let mouseX = mousePos.x
        let mouseY = screenFrame.height - mousePos.y
        
        // In passive mode, Spidey hangs at the top-right corner.
        // Screen width - 120 <= mouseX <= Screen width
        // 0 <= mouseY <= 130
        let isOverSpideyPassive = mouseX >= (screenFrame.width - 120) && mouseY <= 130
        
        // If we are in Berserk mode, Spidey is swinging all over the screen.
        // We only enable mouse events if the mouse is hovering over Spidey's passive hang position.
        // During active swinging, user is idle so mouse is static. As soon as mouse moves,
        // it triggers activity, ends berserk mode, and returns Spidey to the top-right corner.
        if isOverSpideyPassive && !isBerserk {
            if overlayWindow.ignoresMouseEvents {
                overlayWindow.ignoresMouseEvents = false
                print("[Interaction] Mouse hovered over Spidey. Enabling window interactions.")
            }
        } else {
            if !overlayWindow.ignoresMouseEvents {
                overlayWindow.ignoresMouseEvents = true
                print("[Interaction] Mouse left Spidey. Window made click-through.")
            }
        }
    }
    
    func isAnyAppFullScreen() -> Bool {
        let options = CGWindowListOption.optionOnScreenOnly
        guard let windowList = CGWindowListCopyWindowInfo(options, kCGNullWindowID) as NSArray? as? [[String: Any]] else {
            return false
        }
        
        let currentPID = NSRunningApplication.current.processIdentifier
        let ourWindowNumber = overlayWindow?.windowNumber ?? -1
        let screens = NSScreen.screens
        
        for window in windowList {
            let layer = window[kCGWindowLayer as String] as? Int ?? 0
            
            // Check layers 0 to 5 (normal application windows)
            if layer >= 0 && layer <= 5 {
                // Ignore our own application's windows by process ID
                if let ownerPIDNum = window[kCGWindowOwnerPID as String] as? NSNumber,
                   ownerPIDNum.int32Value == currentPID {
                    continue
                }
                
                // Ignore our specific overlay window by window number
                if let windowNumberNum = window[kCGWindowNumber as String] as? NSNumber,
                   windowNumberNum.intValue == ourWindowNumber {
                    continue
                }
                
                let ownerName = window[kCGWindowOwnerName as String] as? String ?? ""
                
                // Ignore our own overlay window by name fallback
                if ownerName == "SpideyWatch" || ownerName == "Spidey Watch" {
                    continue
                }
                
                let boundsDict = window[kCGWindowBounds as String] as? [String: Any] ?? [:]
                let w = boundsDict["Width"] as? Double ?? 0.0
                let h = boundsDict["Height"] as? Double ?? 0.0
                
                // Check if this window matches the size of any connected screen (allowing for notch / menu bar)
                for screen in screens {
                    let screenFrame = screen.frame
                    let widthMatches = w >= (Double(screenFrame.width) - 10.0)
                    let heightMatches = h >= (Double(screenFrame.height) - 45.0)
                    if widthMatches && heightMatches {
                        return true
                    }
                }
            }
        }
        
        return false
    }
    
    // WKScriptMessageHandler
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if message.name == "spideyLog", let logBody = message.body as? String {
            print("[JS LOG] \(logBody)")
        } else if message.name == "spideyAction", let actionBody = message.body as? String {
            print("[JS ACTION] \(actionBody)")
            if actionBody == "returnedHome" {
                setWindowSize(fullScreen: false)
            }
        }
    }
}

// Entrypoint
print("Starting NSApplication setup...")
let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.run()
