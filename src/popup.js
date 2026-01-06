document.addEventListener('DOMContentLoaded', () => {
    const spreadsheetIdInput = document.getElementById('spreadsheetId');
    const sheetNameInput = document.getElementById('sheetName');
    const pushBtn = document.getElementById('pushBtn');
    const emailBtn = document.getElementById('emailBtn');
    const emailSubjectInput = document.getElementById('emailSubject');
    const emailBodyInput = document.getElementById('emailBody');
    const authBtn = document.getElementById('authBtn');
    const statusDiv = document.getElementById('status');
    const loader = document.getElementById('loader');
    const emailLoader = document.getElementById('emailLoader');

    const scheduleDateSelect = document.getElementById('scheduleDate');
    const scheduleTimeSelect = document.getElementById('scheduleTime');

    // Populate time dropdown
    for (let i = 0; i < 24; i++) {
        const hour = i.toString().padStart(2, '0') + ':00';
        const option = document.createElement('option');
        option.value = hour;
        option.textContent = hour;
        scheduleTimeSelect.appendChild(option);
    }

    // Load saved settings
    chrome.storage.local.get(['spreadsheetId', 'sheetName', 'scheduleDate', 'scheduleTime'], (data) => {
        if (data.spreadsheetId) spreadsheetIdInput.value = data.spreadsheetId;
        if (data.sheetName) sheetNameInput.value = data.sheetName;
        if (data.scheduleDate) scheduleDateSelect.value = data.scheduleDate;
        if (data.scheduleTime) scheduleTimeSelect.value = data.scheduleTime;
    });

    // Save settings on input/change
    const saveSettings = () => {
        chrome.storage.local.set({
            spreadsheetId: spreadsheetIdInput.value.trim(),
            sheetName: sheetNameInput.value.trim(),
            scheduleDate: scheduleDateSelect.value,
            scheduleTime: scheduleTimeSelect.value
        });
    };

    [spreadsheetIdInput, sheetNameInput].forEach(el => {
        el.addEventListener('input', saveSettings);
    });

    [scheduleDateSelect, scheduleTimeSelect].forEach(el => {
        el.addEventListener('change', saveSettings);
    });

    const showStatus = (msg, isError = false) => {
        statusDiv.textContent = msg;
        statusDiv.className = 'status-msg ' + (isError ? 'status-error' : 'status-success');
        setTimeout(() => {
            statusDiv.textContent = '';
        }, 5000);
    };

    const handleAction = async (sendEmail = false) => {
        const spreadsheetId = spreadsheetIdInput.value.trim();
        const sheetName = sheetNameInput.value.trim();

        if (!spreadsheetId) {
            showStatus('Please enter a Spreadsheet ID', true);
            return;
        }

        const activeBtn = sendEmail ? emailBtn : pushBtn;
        const activeLoader = sendEmail ? emailLoader : loader;

        activeBtn.classList.add('loading');
        activeBtn.disabled = true;
        if (activeLoader) activeLoader.style.display = 'block';

        try {
            // 1. Get data from content script
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) throw new Error('No active tab found');

            const response = await chrome.tabs.sendMessage(tab.id, { action: 'scrape' });
            if (!response || response.error) throw new Error(response?.error || 'Failed to scrape data');

            // 3. Send to background to push & potentially email
            chrome.runtime.sendMessage({
                action: 'pushToSheets',
                spreadsheetId,
                sheetName,
                data: response.data,
                sendEmail: sendEmail,
                schedule: sendEmail ? {
                    date: document.getElementById('scheduleDate').value,
                    time: document.getElementById('scheduleTime').value
                } : null
            }, (bgResponse) => {
                activeBtn.classList.remove('loading');
                activeBtn.disabled = false;
                if (activeLoader) activeLoader.style.display = 'none';

                if (chrome.runtime.lastError) {
                    showStatus('Connection error: ' + chrome.runtime.lastError.message, true);
                    return;
                }

                if (bgResponse && bgResponse.success) {
                    let msg = 'Success! Data pushed to Google Sheets.';
                    if (sendEmail) {
                        if (bgResponse.status === 'mail sent') {
                            msg = 'Success! Data pushed & Email sent.';
                        } else if (bgResponse.status === 'scheduled') {
                            msg = 'Success! Data pushed & Email scheduled.';
                        } else if (bgResponse.status === 'no mail') {
                            msg = 'Data pushed, but no email address found.';
                        } else if (bgResponse.status === 'mail failed') {
                            msg = 'Data pushed, but Gmail API failed.';
                        }
                    }
                    showStatus(msg);
                } else {
                    showStatus('Error: ' + (bgResponse?.error || 'Unknown error'), true);
                }
            });

        } catch (error) {
            activeBtn.classList.remove('loading');
            activeBtn.disabled = false;
            if (activeLoader) activeLoader.style.display = 'none';
            showStatus(error.message, true);
        }
    };

    pushBtn.addEventListener('click', () => handleAction(false));
    emailBtn.addEventListener('click', () => handleAction(true));

    authBtn.addEventListener('click', () => {
        authBtn.textContent = 'Checking...';
        chrome.runtime.sendMessage({ action: 'checkAuth' }, (response) => {
            authBtn.textContent = 'Check Authentication';
            if (response && response.success) {
                showStatus('Authenticated as ' + response.email);
            } else {
                showStatus('Auth failed: ' + (response?.error || 'Unknown error'), true);
            }
        });
    });
});
