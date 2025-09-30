import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import logger from '../utils/logger.js';

class EmailService {
  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY || 're_ytiYvkY7_N6Q7W97ru3MgifUryQyAGfgZ');
    this.transporter = null;
    this.initializeTransporter();
  }

  async initializeTransporter() {
    try {
      // Check if Resend is configured (primary email service)
      if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_ytiYvkY7_N6Q7W97ru3MgifUryQyAGfgZ') {
        logger.info('Email service initialized with Resend');
        this.transporter = null; // Not needed when using Resend
        return;
      }

      // Check if SMTP is configured (fallback)
      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        // Configure nodemailer transporter (fallback)
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: process.env.SMTP_PORT || 587,
          secure: false,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });

        // Verify connection
        await this.transporter.verify();
        logger.info('Email service initialized with SMTP');
      } else {
        // Neither Resend nor SMTP configured
        logger.warn('Email service not configured - missing Resend API key or SMTP credentials');
        this.transporter = null;
      }
    } catch (error) {
      logger.error('Email service initialization failed:', error);
      this.transporter = null;
    }
  }

  async sendEmail(email) {
    try {
      // Try Resend first (preferred)
      if (this.resend && process.env.RESEND_API_KEY) {
        return await this.sendWithResend(email);
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

  async sendWithResend(email) {
    try {
      if (!this.resend) {
        throw new Error('Resend service not configured');
      }

      const result = await this.resend.emails.send({
        from: `${email.from.name} <${email.from.email}>`,
        to: [email.to],
        subject: email.subject,
        html: email.content.html,
        text: email.content.text || this.stripHtml(email.content.html),
        headers: {
          'X-Email-ID': email._id.toString(),
          'X-User-ID': email.userId.toString()
        }
      });

      logger.info(`Email sent via Resend: ${result.data?.id}`);
      return {
        messageId: result.data?.id,
        provider: 'resend'
      };
    } catch (error) {
      logger.error('Resend email error:', error);
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
          email: process.env.EMAIL_FROM || 'noreply@marketingfirm.com',
          name: process.env.EMAIL_FROM_NAME || 'Marketing Firm'
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
