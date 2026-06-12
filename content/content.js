// ==========================================
// Spidey Watch - Content Script
// ==========================================

const SPIDEY_SVG = `
<svg viewBox="0 0 100 120" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <!-- Web Line to feet -->
  <line class="spidey-passive-web" x1="50" y1="0" x2="50" y2="20" stroke="#fff" stroke-width="2" />
  
  <!-- Left Leg -->
  <g class="spidey-leg-left" transform="translate(50, 20)">
    <path d="M 0 0 Q -15 15 -10 40 L -5 40 Q -5 20 0 0 Z" fill="#e23636" stroke="#000" stroke-width="1"/>
  </g>

  <!-- Right Leg -->
  <g class="spidey-leg-right" transform="translate(50, 20)">
    <path d="M 0 0 Q 15 15 10 40 L 5 40 Q 5 20 0 0 Z" fill="#e23636" stroke="#000" stroke-width="1"/>
  </g>

  <!-- Body -->
  <ellipse cx="50" cy="55" rx="14" ry="24" fill="#0c4a8e" stroke="#000" stroke-width="1"/>
  <!-- Red Torso Detail -->
  <path d="M 42 45 Q 50 68 58 45 L 54 35 Q 50 40 46 35 Z" fill="#e23636" stroke="#000" stroke-width="1"/>
  <!-- Spider Logo (simplified) -->
  <circle cx="50" cy="50" r="3" fill="#000"/>
  <path d="M 45 45 L 50 50 L 55 45 M 45 55 L 50 50 L 55 55" stroke="#000" fill="none" stroke-width="1"/>

  <!-- Left Arm -->
  <g class="spidey-arm-left" transform="translate(37, 45)">
    <path d="M 0 0 Q -12 10 -8 28 Q -4 30 0 28 Q -4 15 5 5 Z" fill="#e23636" stroke="#000" stroke-width="1"/>
  </g>

  <!-- Right Arm -->
  <g class="spidey-arm-right" transform="translate(63, 45)">
    <path d="M 0 0 Q 12 10 8 28 Q 4 30 0 28 Q 4 15 -5 5 Z" fill="#e23636" stroke="#000" stroke-width="1"/>
  </g>

  <!-- Head (Upside down) -->
  <g class="spidey-head" transform="translate(50, 85)">
    <ellipse cx="0" cy="0" rx="14" ry="16" fill="#e23636" stroke="#000" stroke-width="1"/>
    <!-- Web patterns on head -->
    <path d="M 0 -16 L 0 16 M -14 0 L 14 0 M -10 -10 L 10 10 M -10 10 L 10 -10" stroke="#000" stroke-width="0.5" opacity="0.6"/>
    <path d="M -7 -12 Q 0 -5 7 -12 M -12 -7 Q -5 0 -12 7 M 12 -7 Q 5 0 12 7 M -7 12 Q 0 5 7 12" fill="none" stroke="#000" stroke-width="0.5" opacity="0.6"/>
    <!-- Lenses -->
    <path class="spidey-lens" d="M -2 2 Q -8 10 -12 2 Q -6 -4 -2 2 Z" fill="#fff" stroke="#000" stroke-width="1.5"/>
    <path class="spidey-lens" d="M 2 2 Q 8 10 12 2 Q 6 -4 2 2 Z" fill="#fff" stroke="#000" stroke-width="1.5"/>
  </g>
</svg>
`;

let spideyContainer = null;
let canvas = null;
let ctx = null;
let isEnabled = true;
let timeoutMs = 60000;
let soundEnabled = false;
let isIdle = false;
let idleTimer = null;
let isBerserk = false;

// Audio context (lazy init)
let audioCtx = null;

// Speech bubble strings
const SPEECH_LINES = [
  "Hey! You still there?",
  "Don't make me call Aunt May.",
  "HELLO?? \uD83D\uDC4B",
  "I can do this all day.",
  "Bro wake up.",
  "Peter tingle going crazy rn.",
  "Earth to human! \uD83C\uDF0D",
  "I'm getting dizzy over here.",
  "You're missing all my sweet moves!",
  "Are we napping? Is it nap time?",
  "With great power comes... lots of waiting.",
  "Webs ain't free, you know!",
  "WAKE UP! WAKE UP!"
];

function init() {
  // Load settings
  chrome.storage.local.get(['enabled', 'timeout', 'sound'], (res) => {
    isEnabled = res.enabled !== false;
    timeoutMs = (res.timeout || 60) * 1000;
    soundEnabled = res.sound || false;

    if (isEnabled) {
      injectSpidey();
      resetIdleTimer();
      setupEventListeners();
    }
  });

  // Listen for setting changes
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.enabled) {
      isEnabled = changes.enabled.newValue;
      if (isEnabled) {
        if (!spideyContainer) injectSpidey();
        resetIdleTimer();
        setupEventListeners();
      } else {
        removeSpidey();
        clearTimeout(idleTimer);
        removeEventListeners();
      }
    }
    if (changes.timeout) {
      timeoutMs = changes.timeout.newValue * 1000;
      resetIdleTimer();
    }
    if (changes.sound) {
      soundEnabled = changes.sound.newValue;
    }
  });
}

function injectSpidey() {
  if (spideyContainer) return;

  // Create canvas overlay
  canvas = document.createElement('canvas');
  canvas.id = 'spidey-canvas-overlay';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  ctx = canvas.getContext('2d');

  window.addEventListener('resize', () => {
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
  });

  // Create Spidey Container
  spideyContainer = document.createElement('div');
  spideyContainer.id = 'spidey-container';
  spideyContainer.classList.add('spidey-hanging');
  spideyContainer.innerHTML = SPIDEY_SVG;
  document.body.appendChild(spideyContainer);

  startPassiveAnimations();
}

function removeSpidey() {
  if (spideyContainer) {
    spideyContainer.remove();
    spideyContainer = null;
  }
  if (canvas) {
    canvas.remove();
    canvas = null;
    ctx = null;
  }
  endBerserkMode(true); // silent end
}

function setupEventListeners() {
  const reset = () => {
    if (isBerserk) {
      endBerserkMode();
    }
    resetIdleTimer();
  };
  window.addEventListener('mousemove', reset, { passive: true });
  window.addEventListener('keydown', reset, { passive: true });
  window.addEventListener('scroll', reset, { passive: true });
  window.addEventListener('click', reset, { passive: true });
}

function removeEventListeners() {
  // Hard to remove without named functions, but we can just ignore if disabled.
}

function resetIdleTimer() {
  if (!isEnabled) return;
  isIdle = false;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (!isBerserk && isEnabled) {
      startBerserkMode();
    }
  }, timeoutMs);
}

// ==========================================
// Passive Animations
// ==========================================
function startPassiveAnimations() {
  // Blinking
  setInterval(() => {
    if (!spideyContainer || isBerserk) return;
    if (Math.random() > 0.5) {
      spideyContainer.classList.add('spidey-blink');
      setTimeout(() => spideyContainer.classList.remove('spidey-blink'), 200);
    }
  }, 5000);

  // Scratching
  setInterval(() => {
    if (!spideyContainer || isBerserk) return;
    if (Math.random() > 0.6) {
      spideyContainer.classList.add('spidey-scratch');
      setTimeout(() => spideyContainer.classList.remove('spidey-scratch'), 1000);
    }
  }, 20000);

  // Leg cross
  setInterval(() => {
    if (!spideyContainer || isBerserk) return;
    spideyContainer.classList.add('spidey-leg-cross');
    setTimeout(() => spideyContainer.classList.remove('spidey-leg-cross'), 3000);
  }, 15000);
}

// ==========================================
// Berserk Mode
// ==========================================
let berserkLoop = null;
let currentTarget = null;
let spideyX = window.innerWidth - 50;
let spideyY = 0;
let activeWebs = [];
let animFrame = null;

function startBerserkMode() {
  isBerserk = true;
  isIdle = true;
  
  // Start shudder
  spideyContainer.classList.remove('spidey-hanging');
  spideyContainer.classList.add('spidey-shudder');
  spideyContainer.style.transformOrigin = 'center center'; // pivot for swinging

  setTimeout(() => {
    if (!isBerserk) return;
    spideyContainer.classList.remove('spidey-shudder');
    spideyX = window.innerWidth - 50;
    spideyY = 0;
    
    // Start drawing loop
    if (!animFrame) renderLoop();
    
    nextSwing();
  }, 300);
}

function endBerserkMode(silent = false) {
  isBerserk = false;
  isIdle = false;
  clearTimeout(berserkLoop);
  
  if (!silent && spideyContainer) {
    // Jump animation
    spideyContainer.classList.add('spidey-jump');
    setTimeout(() => spideyContainer.classList.remove('spidey-jump'), 400);

    // Swing back home
    shootWeb(window.innerWidth, 0);
    swingTo(window.innerWidth - 50, 0, () => {
      if (spideyContainer) {
        spideyContainer.style.transform = `translate(0px, 0px) rotate(0deg)`;
        spideyContainer.classList.add('spidey-hanging');
        spideyContainer.style.transformOrigin = 'top center';
      }
    });
  }
}

function nextSwing() {
  if (!isBerserk) return;

  // Include text elements but don't overwhelm the array if there are too many
  const targets = Array.from(document.querySelectorAll('a, button, h1, h2, h3, h4, h5, p, li, span, label, input, [role="button"]'))
    .filter(el => {
      const rect = el.getBoundingClientRect();
      // Ensure it has some size, isn't too huge (like a full page wrapper), and is visible in the viewport
      return rect.width > 5 && rect.height > 5 && rect.width < window.innerWidth * 0.8 &&
             rect.top >= 0 && rect.bottom <= window.innerHeight &&
             rect.left >= 0 && rect.right <= window.innerWidth;
    });

  if (targets.length === 0) {
    // Nowhere to swing, just wait
    berserkLoop = setTimeout(nextSwing, 1000);
    return;
  }

  // Pick random target
  currentTarget = targets[Math.floor(Math.random() * targets.length)];
  const rect = currentTarget.getBoundingClientRect();
  const targetX = rect.left + rect.width / 2;
  const targetY = rect.top + rect.height / 2;

  // Shoot web
  shootWeb(targetX, targetY);
  
  // Swing there
  swingTo(targetX, targetY, () => {
    if (!isBerserk) return;
    
    // Wobble the element
    currentTarget.classList.add('spidey-wobble');
    setTimeout(() => currentTarget.classList.remove('spidey-wobble'), 500);

    // High chance for speech bubble
    if (Math.random() < 0.60) {
      showSpeechBubble();
    }

    // Wait on element then swing again
    berserkLoop = setTimeout(nextSwing, 500 + Math.random() * 1000);
  });
}

function swingTo(tx, ty, callback) {
  const startX = spideyX;
  const startY = spideyY;
  const duration = 600;
  const startTime = performance.now();
  
  // Optional mid-air spin
  const doSpin = Math.random() < 0.3;

  if (spideyContainer) {
    spideyContainer.classList.add('spidey-swinging');
  }

  function step(time) {
    if (!isBerserk && tx !== window.innerWidth - 50) return; // Abort if not berserk (unless returning home)
    
    let progress = (time - startTime) / duration;
    if (progress > 1) progress = 1;

    // Easing out
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
       // Default fixed position is top:0, right:0, so we use transform translate
       // Window width - 100 (width of spidey) is default X.
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
  
  // Add to active webs array
  activeWebs.push({
    sx: startX, sy: startY,
    tx: tx, ty: ty,
    createdAt: performance.now(),
    life: 1500
  });

  createParticles(tx, ty);
}

function createParticles(x, y) {
  // Very simple rendering loop handles particle effects in the future, 
  // but let's just do it directly on the canvas as short-lived lines.
  for (let i=0; i<5; i++) {
    const angle = Math.random() * Math.PI * 2;
    activeWebs.push({
      particle: true,
      x: x, y: y,
      vx: Math.cos(angle) * 5,
      vy: Math.sin(angle) * 5,
      createdAt: performance.now(),
      life: 300
    });
  }
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
      ctx.lineTo(web.x - web.vx*2, web.y - web.vy*2);
      ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      // Draw Bezier Web
      ctx.beginPath();
      ctx.moveTo(web.sx, web.sy);
      const midX = (web.sx + web.tx) / 2;
      const midY = (web.sy + web.ty) / 2;
      // Add natural droop
      ctx.quadraticCurveTo(midX, midY + 40, web.tx, web.ty);
      ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  animFrame = requestAnimationFrame(renderLoop);
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

// Web Audio API for simple synthetic 'thwip' sound
function playThwipSound() {
  if (!soundEnabled) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.1);
    
    // Quick burst of white noise would be better, but a descending chirp is okay for no-asset thwip
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
  } catch(e) {
    // Ignore audio errors
  }
}

// Messaging
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStatus') {
    sendResponse({ status: isBerserk ? 'ON ALERT \uD83D\uDEA8' : 'Hanging around...' });
  }
});

// Run
init();
