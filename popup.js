//wait for all HTML content to be parsed before reading, then listen for page refresh
document.addEventListener('DOMContentLoaded', () => {
  const refreshBtn = document.getElementById('refreshBtn');
  const ratedOutput = document.getElementById('ratedOutput');
  const refreshRatedBtn = document.getElementById('refreshRatedBtn');

  refreshRatedBtn.addEventListener('click', () => {
    ratedOutput.textContent = 'Loading disability ratings...';

    fetch('https://api.va.gov/v0/rated_disabilities')
      .then(res => res.json())
      .then(json => {
        const html = renderJson(json);  // reuse the same function
        ratedOutput.innerHTML = html;
      })
      .catch(err => {
        ratedOutput.textContent = 'Failed to load ratings.';
        console.error(err);
      });
  });
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

  const hideIdCheckbox = document.getElementById('hideIdCheckbox');
  if (hideIdCheckbox) {
    hideIdCheckbox.addEventListener('change', updateStatus);
  }

});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'pageReloaded') {
    updateStatus();
  }
});

//This function returns the latest claim status from the API JSON Response
function updateStatus() {
  const output = document.getElementById('output');
  if (!output) return;

  output.textContent = 'Refreshing...';

  chrome.runtime.sendMessage({ type: 'getLatestClaimStatus' }, (response) => {
    if (!response || !response.data) {
      output.textContent = 'No status available.';
      return;
    }

    try {
      const json = JSON.parse(response.data);

      // Keys we want to promote to the top, change this to your liking
      const priorityKeys = ['tempJurisdiction', 'latestPhaseType', 'Phase Change Date', 'decisionLetterSent', 'status'];

      let specialHtml = '';
      for (const key of priorityKeys) {
        const value = findKeyRecursive(json, key);
        if (value !== undefined) {
          specialHtml += `
            <div class="card highlight-card">
              <div class="label">${capitalizeWords(key)}:</div>
              <div class="value highlight">${value}</div>
            </div>
          `;
        }
      }

      const highlightedHtml = renderJson(json);
      output.innerHTML = specialHtml + highlightedHtml;

      resizePopupToFitContent(); // auto-resize after update

    } catch (e) {
      output.textContent = 'Failed to parse JSON.';
    }
  });
}

//this function helps the UpdateStatus function by searching for our keys we want to prioritize, like tempJurisdiction and Phase Change Date
function findKeyRecursive(obj, targetKey) {
  if (typeof obj !== 'object' || obj === null) return undefined;

  for (const [key, value] of Object.entries(obj)) { //loop over each key-value pair in the current object level
    if (key.toLowerCase() === targetKey.toLowerCase()) {
      return value;
    }

    if (typeof value === 'object') {
      const result = findKeyRecursive(value, targetKey); //If the value is itself another object or array, we recurse into it by calling the function again
      if (result !== undefined) {
        return result;
      }
    }
  }

  return undefined;
}


//make the JSON readable to normies and highlight the Temp Jurisdiction, since that lets us know where our claim is
function renderJson(obj, indent = 0) {
  let html = '';
  const HIGHLIGHT_KEYS = ['tempjurisdiction'];
  const hideId = document.getElementById('hideIdCheckbox')?.checked;

  for (const [key, value] of Object.entries(obj)) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z]/g, '');
    const label = capitalizeWords(key);
    const isHighlighted = HIGHLIGHT_KEYS.includes(normalizedKey);

    if (hideId && normalizedKey === 'id') {
      continue; // Skip rendering the "id" key
    }

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

