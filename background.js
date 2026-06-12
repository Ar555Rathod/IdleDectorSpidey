// Background service worker
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['enabled', 'timeout', 'sound'], (result) => {
    const defaults = {
      enabled: result.enabled !== undefined ? result.enabled : true,
      timeout: result.timeout || 60,
      sound: result.sound !== undefined ? result.sound : false
    };
    chrome.storage.local.set(defaults);
  });
});
