let latestResponse = '';

// Listen for network requests to capture latest claim status
chrome.webRequest.onCompleted.addListener(
  async (details) => {
    if (details.url.includes('/benefits_claims')) {
      try {
        const response = await fetch(details.url, {
          credentials: 'include' // if needed
        });
        const json = await response.json();
        latestResponse = JSON.stringify(json, null, 2);
        console.log("Captured claim status:", latestResponse);
      } catch (err) {
        console.error('Error fetching response again:', err);
      }
    }
  },
  { urls: ["*://api.va.gov/*"] }
);

// Handle popup requests for latest data
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'getLatestClaimStatus') {
    sendResponse({ data: latestResponse });
  }
});

// Notify popup when tab reloads
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    chrome.runtime.sendMessage({ type: 'pageReloaded' });
  }
});

