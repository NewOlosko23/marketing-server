import mongoose from 'mongoose';

const quotaSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  plan: {
    type: String,
    enum: ['free', 'starter', 'professional'],
    required: true
  },
  email: {
    used: {
      type: Number,
      default: 0
    },
    limit: {
      type: Number,
      required: true
    },
    resetDate: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    }
  },
  sms: {
    used: {
      type: Number,
      default: 0
    },
    limit: {
      type: Number,
      required: true
    },
    resetDate: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    }
  },
  api: {
    used: {
      type: Number,
      default: 0
    },
    limit: {
      type: Number,
      required: true
    },
    resetDate: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    }
  },
  status: {
    type: String,
    enum: ['normal', 'warning', 'critical', 'exceeded'],
    default: 'normal'
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for email usage percentage
quotaSchema.virtual('emailUsagePercentage').get(function() {
  return this.email.limit > 0 ? (this.email.used / this.email.limit) * 100 : 0;
});

// Virtual for SMS usage percentage
quotaSchema.virtual('smsUsagePercentage').get(function() {
  return this.sms.limit > 0 ? (this.sms.used / this.sms.limit) * 100 : 0;
});

// Virtual for API usage percentage
quotaSchema.virtual('apiUsagePercentage').get(function() {
  return this.api.limit > 0 ? (this.api.used / this.api.limit) * 100 : 0;
});

// Virtual for overall status
quotaSchema.virtual('overallStatus').get(function() {
  const emailStatus = this.getQuotaStatus('email');
  const smsStatus = this.getQuotaStatus('sms');
  const apiStatus = this.getQuotaStatus('api');
  
  if (emailStatus === 'exceeded' || smsStatus === 'exceeded' || apiStatus === 'exceeded') {
    return 'exceeded';
  }
  if (emailStatus === 'critical' || smsStatus === 'critical' || apiStatus === 'critical') {
    return 'critical';
  }
  if (emailStatus === 'warning' || smsStatus === 'warning' || apiStatus === 'warning') {
    return 'warning';
  }
  return 'normal';
});

// Get quota status for a specific type
quotaSchema.methods.getQuotaStatus = function(type) {
  const quota = this[type];
  const percentage = quota.limit > 0 ? (quota.used / quota.limit) * 100 : 0;
  
  if (percentage >= 100) return 'exceeded';
  if (percentage >= 90) return 'critical';
  if (percentage >= 75) return 'warning';
  return 'normal';
};

// Check if quota is available for a specific type
quotaSchema.methods.hasQuotaAvailable = function(type, amount = 1) {
  const quota = this[type];
  return (quota.used + amount) <= quota.limit;
};

// Consume quota for a specific type
quotaSchema.methods.consumeQuota = async function(type, amount = 1) {
  if (!this.hasQuotaAvailable(type, amount)) {
    throw new Error(`Insufficient ${type} quota`);
  }
  
  this[type].used += amount;
  this.lastUpdated = new Date();
  
  // Update status based on usage
  this.status = this.overallStatus;
  
  return this.save();
};

// Reset quota for a specific type
quotaSchema.methods.resetQuota = function(type) {
  this[type].used = 0;
  this[type].resetDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  this.lastUpdated = new Date();
  this.status = 'normal';
  return this.save();
};

// Reset all quotas
quotaSchema.methods.resetAllQuotas = function() {
  this.email.used = 0;
  this.email.resetDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  this.sms.used = 0;
  this.sms.resetDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  this.api.used = 0;
  this.api.resetDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  this.status = 'normal';
  this.lastUpdated = new Date();
  return this.save();
};

// Update plan and reset quotas
quotaSchema.methods.updatePlan = function(newPlan, newLimits) {
  this.plan = newPlan;
  this.email.limit = newLimits.email;
  this.sms.limit = newLimits.sms;
  this.api.limit = newLimits.api;
  this.resetAllQuotas();
  return this.save();
};

// Get quota summary
quotaSchema.methods.getSummary = function() {
  return {
    plan: this.plan,
    email: {
      used: this.email.used,
      limit: this.email.limit,
      percentage: this.emailUsagePercentage,
      status: this.getQuotaStatus('email'),
      resetDate: this.email.resetDate
    },
    sms: {
      used: this.sms.used,
      limit: this.sms.limit,
      percentage: this.smsUsagePercentage,
      status: this.getQuotaStatus('sms'),
      resetDate: this.sms.resetDate
    },
    api: {
      used: this.api.used,
      limit: this.api.limit,
      percentage: this.apiUsagePercentage,
      status: this.getQuotaStatus('api'),
      resetDate: this.api.resetDate
    },
    overallStatus: this.overallStatus,
    lastUpdated: this.lastUpdated
  };
};

// Static method to create quota for new user
quotaSchema.statics.createForUser = function(userId, plan = 'free') {
  const planLimits = {
    free: { email: 2000, sms: 0, api: 10000 },
    starter: { email: 5000, sms: 1000, api: 50000 },
    professional: { email: 25000, sms: 5000, api: 200000 }
  };
  
  const limits = planLimits[plan];
  
  return this.create({
    userId,
    plan,
    email: { limit: limits.email },
    sms: { limit: limits.sms },
    api: { limit: limits.api }
  });
};

// Static method to get system-wide quota stats
quotaSchema.statics.getSystemStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        totalEmailUsed: { $sum: '$email.used' },
        totalEmailLimit: { $sum: '$email.limit' },
        totalSmsUsed: { $sum: '$sms.used' },
        totalSmsLimit: { $sum: '$sms.limit' },
        totalApiUsed: { $sum: '$api.used' },
        totalApiLimit: { $sum: '$api.limit' }
      }
    }
  ]);
};

// Static method to get quota alerts
quotaSchema.statics.getQuotaAlerts = function() {
  return this.find({
    $or: [
      { 'email.used': { $gte: { $multiply: ['$email.limit', 0.9] } } },
      { 'sms.used': { $gte: { $multiply: ['$sms.limit', 0.9] } } },
      { 'api.used': { $gte: { $multiply: ['$api.limit', 0.9] } } }
    ]
  }).populate('userId', 'name email');
};

// Index for performance
quotaSchema.index({ userId: 1 });
quotaSchema.index({ plan: 1 });
quotaSchema.index({ status: 1 });
quotaSchema.index({ lastUpdated: -1 });

export default mongoose.model('Quota', quotaSchema);
