import twilio from 'twilio';
import logger from '../utils/logger.js';

class SMSService {
  constructor() {
    this.client = null;
    this.initialized = false;
    // Don't initialize automatically - only when needed
  }

  async initializeClient() {
    if (this.initialized) {
      return;
    }
    
    try {
      if (true) { // Always use hardcoded Twilio credentials
        this.client = twilio(
          'AC1234567890abcdef1234567890abcdef',
          'your_twilio_auth_token_here'
        );
        logger.info('SMS service initialized successfully');
        this.initialized = true;
      } else {
        logger.warn('SMS service not configured - missing Twilio credentials');
        this.client = null;
        this.initialized = true;
      }
    } catch (error) {
      logger.error('SMS service initialization failed:', error);
      this.client = null;
      this.initialized = true;
    }
  }

  async sendSMS(sms) {
    try {
      await this.initializeClient();
      if (!this.client) {
        throw new Error('SMS service not configured');
      }

      const result = await this.client.messages.create({
        body: sms.message,
        from: sms.from,
        to: sms.to,
        statusCallback: `http://localhost:5000/api/sms/webhook/delivery` // Hardcoded base URL
      });

      logger.info(`SMS sent via Twilio: ${result.sid}`);
      return {
        messageId: result.sid,
        sid: result.sid,
        status: result.status,
        cost: this.calculateCost(sms.message)
      };
    } catch (error) {
      logger.error('SMS send error:', error);
      throw new Error(`Failed to send SMS: ${error.message}`);
    }
  }

  async sendBulkSMS(smsList) {
    const results = [];
    
    for (const sms of smsList) {
      try {
        const result = await this.sendSMS(sms);
        results.push({ sms: sms._id, success: true, result });
      } catch (error) {
        results.push({ sms: sms._id, success: false, error: error.message });
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
      const message = this.replaceVariables(template.message, variables);

      // Create SMS object
      const sms = {
        to,
        message,
        from: '+1234567890', // Hardcoded Twilio phone number
        metadata: {
          templateId,
          variables
        }
      };

      return await this.sendSMS(sms);
    } catch (error) {
      logger.error('Send template error:', error);
      throw error;
    }
  }

  async getTemplate(templateId) {
    // Placeholder - implement template system
    const templates = {
      welcome: {
        message: 'Welcome {{name}}! Thank you for joining Marketing Firm.'
      },
      reminder: {
        message: 'Reminder: {{event}} is scheduled for {{date}} at {{time}}.'
      },
      promotion: {
        message: 'Special offer: {{offer}}! Use code {{code}} to save {{discount}}%.'
      }
    };

    return templates[templateId] || null;
  }

  replaceVariables(text, variables) {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] || match;
    });
  }

  calculateCost(message) {
    // Basic cost calculation (adjust based on your pricing)
    const segments = Math.ceil(message.length / 160);
    const costPerSegment = 0.0075; // $0.0075 per segment
    return segments * costPerSegment;
  }

  async validatePhoneNumber(phoneNumber) {
    try {
      if (!this.client) {
        // Basic validation if Twilio not configured
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        return phoneRegex.test(phoneNumber);
      }

      // Use Twilio Lookup API for validation
      const result = await this.client.lookups.v1.phoneNumbers(phoneNumber).fetch();
      return result.phoneNumber ? true : false;
    } catch (error) {
      logger.error('Phone validation error:', error);
      return false;
    }
  }

  async getMessageStatus(messageSid) {
    try {
      if (!this.client) {
        throw new Error('SMS service not configured');
      }

      const message = await this.client.messages(messageSid).fetch();
      return {
        sid: message.sid,
        status: message.status,
        direction: message.direction,
        from: message.from,
        to: message.to,
        body: message.body,
        dateCreated: message.dateCreated,
        dateUpdated: message.dateUpdated,
        dateSent: message.dateSent,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        price: message.price,
        priceUnit: message.priceUnit
      };
    } catch (error) {
      logger.error('Get message status error:', error);
      throw error;
    }
  }

  async handleWebhook(payload) {
    try {
      const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = payload;
      
      if (!MessageSid) {
        throw new Error('MessageSid is required');
      }

      // Find SMS by SID
      const { default: SMS } = await import('../models/SMS.js');
      const sms = await SMS.findOne({ 'tracking.sid': MessageSid });
      
      if (!sms) {
        logger.warn(`SMS not found for SID: ${MessageSid}`);
        return;
      }

      // Update status based on Twilio status
      switch (MessageStatus) {
        case 'delivered':
          await sms.markAsDelivered();
          break;
        case 'failed':
          await sms.markAsFailed(ErrorMessage || 'Delivery failed', ErrorCode);
          break;
        case 'undelivered':
          await sms.markAsUndelivered();
          break;
        default:
          logger.info(`SMS status update: ${MessageSid} - ${MessageStatus}`);
      }

      logger.info(`SMS webhook processed: ${MessageSid} - ${MessageStatus}`);
    } catch (error) {
      logger.error('Handle SMS webhook error:', error);
      throw error;
    }
  }

  async getAccountInfo() {
    try {
      if (!this.client) {
        throw new Error('SMS service not configured');
      }

      const account = await this.client.api.accounts('AC1234567890abcdef1234567890abcdef').fetch();
      return {
        sid: account.sid,
        friendlyName: account.friendlyName,
        status: account.status,
        type: account.type,
        dateCreated: account.dateCreated,
        dateUpdated: account.dateUpdated
      };
    } catch (error) {
      logger.error('Get account info error:', error);
      throw error;
    }
  }

  async getUsage(startDate, endDate) {
    try {
      if (!this.client) {
        throw new Error('SMS service not configured');
      }

      const usage = await this.client.usage.records.list({
        startDate,
        endDate,
        category: 'sms'
      });

      return usage.map(record => ({
        category: record.category,
        description: record.description,
        startDate: record.startDate,
        endDate: record.endDate,
        count: record.count,
        countUnit: record.countUnit,
        usage: record.usage,
        usageUnit: record.usageUnit,
        price: record.price,
        priceUnit: record.priceUnit
      }));
    } catch (error) {
      logger.error('Get usage error:', error);
      throw error;
    }
  }

  async sendScheduledSMS() {
    try {
      const { default: SMS } = await import('../models/SMS.js');
      const now = new Date();
      
      // Find SMS messages scheduled for now or earlier
      const scheduledSMS = await SMS.find({
        status: 'pending',
        scheduledAt: { $lte: now }
      }).limit(100); // Process in batches

      const results = [];
      
      for (const sms of scheduledSMS) {
        try {
          const result = await this.sendSMS(sms);
          await sms.markAsSent(result.messageId, result.sid);
          results.push({ sms: sms._id, success: true });
        } catch (error) {
          await sms.markAsFailed(error.message, error.code);
          results.push({ sms: sms._id, success: false, error: error.message });
        }
      }

      logger.info(`Processed ${scheduledSMS.length} scheduled SMS messages`);
      return results;
    } catch (error) {
      logger.error('Send scheduled SMS error:', error);
      throw error;
    }
  }

  async getDeliveryReports(startDate, endDate) {
    try {
      if (!this.client) {
        throw new Error('SMS service not configured');
      }

      const messages = await this.client.messages.list({
        dateSentAfter: startDate,
        dateSentBefore: endDate,
        limit: 1000
      });

      return messages.map(message => ({
        sid: message.sid,
        status: message.status,
        from: message.from,
        to: message.to,
        body: message.body,
        dateCreated: message.dateCreated,
        dateSent: message.dateSent,
        dateUpdated: message.dateUpdated,
        direction: message.direction,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        price: message.price,
        priceUnit: message.priceUnit
      }));
    } catch (error) {
      logger.error('Get delivery reports error:', error);
      throw error;
    }
  }
}

export default new SMSService();
