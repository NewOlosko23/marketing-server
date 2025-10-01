import nodemailer from 'nodemailer';
import Mailjet from 'node-mailjet';
import logger from '../utils/logger.js';

class EmailService {
  constructor() {
    this.mailjet = null;
    this.transporter = null;
    this.initializeTransporter();
  }

  async initializeTransporter() {
    try {
      // Check if Mailjet is configured (primary email service)
      if (true) { // Always use hardcoded Mailjet keys
        this.mailjet = new Mailjet({
          apiKey: '77f88844f6df9fce5cb22b9e26e99208',
          apiSecret: '8305269ebd5a9d920e7cc128a7e86b62'
        });
        logger.info('Email service initialized with Mailjet');
        return;
      }

      // Check if SMTP is configured (fallback) - disabled for hardcoded setup
      if (false) { // SMTP fallback disabled
        // Configure nodemailer transporter (fallback)
        this.transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: 'hardcoded_user',
            pass: 'hardcoded_pass'
          }
        });

        // Verify connection
        await this.transporter.verify();
        logger.info('Email service initialized with SMTP');
      } else {
        // Neither Mailjet nor SMTP configured
        logger.warn('Email service not configured - missing Mailjet API keys or SMTP credentials');
        this.transporter = null;
      }
    } catch (error) {
      logger.error('Email service initialization failed:', error);
      this.transporter = null;
    }
  }

  async sendEmail(email) {
    try {
      // Try Mailjet first (preferred)
      if (this.mailjet) {
        return await this.sendWithMailjet(email);
      }

      // Fallback to nodemailer
      if (this.transporter) {
        return await this.sendWithNodemailer(email);
      }

      // For development, just log the email
      logger.info(`[DEV] Email would be sent to: ${email.to}`);
      logger.info(`[DEV] Subject: ${email.subject}`);
      return {
        messageId: `dev_${Date.now()}`,
        provider: 'development'
      };
    } catch (error) {
      logger.error('Email send error:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  async sendWithMailjet(email) {
    try {
      if (!this.mailjet) {
        throw new Error('Mailjet service not configured');
      }

      const request = this.mailjet.post('send', { version: 'v3.1' }).request({
        Messages: [
          {
            From: {
              Email: email.from.email,
              Name: email.from.name
            },
            To: [
              {
                Email: email.to,
                Name: email.to.split('@')[0] // Use email prefix as name
              }
            ],
            Subject: email.subject,
            TextPart: email.content.text || this.stripHtml(email.content.html),
            HTMLPart: email.content.html,
            CustomID: email._id ? email._id.toString() : `email_${Date.now()}`,
            Headers: {
              'X-Email-ID': email._id ? email._id.toString() : '',
              'X-User-ID': email.userId ? email.userId.toString() : ''
            }
          }
        ]
      });

      const result = await request;
      
      logger.info(`Email sent via Mailjet: ${result.body.Messages[0].To[0].MessageID}`);
      return {
        messageId: result.body.Messages[0].To[0].MessageID,
        provider: 'mailjet'
      };
    } catch (error) {
      logger.error('Mailjet email error:', error);
      throw error;
    }
  }

  async sendWithNodemailer(email) {
    try {
      const mailOptions = {
        from: `${email.from.name} <${email.from.email}>`,
        to: email.to,
        subject: email.subject,
        html: email.content.html,
        text: email.content.text || this.stripHtml(email.content.html),
        headers: {
          'X-Email-ID': email._id.toString(),
          'X-User-ID': email.userId.toString()
        }
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      logger.info(`Email sent via Nodemailer: ${result.messageId}`);
      return {
        messageId: result.messageId,
        provider: 'nodemailer'
      };
    } catch (error) {
      logger.error('Nodemailer email error:', error);
      throw error;
    }
  }

  async sendBulkEmails(emails) {
    const results = [];
    
    for (const email of emails) {
      try {
        const result = await this.sendEmail(email);
        results.push({ email: email._id, success: true, result });
      } catch (error) {
        results.push({ email: email._id, success: false, error: error.message });
      }
    }

    return results;
  }

  async sendTemplate(templateId, to, variables = {}) {
    try {
      // Get template (placeholder - implement template system)
      const template = await this.getTemplate(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      // Replace variables in template
      const subject = this.replaceVariables(template.subject, variables);
      const html = this.replaceVariables(template.html, variables);
      const text = this.replaceVariables(template.text, variables);

      // Create email object
      const email = {
        to,
        subject,
        content: { html, text },
        from: {
          email: 'oloogeorge633@gmail.com', // Hardcoded email
          name: 'Marketing Farm' // Hardcoded name
        },
        metadata: {
          templateId,
          variables
        }
      };

      return await this.sendEmail(email);
    } catch (error) {
      logger.error('Send template error:', error);
      throw error;
    }
  }

  async getTemplate(templateId) {
    // Placeholder - implement template system
    const templates = {
      welcome: {
        subject: 'Welcome to Marketing Firm!',
        html: '<h1>Welcome {{name}}!</h1><p>Thank you for joining us.</p>',
        text: 'Welcome {{name}}! Thank you for joining us.'
      }
    };

    return templates[templateId] || null;
  }

  replaceVariables(text, variables) {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] || match;
    });
  }

  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  async validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  async getDeliveryStatus(messageId) {
    try {
      // Implement delivery status checking
      // This would depend on the email provider
      return {
        status: 'delivered',
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Get delivery status error:', error);
      throw error;
    }
  }

  async handleWebhook(payload) {
    try {
      // Handle email webhooks (delivery, bounce, open, click)
      const { type, data } = payload;
      
      switch (type) {
        case 'email.delivered':
          await this.handleDelivery(data);
          break;
        case 'email.bounced':
          await this.handleBounce(data);
          break;
        case 'email.opened':
          await this.handleOpen(data);
          break;
        case 'email.clicked':
          await this.handleClick(data);
          break;
        default:
          logger.warn(`Unknown webhook type: ${type}`);
      }
    } catch (error) {
      logger.error('Handle webhook error:', error);
      throw error;
    }
  }

  async handleDelivery(data) {
    // Find email by message ID and mark as delivered
    const { default: Email } = await import('../models/Email.js');
    const email = await Email.findOne({ 'tracking.messageId': data.messageId });
    if (email) {
      await email.markAsDelivered();
    }
  }

  async handleBounce(data) {
    // Find email by message ID and mark as bounced
    const { default: Email } = await import('../models/Email.js');
    const email = await Email.findOne({ 'tracking.messageId': data.messageId });
    if (email) {
      await email.markAsBounced(data.reason || 'Bounced');
    }
  }

  async handleOpen(data) {
    // Find email by message ID and mark as opened
    const { default: Email } = await import('../models/Email.js');
    const email = await Email.findOne({ 'tracking.messageId': data.messageId });
    if (email) {
      await email.markAsOpened();
    }
  }

  async handleClick(data) {
    // Find email by message ID and mark as clicked
    const { default: Email } = await import('../models/Email.js');
    const email = await Email.findOne({ 'tracking.messageId': data.messageId });
    if (email) {
      await email.markAsClicked();
    }
  }
}

export default new EmailService();
