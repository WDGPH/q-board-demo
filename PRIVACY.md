# Privacy & Anonymity

QBoard is designed to make it easy for everyone to participate in event discussions without identifying themselves. Here's how we handle your information.

### Is my participation anonymous?

**You do not need to provide your name, email address, or create an account to participate.** Questions and votes are not displayed with your identity.

When you first use QBoard, the system assigns your browser a unique, anonymous identifier. This allows the app to recognize your previous activity, including questions you've submitted and votes you've cast, and helps prevent duplicate voting.

This identifier normally remains the same when you return using the same browser. Using a different browser or device, or clearing your browser data, may create a new identifier.

Although the identifier does not directly reveal who you are, it allows activity from the same browser to be linked together. For this reason, **it is technically possible to trace a participant's activity** even if their use of QBoard is anonymous to other attendees.

### What information is collected?

QBoard stores the questions you submit, your votes, the anonymous identifiers associated with those activities, and relevant timestamps.

Event moderators can review all submitted questions, including those that are not approved for display. Approved questions may be visible to other attendees and shown during event discussions. Voting results are displayed as totals, not individual voting records.

Please avoid including personal, confidential, or sensitive information in your questions, as the content itself could identify you or others.

### Where is the information stored?

QBoard uses [**Supabase**](https://supabase.com/), a cloud-based platform, to securely store and manage questions, votes, and anonymous identifiers. The database is hosted in {{SUPABASE_REGION}}.

The QBoard website is delivered using {{DEPLOYMENT_ENVIRONMENT}}. These service providers may also process limited technical information, such as access logs, to operate and protect their services.

### How long is information retained?

Questions, voting records, and associated anonymous identifiers will be retained for {{RETENTION_PERIOD}} following the event, after which they will be removed from the active database.

Information exported by event organizers for reporting or follow-up may be retained separately in accordance with the organizer's applicable records-retention requirements. Limited technical logs and backups may remain temporarily under the service providers' retention practices.

### Who can I contact?

For questions or concerns about privacy, the use of QBoard, or information you have submitted, please contact:

**{{CONTACT_NAME}}**\
{{ORGANIZATION_NAME}}\
{{CONTACT_EMAIL}}

*Last updated: {{UPDATED_DATE}}*