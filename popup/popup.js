document.addEventListener('DOMContentLoaded', () => {
  const enableToggle = document.getElementById('enableToggle');
  const timeoutSlider = document.getElementById('timeoutSlider');
  const timeoutLabel = document.getElementById('timeoutLabel');
  const soundToggle = document.getElementById('soundToggle');
  const statusLabel = document.getElementById('statusLabel');

  // Load current settings
  chrome.storage.local.get(['enabled', 'timeout', 'sound'], (result) => {
    enableToggle.checked = result.enabled !== false;
    timeoutSlider.value = result.timeout || 60;
    timeoutLabel.textContent = `${timeoutSlider.value}s`;
    soundToggle.checked = result.sound || false;
  });

  // Update logic
  enableToggle.addEventListener('change', () => {
    chrome.storage.local.set({ enabled: enableToggle.checked });
  });

  timeoutSlider.addEventListener('input', () => {
    timeoutLabel.textContent = `${timeoutSlider.value}s`;
  });

  timeoutSlider.addEventListener('change', () => {
    chrome.storage.local.set({ timeout: parseInt(timeoutSlider.value) });
  });

  soundToggle.addEventListener('change', () => {
    chrome.storage.local.set({ sound: soundToggle.checked });
  });

  // Periodic status check
  setInterval(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'getStatus' }, (response) => {
          if (chrome.runtime.lastError) {
             statusLabel.textContent = 'Disconnected';
             statusLabel.style.color = '#ff4444';
             return;
          }
          if (response && response.status) {
            statusLabel.textContent = response.status;
            statusLabel.style.color = response.status === 'ON ALERT 🚨' ? '#ff4444' : '#4CAF50';
          }
        });
      }
    });
  }, 1000);
});
