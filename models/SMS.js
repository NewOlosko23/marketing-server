import mongoose from 'mongoose';

const smsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  to: {
    type: String,
    required: [true, 'Recipient phone number is required'],
    trim: true,
    match: [/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number']
  },
  message: {
    type: String,
    required: [true, 'SMS message is required'],
    trim: true,
    maxlength: [1600, 'SMS message cannot exceed 1600 characters']
  },
  from: {
    type: String,
    required: true,
    default: '+1234567890' // Hardcoded Twilio phone number
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'failed', 'undelivered'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high'],
    default: 'normal'
  },
  scheduledAt: {
    type: Date,
    default: Date.now
  },
  sentAt: {
    type: Date,
    default: null
  },
  deliveredAt: {
    type: Date,
    default: null
  },
  errorMessage: {
    type: String,
    default: null
  },
  errorCode: {
    type: String,
    default: null
  },
  cost: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  tracking: {
    messageId: {
      type: String,
      default: null
    },
    sid: {
      type: String,
      default: null
    }
  },
  metadata: {
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      default: null
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Template',
      default: null
    },
    tags: [{
      type: String,
      trim: true
    }],
    customFields: {
      type: Map,
      of: String
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for SMS age in hours
smsSchema.virtual('ageInHours').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60));
});

// Virtual for delivery time
smsSchema.virtual('deliveryTime').get(function() {
  if (!this.sentAt) return null;
  return Math.floor((this.sentAt - this.createdAt) / 1000); // seconds
});

// Virtual for message length
smsSchema.virtual('messageLength').get(function() {
  return this.message.length;
});

// Virtual for estimated segments (SMS can be split into multiple segments)
smsSchema.virtual('estimatedSegments').get(function() {
  const maxLength = 160; // Standard SMS length
  return Math.ceil(this.message.length / maxLength);
});

// Mark SMS as sent
smsSchema.methods.markAsSent = function(messageId, sid) {
  this.status = 'sent';
  this.sentAt = new Date();
  this.tracking.messageId = messageId;
  this.tracking.sid = sid;
  return this.save();
};

// Mark SMS as delivered
smsSchema.methods.markAsDelivered = function() {
  this.status = 'delivered';
  this.deliveredAt = new Date();
  return this.save();
};

// Mark SMS as failed
smsSchema.methods.markAsFailed = function(error, errorCode) {
  this.status = 'failed';
  this.errorMessage = error;
  this.errorCode = errorCode;
  return this.save();
};

// Mark SMS as undelivered
smsSchema.methods.markAsUndelivered = function() {
  this.status = 'undelivered';
  return this.save();
};

// Get SMS stats
smsSchema.methods.getStats = function() {
  return {
    status: this.status,
    ageInHours: this.ageInHours,
    deliveryTime: this.deliveryTime,
    messageLength: this.messageLength,
    estimatedSegments: this.estimatedSegments,
    cost: this.cost,
    currency: this.currency
  };
};

// Static method to get user's SMS stats
smsSchema.statics.getUserStats = function(userId, startDate, endDate) {
  const match = { userId };
  if (startDate && endDate) {
    match.createdAt = { $gte: startDate, $lte: endDate };
  }
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        sent: { $sum: { $cond: [{ $in: ['$status', ['sent', 'delivered']] }, 1, 0] } },
        delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        undelivered: { $sum: { $cond: [{ $eq: ['$status', 'undelivered'] }, 1, 0] } },
        totalCost: { $sum: '$cost' },
        averageCost: { $avg: '$cost' }
      }
    }
  ]);
};

// Static method to get system-wide SMS stats
smsSchema.statics.getSystemStats = function(startDate, endDate) {
  const match = {};
  if (startDate && endDate) {
    match.createdAt = { $gte: startDate, $lte: endDate };
  }
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        sent: { $sum: { $cond: [{ $in: ['$status', ['sent', 'delivered']] }, 1, 0] } },
        delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        undelivered: { $sum: { $cond: [{ $eq: ['$status', 'undelivered'] }, 1, 0] } },
        totalCost: { $sum: '$cost' },
        averageCost: { $avg: '$cost' }
      }
    }
  ]);
};

// Static method to get daily SMS stats
smsSchema.statics.getDailyStats = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        },
        count: { $sum: 1 },
        sent: { $sum: { $cond: [{ $in: ['$status', ['sent', 'delivered']] }, 1, 0] } },
        delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        totalCost: { $sum: '$cost' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
  ]);
};

// Static method to get cost analysis
smsSchema.statics.getCostAnalysis = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        status: { $in: ['sent', 'delivered'] }
      }
    },
    {
      $group: {
        _id: null,
        totalCost: { $sum: '$cost' },
        averageCost: { $avg: '$cost' },
        minCost: { $min: '$cost' },
        maxCost: { $max: '$cost' },
        totalMessages: { $sum: 1 }
      }
    }
  ]);
};

// Index for performance
smsSchema.index({ userId: 1, createdAt: -1 });
smsSchema.index({ status: 1 });
smsSchema.index({ scheduledAt: 1 });
smsSchema.index({ to: 1 });
smsSchema.index({ 'metadata.campaignId': 1 });

export default mongoose.model('SMS', smsSchema);
