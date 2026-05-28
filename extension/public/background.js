chrome.runtime.onInstalled.addListener(() => {
  console.info("[Shepherd Lens] installed");
});

chrome.action.onClicked.addListener((tab) => {
  if (!tab.id || !tab.url || !/https?:\/\/([^/]+\.)?youtube\.com\//.test(tab.url)) {
    return;
  }

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["content.js"],
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "SHEPHERD_LENS_READY") {
    sendResponse({
      ok: true,
      tabId: sender.tab?.id,
    });
  }
});
