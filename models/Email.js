import mongoose from 'mongoose';

const emailSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  to: {
    type: String,
    required: [true, 'Recipient email is required'],
    lowercase: true,
    trim: true
  },
  subject: {
    type: String,
    required: [true, 'Email subject is required'],
    trim: true,
    maxlength: [200, 'Subject cannot exceed 200 characters']
  },
  content: {
    html: {
      type: String,
      required: [true, 'Email content is required']
    },
    text: {
      type: String,
      default: ''
    }
  },
  from: {
    email: {
      type: String,
      required: true,
      default: 'oloogeorge633@gmail.com' // Hardcoded email
    },
    name: {
      type: String,
      required: true,
      default: 'Marketing Farm' // Hardcoded name
    }
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed'],
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
  openedAt: {
    type: Date,
    default: null
  },
  clickedAt: {
    type: Date,
    default: null
  },
  bounceReason: {
    type: String,
    default: null
  },
  errorMessage: {
    type: String,
    default: null
  },
  tracking: {
    openCount: {
      type: Number,
      default: 0
    },
    clickCount: {
      type: Number,
      default: 0
    },
    lastOpened: {
      type: Date,
      default: null
    },
    lastClicked: {
      type: Date,
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
  },
  attachments: [{
    filename: String,
    contentType: String,
    size: Number,
    url: String
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for email age in hours
emailSchema.virtual('ageInHours').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60));
});

// Virtual for delivery time
emailSchema.virtual('deliveryTime').get(function() {
  if (!this.sentAt) return null;
  return Math.floor((this.sentAt - this.createdAt) / 1000); // seconds
});

// Virtual for open rate
emailSchema.virtual('openRate').get(function() {
  if (this.status !== 'delivered' && this.status !== 'opened') return 0;
  return this.tracking.openCount > 0 ? 100 : 0;
});

// Virtual for click rate
emailSchema.virtual('clickRate').get(function() {
  if (this.status !== 'delivered' && this.status !== 'opened') return 0;
  return this.tracking.clickCount > 0 ? 100 : 0;
});

// Mark email as sent
emailSchema.methods.markAsSent = function() {
  this.status = 'sent';
  this.sentAt = new Date();
  return this.save();
};

// Mark email as delivered
emailSchema.methods.markAsDelivered = function() {
  this.status = 'delivered';
  this.deliveredAt = new Date();
  return this.save();
};

// Mark email as opened
emailSchema.methods.markAsOpened = function() {
  this.status = 'opened';
  this.openedAt = new Date();
  this.tracking.openCount += 1;
  this.tracking.lastOpened = new Date();
  return this.save();
};

// Mark email as clicked
emailSchema.methods.markAsClicked = function() {
  this.status = 'clicked';
  this.clickedAt = new Date();
  this.tracking.clickCount += 1;
  this.tracking.lastClicked = new Date();
  return this.save();
};

// Mark email as bounced
emailSchema.methods.markAsBounced = function(reason) {
  this.status = 'bounced';
  this.bounceReason = reason;
  return this.save();
};

// Mark email as failed
emailSchema.methods.markAsFailed = function(error) {
  this.status = 'failed';
  this.errorMessage = error;
  return this.save();
};

// Get email stats
emailSchema.methods.getStats = function() {
  return {
    status: this.status,
    ageInHours: this.ageInHours,
    deliveryTime: this.deliveryTime,
    openRate: this.openRate,
    clickRate: this.clickRate,
    tracking: this.tracking
  };
};

// Static method to get user's email stats
emailSchema.statics.getUserStats = function(userId, startDate, endDate) {
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
        sent: { $sum: { $cond: [{ $in: ['$status', ['sent', 'delivered', 'opened', 'clicked']] }, 1, 0] } },
        delivered: { $sum: { $cond: [{ $in: ['$status', ['delivered', 'opened', 'clicked']] }, 1, 0] } },
        opened: { $sum: { $cond: [{ $eq: ['$status', 'opened'] }, 1, 0] } },
        clicked: { $sum: { $cond: [{ $eq: ['$status', 'clicked'] }, 1, 0] } },
        bounced: { $sum: { $cond: [{ $eq: ['$status', 'bounced'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        totalOpens: { $sum: '$tracking.openCount' },
        totalClicks: { $sum: '$tracking.clickCount' }
      }
    }
  ]);
};

// Static method to get system-wide email stats
emailSchema.statics.getSystemStats = function(startDate, endDate) {
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
        sent: { $sum: { $cond: [{ $in: ['$status', ['sent', 'delivered', 'opened', 'clicked']] }, 1, 0] } },
        delivered: { $sum: { $cond: [{ $in: ['$status', ['delivered', 'opened', 'clicked']] }, 1, 0] } },
        opened: { $sum: { $cond: [{ $eq: ['$status', 'opened'] }, 1, 0] } },
        clicked: { $sum: { $cond: [{ $eq: ['$status', 'clicked'] }, 1, 0] } },
        bounced: { $sum: { $cond: [{ $eq: ['$status', 'bounced'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        totalOpens: { $sum: '$tracking.openCount' },
        totalClicks: { $sum: '$tracking.clickCount' }
      }
    }
  ]);
};

// Static method to get daily email stats
emailSchema.statics.getDailyStats = function(startDate, endDate) {
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
        sent: { $sum: { $cond: [{ $in: ['$status', ['sent', 'delivered', 'opened', 'clicked']] }, 1, 0] } },
        delivered: { $sum: { $cond: [{ $in: ['$status', ['delivered', 'opened', 'clicked']] }, 1, 0] } },
        opened: { $sum: { $cond: [{ $eq: ['$status', 'opened'] }, 1, 0] } },
        clicked: { $sum: { $cond: [{ $eq: ['$status', 'clicked'] }, 1, 0] } }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
  ]);
};

// Index for performance
emailSchema.index({ userId: 1, createdAt: -1 });
emailSchema.index({ status: 1 });
emailSchema.index({ scheduledAt: 1 });
emailSchema.index({ to: 1 });
emailSchema.index({ 'metadata.campaignId': 1 });

export default mongoose.model('Email', emailSchema);
