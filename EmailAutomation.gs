/**
 * Job Leads Scraper - Bulk Email & Scheduling Automation (v2)
 * 
 * Instructions:
 * 1. Open your Google Sheet.
 * 2. Go to Extensions > Apps Script.
 * 3. Delete any code there and paste this code.
 * 4. Update the CONFIG section.
 * 5. Run 'setupTrigger' once from the script editor.
 */

const CONFIG = {
  SHEET_NAME: 'Sheet1',
  EMAIL_COLUMN_INDEX: 7, // Column G
  STATUS_COLUMN_INDEX: 9, // Column I
  SCHEDULE_COLUMN_INDEX: 10, // Column J
  DRIVE_FILE_ID: 'YOUR_GOOGLE_DRIVE_FILE_ID_HERE', 
  EMAIL_SUBJECT: 'Exploring Product Manager Opportunities',
  EMAIL_BODY: `Hi {{FirstName}},<br><br>
        I hope you're doing well. I'm reaching out to see if you're aware of any current or upcoming openings in the&nbsp;<strong>Product Management</strong>&nbsp;domain. I'm currently working as a Product Manager on&nbsp;<strong>AI-driven software platforms</strong>, with over 7 years of experience across product management, software development, data analytics, and consulting.<br><br>
        If you feel my background could be relevant, I'd be grateful for any references or introductions within your network that could help route my profile to the right recruiter or hiring manager. <br>Here is my <a href="https://webportfolio-nine-eta.vercel.app/">Portfolio Link</a> and <a href="https://github.com/hilalmohammed1993">GitHub Profile</a> <br> I've attached my <a href="https://drive.google.com/file/d/1B7Ti-VEAwRdqIKw5Cf6RndMrDmYhh7FL/view?usp=drive_link">Resume</a> for context and would be happy to share more details if helpful.
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
      .addItem('Bulk Send Emails (Manual)', 'sendEmails')
      .addItem('Initialize Auto-Scheduler', 'setupTrigger')
      .addToUi();
}

function setupTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('checkScheduledEmails').timeBased().everyHours(1).create();
  SpreadsheetApp.getUi().alert('Auto-Scheduler is now ACTIVE!');
}

function checkScheduledEmails() {
  processEmails(new Date());
}

function sendEmails() {
  processEmails(null);
}

function processEmails(currentTime) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const file = CONFIG.DRIVE_FILE_ID !== 'YOUR_GOOGLE_DRIVE_FILE_ID_HERE' ? DriveApp.getFileById(CONFIG.DRIVE_FILE_ID) : null;
  
  let sentCount = 0;
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const email = row[CONFIG.EMAIL_COLUMN_INDEX - 1];
    const status = row[CONFIG.STATUS_COLUMN_INDEX - 1];
    const scheduleVal = row[CONFIG.SCHEDULE_COLUMN_INDEX - 1]; // This is now a proper Date object in the spreadsheet
    const firstName = row[0];
    const company = row[3];
    
    // Skip if already sent
    if (!email || !email.includes('@') || status === 'mail sent' || status === 'email sent through GAS') continue;

    let shouldSend = false;
    
    if (currentTime === null) {
      // Manual trigger: Send anything with status "scheduled" or "no email found" (if email exists now)
      if (email && (status === 'scheduled' || status === 'no email found' || status === 'scraped')) {
        shouldSend = true;
      }
    } else if (status === 'scheduled' && scheduleVal) {
      // Auto trigger: Check if it's time
      const scheduledDate = new Date(scheduleVal);
      if (!isNaN(scheduledDate.getTime()) && currentTime >= scheduledDate) {
        shouldSend = true;
      }
    }

    if (shouldSend) {
      const subject = CONFIG.EMAIL_SUBJECT.replace(/{{FirstName}}/g, firstName).replace(/{{Company}}/g, company);
      const body = CONFIG.EMAIL_BODY.replace(/{{FirstName}}/g, firstName).replace(/{{Company}}/g, company);
      
      const options = { htmlBody: body };
      if (file) options.attachments = [file.getAs(SpreadsheetApp.MimeType.PDF)];
      
      try {
        GmailApp.sendEmail(email, subject, body, options);
        sheet.getRange(i + 1, CONFIG.STATUS_COLUMN_INDEX).setValue('email sent through GAS');
        sentCount++;
      } catch (e) {
        sheet.getRange(i + 1, CONFIG.STATUS_COLUMN_INDEX).setValue('mail failed');
      }
    }
  }
}
