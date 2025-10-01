import mongoose from 'mongoose';

const campaignSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    html: {
      type: String,
      required: true
    },
    text: {
      type: String,
      required: true
    }
  },
  template: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmailTemplate',
    default: null
  },
  recipients: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact'
  }],
  contactGroups: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ContactGroup'
  }],
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled'],
    default: 'draft'
  },
  scheduledAt: {
    type: Date,
    default: null
  },
  sentAt: {
    type: Date,
    default: null
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  stats: {
    totalRecipients: {
      type: Number,
      default: 0
    },
    sent: {
      type: Number,
      default: 0
    },
    delivered: {
      type: Number,
      default: 0
    },
    opened: {
      type: Number,
      default: 0
    },
    clicked: {
      type: Number,
      default: 0
    },
    bounced: {
      type: Number,
      default: 0
    },
    failed: {
      type: Number,
      default: 0
    }
  },
  metadata: {
    type: Map,
    of: String,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes
campaignSchema.index({ userId: 1, status: 1 });
campaignSchema.index({ scheduledAt: 1 });
campaignSchema.index({ createdAt: -1 });

// Virtual for open rate
campaignSchema.virtual('openRate').get(function() {
  if (this.stats.delivered === 0) return 0;
  return Math.round((this.stats.opened / this.stats.delivered) * 100) / 100;
});

// Virtual for click rate
campaignSchema.virtual('clickRate').get(function() {
  if (this.stats.delivered === 0) return 0;
  return Math.round((this.stats.clicked / this.stats.delivered) * 100) / 100;
});

// Virtual for delivery rate
campaignSchema.virtual('deliveryRate').get(function() {
  if (this.stats.sent === 0) return 0;
  return Math.round((this.stats.delivered / this.stats.sent) * 100) / 100;
});

// Methods
campaignSchema.methods.updateStats = function(statType, increment = 1) {
  if (this.stats[statType] !== undefined) {
    this.stats[statType] += increment;
  }
  return this.save();
};

campaignSchema.methods.markAsSent = function() {
  this.status = 'sent';
  this.sentAt = new Date();
  return this.save();
};

campaignSchema.methods.schedule = function(scheduledAt) {
  this.status = 'scheduled';
  this.scheduledAt = scheduledAt;
  return this.save();
};

// Static methods
campaignSchema.statics.getUserCampaigns = function(userId, status = null) {
  const query = { userId };
  if (status) {
    query.status = status;
  }
  return this.find(query).populate('template').sort({ createdAt: -1 });
};

campaignSchema.statics.getCampaignStats = function(userId, startDate, endDate) {
  const match = { userId };
  if (startDate && endDate) {
    match.createdAt = { $gte: startDate, $lte: endDate };
  }
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalCampaigns: { $sum: 1 },
        totalSent: { $sum: '$stats.sent' },
        totalDelivered: { $sum: '$stats.delivered' },
        totalOpened: { $sum: '$stats.opened' },
        totalClicked: { $sum: '$stats.clicked' },
        totalBounced: { $sum: '$stats.bounced' },
        totalFailed: { $sum: '$stats.failed' }
      }
    }
  ]);
};

export default mongoose.model('Campaign', campaignSchema);
