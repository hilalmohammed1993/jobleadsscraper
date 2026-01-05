chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background received message:', request.action);

    if (request.action === 'pushToSheets') {
        pushToSheets(request.spreadsheetId, request.sheetName, request.data)
            .then((result) => {
                console.log('Push to sheets success:', result);
                sendResponse({ success: true });
            })
            .catch(error => {
                console.error('Push to sheets error:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true;
    }

    if (request.action === 'checkAuth') {
        console.log('Checking authentication...');
        getAuthToken(true)
            .then(token => {
                console.log('Token acquired');
                return fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${token}` }
                });
            })
            .then(response => response.json())
            .then(user => {
                console.log('User info:', user);
                sendResponse({ success: true, email: user.email });
            })
            .catch(error => {
                console.error('Auth check error:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true;
    }
});

async function getAuthToken(interactive = true) {
    console.log('getAuthToken called, interactive:', interactive);
    return new Promise((resolve, reject) => {
        try {
            chrome.identity.getAuthToken({ interactive }, (token) => {
                if (chrome.runtime.lastError) {
                    console.error('chrome.identity.getAuthToken error:', chrome.runtime.lastError);
                    reject(new Error(chrome.runtime.lastError.message));
                } else if (!token) {
                    console.error('chrome.identity.getAuthToken returned no token');
                    reject(new Error('No token returned from Google'));
                } else {
                    console.log('chrome.identity.getAuthToken success');
                    resolve(token);
                }
            });
        } catch (err) {
            console.error('getAuthToken sync error:', err);
            reject(err);
        }
    });
}

async function pushToSheets(spreadsheetId, sheetName, data) {
    const token = await getAuthToken(true);

    // Attempt to find email using Mailmeteor
    console.log('Attempting to find email for:', data.profileUrl);
    let email = 'Not Found';
    try {
        email = await findEmailFromMailmeteor(data.profileUrl);
        console.log('Email finder result:', email);
    } catch (e) {
        console.error('Email finding failed:', e);
    }

    const range = `${sheetName}!A:G`; // A to G (7 columns)
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`;

    const values = [
        [
            data.firstName,
            data.lastName,
            data.fullName,
            data.currentCompany,
            data.role,
            data.profileUrl,
            email // 7th column
        ]
    ];

    console.log('Pushing data to URL:', url);
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values })
    });

    if (!response.ok) {
        const error = await response.json();
        console.error('Sheets API Error:', error);
        throw new Error(error.error?.message || `API Error: ${response.status}`);
    }

    const result = await response.json();
    return result;
}

/**
 * Robustly finds the email by opening a temporary tab, 
 * waiting for Mailmeteor to render, and scraping the DOM.
 */
async function findEmailFromMailmeteor(linkedinUrl) {
    return new Promise((resolve) => {
        const searchUrl = `https://mailmeteor.com/tools/linkedin-email-finder?linkedin-url=${encodeURIComponent(linkedinUrl)}`;

        console.log('Opening background tab for email search:', searchUrl);
        chrome.tabs.create({ url: searchUrl, active: false }, (tab) => {
            const tabId = tab.id;
            let checkCount = 0;
            const maxChecks = 35;

            const checker = setInterval(async () => {
                checkCount++;
                if (checkCount > maxChecks) {
                    console.log('Timeout reached for email search');
                    clearInterval(checker);
                    chrome.tabs.remove(tabId);
                    resolve('Not Found (Timeout)');
                    return;
                }

                try {
                    const results = await chrome.scripting.executeScript({
                        target: { tabId: tabId },
                        func: () => {
                            // Target the "Copy Email" button which signifies the result is ready
                            const copyBtn = document.getElementById('copyEmailBtn');
                            if (copyBtn) {
                                // The email is in the span next to/above this button
                                const emailEl = document.querySelector('.linkedin-email-finder__text.text-secondary');
                                if (emailEl && emailEl.innerText.includes('@')) {
                                    return { success: true, email: emailEl.innerText.trim() };
                                }
                            }

                            // Check for hard "No results"
                            const resultsArea = document.getElementById('linkedin-email-finder-results');
                            if (resultsArea && (resultsArea.innerText.includes('No results found') || resultsArea.innerText.includes('couldn\'t find an email'))) {
                                return { success: false, reason: 'No results' };
                            }
                            return null;
                        }
                    });

                    const res = results[0]?.result;
                    if (res) {
                        clearInterval(checker);
                        chrome.tabs.remove(tabId);
                        if (res.success) {
                            resolve(res.email);
                        } else {
                            resolve('Not Found');
                        }
                    }
                } catch (e) {
                    // Ignore injection errors
                }
            }, 1000);
        });
    });
}
