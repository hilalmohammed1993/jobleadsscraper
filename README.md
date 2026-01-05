# Job Leads Scraper 🚀

A premium Google Chrome extension designed to streamline lead generation by scraping LinkedIn profile data and pushing it directly to a Google Sheet.

## ✨ Features
- **One-Click Scraping:** Extract Full Name, Current Company, Role/Designation, and Profile URL.
- **Waterfall Email Extraction:** 
  - Displays results in a dedicated "Email" column in your spreadsheet.
- **Direct Google Sheets Integration:** Real-time data appending via the official Google Sheets API.
- **Glassmorphism UI:** A modern, sleek interface built for a premium user experience.
- **Privacy First:** All data is pushed directly to your personal Google Sheet using secure OAuth2 authentication.

## 🛠️ Setup Instructions

### 1. Google Cloud Project Setup
To use the Google Sheets API, you need a Client ID:
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project named `Job Leads Scraper`.
3. Go to **APIs & Services > Library** and enable the **Google Sheets API**.
4. Go to **OAuth consent screen**, set User Type to **External**, and add your email as a test user.
5. Go to **Credentials > Create Credentials > OAuth client ID**.
6. Select **Chrome extension** as the Application type.
7. Provide the **Extension ID** (find this in `chrome://extensions` after loading the unpacked extension).
8. Copy the generated **Client ID** and paste it into the `manifest.json` file in the `oauth2` section.

### 2. Extension Installation
1. Download or clone this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the root directory of this project.

### 3. Usage
1. Open the extension popup by clicking the icon in your toolbar.
2. Enter your **Spreadsheet ID** (found in the URL of your Google Sheet: `https://docs.google.com/spreadsheets/d/[ID_HERE]/edit`).
3. Enter the **Sheet Name** (e.g., `Sheet1`).
4. Click **Authenticate** to grant access.
5. Navigate to any LinkedIn profile and click **Scrape & Push**.

## 🏗️ Technologies Used
- **Frontend:** Vanilla HTML, CSS (Modern Glassmorphism Design), JavaScript.
- **Backend:** Chrome Extension APIs (Manifest V3, Identity, Scripting, Tabs).
- **Integrations:** Google Sheets API, Mailmeteor.

## 🔒 Security
- Use the `.gitignore` provided to avoid pushing your `manifest.json` (if it contains sensitive client IDs) or any local credentials.
- The extension uses **OAuth2** for secure access to your Google account.

---
*Created with ❤️ for efficient lead generation.*
