importScripts('emailConfig.js');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background received message:', request.action);

    if (request.action === 'pushToSheets') {
        processPushRequest(request)
            .then((result) => {
                sendResponse(result);
            })
            .catch(error => {
                sendResponse({ success: false, error: error.message });
            });
        return true;
    }

    if (request.action === 'checkAuth') {
        getAuthToken(true)
            .then(token => fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${token}` }
            }))
            .then(response => response.json())
            .then(user => sendResponse({ success: true, email: user.email }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
});

async function getAuthToken(interactive = true) {
    return new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive }, (token) => {
            if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
            else if (!token) reject(new Error('No token returned from Google'));
            else resolve(token);
        });
    });
}

async function processPushRequest(request) {
    const { spreadsheetId, sheetName, data, sendEmail, schedule } = request;
    const token = await getAuthToken(true);

    // 1. Attempt to find email
    let email = 'Not Found';
    try {
        email = await findEmailFromMailmeteor(data.profileUrl);
    } catch (e) { console.error('Email finding failed:', e); }

    // 2. Determine Status and Scheduling
    let status = 'scraped';
    let emailSent = false;
    let scheduledTime = '';

    if (sendEmail) {
        if (email !== 'Not Found' && !email.includes('Timeout')) {
            const isNow = !schedule || schedule.time === 'now';

            if (isNow) {
                try {
                    await shootEmail(token, email, data, EMAIL_CONFIG);
                    status = 'mail sent';
                    emailSent = true;
                } catch (e) {
                    console.error('Email sending failed:', e);
                    status = 'mail failed';
                }
            } else {
                status = 'scheduled';
                // Calculate proper Date for Column J
                const date = new Date();
                if (schedule.date === 'tomorrow') date.setDate(date.getDate() + 1);
                if (schedule.date === 'day_after') date.setDate(date.getDate() + 2);

                const [hours, minutes] = schedule.time.split(':').map(Number);
                date.setHours(hours, minutes, 0, 0);
                scheduledTime = date.toLocaleString(); // Format as readable timestamp
            }
        } else {
            status = 'no email found';
        }
    }

    // 3. Push to Sheets (10 columns: A to J)
    const range = `${sheetName}!A:J`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`;
    const entryTime = new Date().toLocaleString(); // Full date and time

    const values = [[
        data.firstName, data.lastName, data.fullName,
        data.currentCompany, data.role, data.profileUrl,
        email, entryTime, status, scheduledTime
    ]];

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values })
    });

    if (!response.ok) throw new Error('Sheets API Error');

    return { success: true, emailSent, status };
}

async function shootEmail(token, email, data, template) {
    const subject = template.subject
        .replace(/{{FirstName}}/g, data.firstName || '')
        .replace(/{{FullName}}/g, data.fullName || '')
        .replace(/{{Company}}/g, data.currentCompany || '');

    const body = template.body
        .replace(/{{FirstName}}/g, data.firstName || '')
        .replace(/{{FullName}}/g, data.fullName || '')
        .replace(/{{Company}}/g, data.currentCompany || '');

    const message = [
        `To: ${email}`,
        `Subject: ${subject}`,
        'Content-Type: text/html; charset=utf-8',
        '',
        body
    ].join('\r\n');

    const encodedMessage = btoa(unescape(encodeURIComponent(message)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw: encodedMessage })
    });

    if (!response.ok) throw new Error('Gmail API Error');
}

async function findEmailFromMailmeteor(linkedinUrl) {
    return new Promise((resolve) => {
        const searchUrl = `https://mailmeteor.com/tools/linkedin-email-finder?linkedin-url=${encodeURIComponent(linkedinUrl)}`;
        chrome.tabs.create({ url: searchUrl, active: false }, (tab) => {
            const tabId = tab.id;
            let checkCount = 0;
            const checker = setInterval(async () => {
                checkCount++;
                if (checkCount > 35) {
                    clearInterval(checker);
                    chrome.tabs.remove(tabId);
                    resolve('Not Found (Timeout)');
                    return;
                }
                try {
                    const results = await chrome.scripting.executeScript({
                        target: { tabId: tabId },
                        func: () => {
                            const copyBtn = document.getElementById('copyEmailBtn');
                            if (copyBtn) {
                                const emailEl = document.querySelector('.linkedin-email-finder__text.text-secondary');
                                if (emailEl && emailEl.innerText.includes('@')) return { success: true, email: emailEl.innerText.trim() };
                            }
                            const resultsArea = document.getElementById('linkedin-email-finder-results');
                            if (resultsArea && (resultsArea.innerText.includes('No results found') || resultsArea.innerText.includes('couldn\'t find an email'))) return { success: false };
                            return null;
                        }
                    });
                    const res = results[0]?.result;
                    if (res) {
                        clearInterval(checker);
                        chrome.tabs.remove(tabId);
                        resolve(res.success ? res.email : 'Not Found');
                    }
                } catch (e) { }
            }, 1000);
        });
    });
}
