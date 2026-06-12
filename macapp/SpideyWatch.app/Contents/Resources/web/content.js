// ==========================================
// Spidey Watch macOS App - Transparent Layer Script
// ==========================================

// Intercept logs and redirect them to Swift for easy terminal debugging
if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.spideyLog) {
  window.console.log = function(...args) {
    const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
    window.webkit.messageHandlers.spideyLog.postMessage(msg);
  };
}

console.log("transparent webview content.js loaded!");

let spideyContainer = null;
let canvas = null;
let ctx = null;
let isEnabled = true;
let timeoutMs = 60000;
let soundEnabled = false;
let isIdle = false;
let isBerserk = false;

// Audio context (lazy init)
let audioCtx = null;

// Speech bubble strings
const SPEECH_LINES = [
  "Hey! You still there?",
  "Don't make me call Aunt May.",
  "HELLO?? 👋",
  "I can do this all day.",
  "Bro wake up.",
  "Peter tingle going crazy rn.",
  "Earth to human! 🌍",
  "I'm getting dizzy over here.",
  "You're missing all my sweet moves!",
  "Are we napping? Is it nap time?",
  "With great power comes... lots of waiting.",
  "Webs ain't free, you know!",
  "WAKE UP! WAKE UP!"
];

// Settings application called from Swift wrapper
window.applySettings = function(settings) {
  console.log("Applying settings: " + JSON.stringify(settings));
  isEnabled = settings.enabled;
  timeoutMs = settings.timeout * 1000;
  soundEnabled = settings.sound;

  if (isEnabled) {
    if (!spideyContainer) {
      injectSpidey();
    }
  } else {
    removeSpidey();
  }
};

function injectSpidey() {
  if (spideyContainer) return;

  console.log("Injecting Spidey into transparent window overlay");

  // Create canvas overlay
  canvas = document.getElementById('spidey-canvas-overlay');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  ctx = canvas.getContext('2d');

  window.addEventListener('resize', () => {
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
  });

  spideyContainer = document.getElementById('spidey-container');
  startPassiveAnimations();
}

function removeSpidey() {
  console.log("Removing Spidey overlay effects");
  endBerserkMode(true); // silent end
}

// ==========================================
// Passive Animations
// ==========================================
function startPassiveAnimations() {
  // Blinking
  let blinkInterval = setInterval(() => {
    if (!spideyContainer || isBerserk) return;
    if (Math.random() > 0.5) {
      spideyContainer.classList.add('spidey-blink');
      setTimeout(() => spideyContainer.classList.remove('spidey-blink'), 200);
    }
  }, 5000);

  // Scratching
  let scratchInterval = setInterval(() => {
    if (!spideyContainer || isBerserk) return;
    if (Math.random() > 0.6) {
      spideyContainer.classList.add('spidey-scratch');
      setTimeout(() => spideyContainer.classList.remove('spidey-scratch'), 1000);
    }
  }, 20000);

  // Leg cross
  let legInterval = setInterval(() => {
    if (!spideyContainer || isBerserk) return;
    spideyContainer.classList.add('spidey-leg-cross');
    setTimeout(() => spideyContainer.classList.remove('spidey-leg-cross'), 3000);
  }, 15000);
}

// ==========================================
// Berserk Mode (Idle State Action)
// ==========================================
let berserkLoop = null;
let spideyX = window.innerWidth - 50;
let spideyY = 0;
let activeWebs = [];
let animFrame = null;

window.startBerserkMode = function() {
  if (isBerserk || !isEnabled) return;
  console.log("Starting Berserk Mode - Spidey is on the loose!");
  isBerserk = true;
  isIdle = true;
  
  // Start shudder
  spideyContainer.classList.remove('spidey-hanging');
  spideyContainer.classList.add('spidey-shudder');
  spideyContainer.style.transformOrigin = 'center center';

  setTimeout(() => {
    if (!isBerserk) return;
    spideyContainer.classList.remove('spidey-shudder');
    spideyX = window.innerWidth - 50;
    spideyY = 0;
    
    // Start drawing loop
    if (!animFrame) {
      renderLoop();
    }
    
    nextSwing();
  }, 300);
};

window.endBerserkMode = function(silent = false) {
  if (!isBerserk) return;
  console.log("Ending Berserk Mode - user is active!");
  isBerserk = false;
  isIdle = false;
  clearTimeout(berserkLoop);
  
  if (!silent && spideyContainer) {
    // Jump animation
    spideyContainer.classList.add('spidey-jump');
    setTimeout(() => spideyContainer.classList.remove('spidey-jump'), 400);

    // Swing back home
    shootWeb(window.innerWidth - 50, 0);
    swingTo(window.innerWidth - 50, 0, () => {
      if (spideyContainer) {
        spideyContainer.style.transform = `translate(0px, 0px) rotate(0deg)`;
        spideyContainer.classList.add('spidey-hanging');
        spideyContainer.style.transformOrigin = 'top center';
      }
      if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.spideyAction) {
        window.webkit.messageHandlers.spideyAction.postMessage("returnedHome");
      }
    });
  } else if (spideyContainer) {
    spideyContainer.style.transform = `translate(0px, 0px) rotate(0deg)`;
    spideyContainer.classList.add('spidey-hanging');
    spideyContainer.style.transformOrigin = 'top center';
    if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.spideyAction) {
      window.webkit.messageHandlers.spideyAction.postMessage("returnedHome");
    }
  }
};

function nextSwing() {
  if (!isBerserk) return;

  // Choose a random location on screen for Spidey to swing to
  const marginX = 80;
  const marginY = 100;
  const targetX = marginX + Math.random() * (window.innerWidth - marginX * 2);
  const targetY = marginY + Math.random() * (window.innerHeight - marginY * 2);

  console.log(`Swinging to coordinates: X=${Math.round(targetX)}, Y=${Math.round(targetY)}`);

  // Shoot web to target
  shootWeb(targetX, targetY);
  
  // Swing there
  swingTo(targetX, targetY, () => {
    if (!isBerserk) return;
    
    // Draw visual web splat on canvas at target point
    drawWebSplat(targetX, targetY);

    // High chance for speech bubble
    if (Math.random() < 0.65) {
      showSpeechBubble();
    }

    // Wait on element then swing again
    berserkLoop = setTimeout(nextSwing, 500 + Math.random() * 1200);
  });
}

function swingTo(tx, ty, callback) {
  const startX = spideyX;
  const startY = spideyY;
  const duration = 650;
  const startTime = performance.now();
  
  const doSpin = Math.random() < 0.3;

  if (spideyContainer) {
    spideyContainer.classList.add('spidey-swinging');
  }

  function step(time) {
    if (!isBerserk && tx !== window.innerWidth - 50) return; // Abort if not berserk (unless returning home)
    
    let progress = (time - startTime) / duration;
    if (progress > 1) progress = 1;

    // Cubic ease-out
    const easeProgress = 1 - Math.pow(1 - progress, 3);

    spideyX = startX + (tx - startX) * easeProgress;
    spideyY = startY + (ty - startY) * easeProgress;

    // Calculate rotation to face the movement direction, roughly
    const dx = tx - startX;
    let rotation = (dx > 0 ? -1 : 1) * Math.sin(progress * Math.PI) * 45;
    if (doSpin) {
       rotation += progress * 360;
    }

    if (spideyContainer) {
       // Offset so the center of the Spidey is at spideyX, spideyY
       // Default top-right hangs at window.innerWidth - 50.
       const translateX = spideyX - (window.innerWidth - 50); 
       const translateY = spideyY;
       spideyContainer.style.transform = `translate(${translateX}px, ${translateY}px) rotate(${rotation}deg)`;
    }

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      if (spideyContainer) spideyContainer.classList.remove('spidey-swinging');
      if (callback) callback();
    }
  }
  requestAnimationFrame(step);
}

function shootWeb(tx, ty) {
  playThwipSound();
  
  const startX = spideyX;
  const startY = spideyY;
  
  activeWebs.push({
    sx: startX, sy: startY,
    tx: tx, ty: ty,
    createdAt: performance.now(),
    life: 1200
  });

  createParticles(tx, ty);
}

function createParticles(x, y) {
  for (let i = 0; i < 6; i++) {
    const angle = Math.random() * Math.PI * 2;
    activeWebs.push({
      particle: true,
      x: x, y: y,
      vx: Math.cos(angle) * (3 + Math.random() * 3),
      vy: Math.sin(angle) * (3 + Math.random() * 3),
      createdAt: performance.now(),
      life: 250 + Math.random() * 150
    });
  }
}

function drawWebSplat(x, y) {
  activeWebs.push({
    splat: true,
    x: x, y: y,
    createdAt: performance.now(),
    life: 1200
  });
}

function renderLoop(time) {
  if (!canvas || !ctx) return;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const now = performance.now();
  
  for (let i = activeWebs.length - 1; i >= 0; i--) {
    const web = activeWebs[i];
    const age = now - web.createdAt;
    
    if (age > web.life) {
      activeWebs.splice(i, 1);
      continue;
    }

    const opacity = 1 - (age / web.life);
    
    if (web.particle) {
      web.x += web.vx;
      web.y += web.vy;
      ctx.beginPath();
      ctx.moveTo(web.x, web.y);
      ctx.lineTo(web.x - web.vx * 1.5, web.y - web.vy * 1.5);
      ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else if (web.splat) {
      ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.7})`;
      ctx.lineWidth = 1.2;
      
      // Draw 8 spokes of the web splat
      ctx.beginPath();
      for (let j = 0; j < 8; j++) {
        const angle = (j * Math.PI) / 4;
        ctx.moveTo(web.x, web.y);
        ctx.lineTo(web.x + Math.cos(angle) * 22, web.y + Math.sin(angle) * 22);
      }
      ctx.stroke();
      
      // Inner web circles
      ctx.beginPath();
      ctx.arc(web.x, web.y, 8, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(web.x, web.y, 16, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // Draw Bezier Web line
      ctx.beginPath();
      ctx.moveTo(web.sx, web.sy);
      const midX = (web.sx + web.tx) / 2;
      const midY = (web.sy + web.ty) / 2;
      ctx.quadraticCurveTo(midX, midY + 40, web.tx, web.ty);
      ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  animFrame = requestAnimationFrame(renderLoop);
}

// Web Audio API for simple synthetic 'thwip' sound
function playThwipSound() {
  if (!soundEnabled) return;
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(820, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, audioCtx.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.25, audioCtx.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.15);
  } catch(e) {
    console.log("Audio play error: " + e);
  }
}

function showSpeechBubble() {
  if (!spideyContainer) return;
  
  const bubble = document.createElement('div');
  bubble.className = 'spidey-speech-bubble';
  bubble.innerText = SPEECH_LINES[Math.floor(Math.random() * SPEECH_LINES.length)];
  spideyContainer.appendChild(bubble);

  setTimeout(() => {
    bubble.classList.add('fade-out');
    setTimeout(() => bubble.remove(), 500);
  }, 2500);
}

// Initialize Spidey immediately when DOM loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => injectSpidey());
} else {
  injectSpidey();
}
