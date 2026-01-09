/**
 * Job Leads Scraper - Fixed Email Configuration
 * 
 * Edit this file to change the subject, body, and attachment link 
 * used by the "Scrape & Email" button.
 */

const EMAIL_CONFIG = {
    // Subject line (supports {{FirstName}}, {{FullName}}, {{Company}})
    subject: "Exploring Product Manager Opportunities",

    // Email body (HTML supported, supports {{FirstName}}, {{FullName}}, {{Company}})
    body: `
        Hi {{FirstName}},<br><br>
        I hope you're doing well. I'm reaching out to see if you're aware of any current or upcoming openings in the&nbsp;<strong>Product Management</strong>&nbsp;domain. I'm currently working as a Product Manager on&nbsp;<strong>AI-driven software platforms</strong>, with over 7 years of experience across product management, software development, data analytics, and consulting.<br><br>
        If you feel my background could be relevant, I'd be grateful for any references or introductions within your network that could help route my profile to the right recruiter or hiring manager. <br>Here is my <a href="https://webportfolio-nine-eta.vercel.app/">Portfolio Link</a> and <a href="https://github.com/hilalmohammed1993">GitHub Profile</a> <br> I've attached my <a href="https://drive.google.com/file/d/1B7Ti-VEAwRdqIKw5Cf6RndMrDmYhh7FL/view?usp=drive_link">Resume</a> for context and would be happy to share more details if helpful.
        <br><br>
        Thanks and Regards,<br>
        Hilal Mohammed<br>
        Product Manager <br>
        +971 50 491 7374 <br>
        hilalmohammed1993@gmail.com 
    `,

    // Attachment link (will be appended to the body if you use it in the template above)
    attachmentLink: "https://drive.google.com/file/d/1B7Ti-VEAwRdqIKw5Cf6RndMrDmYhh7FL/view?usp=drive_link"
};

// Export for background script
if (typeof module !== 'undefined') {
    module.exports = EMAIL_CONFIG;
}
