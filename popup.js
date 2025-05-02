//wait for all HTML content to be parsed before reading, then listen for page refresh
document.addEventListener('DOMContentLoaded', () => {
  const refreshBtn = document.getElementById('refreshBtn');

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.reload(tabs[0].id);

          // Wait 2 seconds to allow network request to complete, then fetch updated data
          setTimeout(updateStatus, 2000);
        }
      });
    });
  }

  updateStatus();
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'pageReloaded') {
    updateStatus();
  }
});

function updateStatus() {
  const output = document.getElementById('output');
  if (!output) return;

  output.textContent = 'Refreshing...';
  
//read the claim status from the API response
  chrome.runtime.sendMessage({ type: 'getLatestClaimStatus' }, (response) => {
    if (!response || !response.data) {
      output.textContent = 'No status available.';
      return;
    }

    try {
      const json = JSON.parse(response.data);
      const highlightedHtml = renderJson(json);
      output.innerHTML = highlightedHtml;
      resizePopupToFitContent(); // <- Auto-resize here
    } catch (e) {
      output.textContent = 'Failed to parse JSON.';
    }
  });
}

//make the JSON readable to normies and highlight the jurisdiction, since that lets us know where our claim is 
function renderJson(obj, indent = 0) {
  let html = '';

  for (const [key, value] of Object.entries(obj)) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z]/g, '');
    const label = capitalizeWords(key);
    const isHighlighted = ['tempJurisdiction'].includes(normalizedKey);

    if (typeof value === 'object' && value !== null) {
      html += `
        <div class="card nested">
          <div class="label">${label}:</div>
          ${renderJson(value, indent + 1)}
        </div>`;
    } else {
      const valHtml = isHighlighted
        ? `<span class="highlight">${value}</span>`
        : `<span class="value">${value}</span>`;

      html += `
        <div class="card">
          <div class="label">${label}:</div>
          <div class="value">${valHtml}</div>
        </div>`;
    }
  }

  return html;
}

function capitalizeWords(str) {
  return str.replace(/([a-z])([A-Z])/g, '$1 $2')  // camelCase -> camel Case
            .replace(/\b\w/g, char => char.toUpperCase()); // capitalize
}

//Auto-resize popup to fit content
function resizePopupToFitContent() {
  const body = document.body;
  const html = document.documentElement;

  const height = Math.max(
    body.scrollHeight, body.offsetHeight,
    html.clientHeight, html.scrollHeight, html.offsetHeight
  );

  const width = Math.max(
    body.scrollWidth, body.offsetWidth,
    html.clientWidth, html.scrollWidth, html.offsetWidth
  );

  window.resizeTo(width + 20, height + 20);
}

