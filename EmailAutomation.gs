/**
 * Job Leads Scraper - Bulk Email Automation
 * 
 * Instructions:
 * 1. Open your Google Sheet.
 * 2. Go to Extensions > Apps Script.
 * 3. Delete any code there and paste this code.
 * 4. Update the CONFIG section below.
 * 5. Click the "Send Emails" button (or run the sendEmails function).
 */

const CONFIG = {
  SHEET_NAME: 'Sheet1',
  EMAIL_COLUMN_INDEX: 7, // Column G (1-indexed)
  STATUS_COLUMN_INDEX: 9, // Column I (1-indexed)
  DRIVE_FILE_ID: 'YOUR_GOOGLE_DRIVE_FILE_ID_HERE', // Optional: Get ID from the file's share link
  EMAIL_SUBJECT: 'Exploring Product Manager Opportunities',
  EMAIL_BODY: `Hi {{FirstName}},<br><br>
        I hope you're doing well. I'm reaching out to see if you're aware of any current or upcoming openings in the&nbsp;<strong>Product Management</strong>&nbsp;domain. I'm currently working as a Product Manager on&nbsp;<strong>AI-driven software platforms</strong>, with over 7 years of experience across product management, software development, data analytics, and consulting.<br><br>
        If you feel my background could be relevant, I'd be grateful for any references or introductions within your network that could help route my profile to the right recruiter or hiring manager. <br>Here is my <a href="https://hilalmohammed1993.github.io/webportfolio/">Portfolio Link</a> and <a href="https://github.com/hilalmohammed1993">GitHub Profile</a> <br> I've attached my <a href="https://drive.google.com/file/d/1B7Ti-VEAwRdqIKw5Cf6RndMrDmYhh7FL/view?usp=drive_link">Resume</a> for context and would be happy to share more details if helpful.
        <br><br>
        Thanks and Regards,<br>
        Hilal Mohammed<br>
        Product Manager <br>
        +971 50 491 7374 <br>
        hilalmohammed1993@gmail.com`
};

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 Scraper Tools')
      .addItem('Bulk Send Emails', 'sendEmails')
      .addToUi();
}

function sendEmails() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const file = CONFIG.DRIVE_FILE_ID !== 'YOUR_GOOGLE_DRIVE_FILE_ID_HERE' ? DriveApp.getFileById(CONFIG.DRIVE_FILE_ID) : null;
  
  let sentCount = 0;
  
  // Skip header row
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const email = row[CONFIG.EMAIL_COLUMN_INDEX - 1];
    const status = row[CONFIG.STATUS_COLUMN_INDEX - 1];
    const firstName = row[0];
    const company = row[3];
    
    // Only send if email exists and status is not already "mail sent"
    if (email && email.includes('@') && status !== 'mail sent') {
      const subject = CONFIG.EMAIL_SUBJECT
          .replace(/{{FirstName}}/g, firstName)
          .replace(/{{Company}}/g, company);
          
      const body = CONFIG.EMAIL_BODY
          .replace(/{{FirstName}}/g, firstName)
          .replace(/{{Company}}/g, company);
      
      const options = {
        htmlBody: body
      };
      if (file) {
        options.attachments = [file.getAs(SpreadsheetApp.MimeType.PDF)]; // Adjust mime type as needed
      }
      
      try {
        GmailApp.sendEmail(email, subject, body, options);
        sheet.getRange(i + 1, CONFIG.STATUS_COLUMN_INDEX).setValue('email sent through GAS');
        sentCount++;
      } catch (e) {
        sheet.getRange(i + 1, CONFIG.STATUS_COLUMN_INDEX).setValue('mail failed');
      }
    }
  }
  
  SpreadsheetApp.getUi().alert('Finished! Sent ' + sentCount + ' emails.');
}
