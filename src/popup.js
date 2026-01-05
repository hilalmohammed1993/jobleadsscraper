document.addEventListener('DOMContentLoaded', () => {
    const spreadsheetIdInput = document.getElementById('spreadsheetId');
    const sheetNameInput = document.getElementById('sheetName');
    const pushBtn = document.getElementById('pushBtn');
    const authBtn = document.getElementById('authBtn');
    const statusDiv = document.getElementById('status');

    // Load saved settings
    chrome.storage.local.get(['spreadsheetId', 'sheetName'], (data) => {
        if (data.spreadsheetId) spreadsheetIdInput.value = data.spreadsheetId;
        if (data.sheetName) sheetNameInput.value = data.sheetName;
    });

    // Save settings on input
    const saveSettings = () => {
        chrome.storage.local.set({
            spreadsheetId: spreadsheetIdInput.value.trim(),
            sheetName: sheetNameInput.value.trim()
        });
    };

    spreadsheetIdInput.addEventListener('input', saveSettings);
    sheetNameInput.addEventListener('input', saveSettings);

    const showStatus = (msg, isError = false) => {
        statusDiv.textContent = msg;
        statusDiv.className = 'status-msg ' + (isError ? 'status-error' : 'status-success');
        setTimeout(() => {
            statusDiv.textContent = '';
        }, 5000);
    };

    pushBtn.addEventListener('click', async () => {
        const spreadsheetId = spreadsheetIdInput.value.trim();
        const sheetName = sheetNameInput.value.trim();

        if (!spreadsheetId) {
            showStatus('Please enter a Spreadsheet ID', true);
            return;
        }

        pushBtn.classList.add('loading');
        pushBtn.disabled = true;

        try {
            // 1. Get data from content script
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (!tab) {
                throw new Error('No active tab found');
            }

            const response = await chrome.tabs.sendMessage(tab.id, { action: 'scrape' });

            if (!response || response.error) {
                throw new Error(response?.error || 'Failed to scrape data');
            }

            // 2. Send data to background script to push to Sheets
            console.log('Sending data to background script...');
            chrome.runtime.sendMessage({
                action: 'pushToSheets',
                spreadsheetId,
                sheetName,
                data: response.data
            }, (bgResponse) => {
                pushBtn.classList.remove('loading');
                pushBtn.disabled = false;

                if (chrome.runtime.lastError) {
                    console.error('Runtime error:', chrome.runtime.lastError);
                    showStatus('Connection error: ' + chrome.runtime.lastError.message, true);
                    return;
                }

                if (bgResponse && bgResponse.success) {
                    showStatus('Success! Data pushed to Google Sheets.');
                } else {
                    showStatus('Error: ' + (bgResponse?.error || 'Unknown background error'), true);
                }
            });

        } catch (error) {
            console.error('Popup error:', error);
            pushBtn.classList.remove('loading');
            pushBtn.disabled = false;
            showStatus(error.message, true);
        }
    });

    authBtn.addEventListener('click', () => {
        authBtn.textContent = 'Checking...';
        chrome.runtime.sendMessage({ action: 'checkAuth' }, (response) => {
            authBtn.textContent = 'Check Authentication';
            if (chrome.runtime.lastError) {
                showStatus('Auth service error: ' + chrome.runtime.lastError.message, true);
                return;
            }
            if (response && response.success) {
                showStatus('Authenticated as ' + response.email);
            } else {
                showStatus('Auth failed: ' + (response?.error || 'Unknown error'), true);
            }
        });
    });
});
