chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'scrape') {
        try {
            const data = scrapeProfileData();
            sendResponse({ success: true, data });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }
    return true;
});

function scrapeProfileData() {
    // This is a generic scraper. 
    // For specific platforms like LinkedIn, we would need more specific selectors.

    let fullName = '';
    let firstName = '';
    let lastName = '';
    let currentCompany = '';
    let role = '';
    const profileUrl = window.location.href;

    // Attempt to scrape based on common patterns or meta tags
    // LinkedIn specific (common target for this)
    if (window.location.hostname.includes('linkedin.com')) {
        fullName = document.querySelector('h1.text-heading-xlarge')?.innerText.trim() || '';
        role = document.querySelector('div.text-body-medium.break-words')?.innerText.trim() || '';
        // Company is often harder as it's in a list, but let's try the top one
        currentCompany = document.querySelector('button[aria-label^="Current company"]')?.innerText.trim() ||
            document.querySelector('.pv-text-details__right-panel [aria-label^="Current company"]')?.innerText.trim() || '';
    }

    // Generic fallback or other common sites
    if (!fullName) {
        fullName = document.querySelector('h1')?.innerText.trim() || document.title.split('|')[0].trim();
    }

    if (fullName) {
        const parts = fullName.split(' ');
        firstName = parts[0];
        lastName = parts.slice(1).join(' ');
    }

    return {
        fullName,
        firstName,
        lastName,
        currentCompany,
        role,
        profileUrl
    };
}
