import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const apiKeySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'API key name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  key: {
    type: String,
    required: true,
    unique: true,
    default: () => `sk_${uuidv4().replace(/-/g, '')}`
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  permissions: [{
    type: String,
    enum: ['read', 'write', 'admin'],
    required: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastUsed: {
    type: Date,
    default: null
  },
  usage: {
    requests: {
      type: Number,
      default: 0
    },
    limit: {
      type: Number,
      default: 100000
    },
    resetDate: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    }
  },
  rateLimit: {
    requests: {
      type: Number,
      default: 1000
    },
    window: {
      type: Number,
      default: 3600 // 1 hour in seconds
    }
  },
  ipWhitelist: [{
    type: String,
    trim: true
  }],
  expiresAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for usage percentage
apiKeySchema.virtual('usagePercentage').get(function() {
  return this.usage.limit > 0 ? (this.usage.requests / this.usage.limit) * 100 : 0;
});

// Virtual for remaining requests
apiKeySchema.virtual('remainingRequests').get(function() {
  return Math.max(0, this.usage.limit - this.usage.requests);
});

// Virtual for days until reset
apiKeySchema.virtual('daysUntilReset').get(function() {
  const now = new Date();
  const resetDate = new Date(this.usage.resetDate);
  const diffTime = resetDate - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Check if API key is expired
apiKeySchema.methods.isExpired = function() {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

// Check if API key has exceeded usage limit
apiKeySchema.methods.hasExceededLimit = function() {
  return this.usage.requests >= this.usage.limit;
};

// Check if API key is valid for use
apiKeySchema.methods.isValid = function() {
  return this.isActive && !this.isExpired() && !this.hasExceededLimit();
};

// Increment usage counter
apiKeySchema.methods.incrementUsage = function() {
  this.usage.requests += 1;
  this.lastUsed = new Date();
  return this.save();
};

// Reset usage counter
apiKeySchema.methods.resetUsage = function() {
  this.usage.requests = 0;
  this.usage.resetDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  return this.save();
};

// Check IP whitelist
apiKeySchema.methods.isIpAllowed = function(ip) {
  if (!this.ipWhitelist || this.ipWhitelist.length === 0) return true;
  return this.ipWhitelist.includes(ip);
};

// Get masked key for display
apiKeySchema.methods.getMaskedKey = function() {
  if (this.key.length <= 8) return this.key;
  return this.key.substring(0, 8) + '•'.repeat(this.key.length - 12) + this.key.substring(this.key.length - 4);
};

// Static method to find by key
apiKeySchema.statics.findByKey = function(key) {
  return this.findOne({ key, isActive: true });
};

// Static method to get user's API keys
apiKeySchema.statics.getUserKeys = function(userId) {
  return this.find({ userId }).sort({ createdAt: -1 });
};

// Static method to get usage stats
apiKeySchema.statics.getUsageStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalKeys: { $sum: 1 },
        activeKeys: { $sum: { $cond: ['$isActive', 1, 0] } },
        totalRequests: { $sum: '$usage.requests' },
        averageUsage: { $avg: '$usage.requests' }
      }
    }
  ]);
};

// Index for performance
apiKeySchema.index({ key: 1 });
apiKeySchema.index({ userId: 1 });
apiKeySchema.index({ isActive: 1 });
apiKeySchema.index({ lastUsed: -1 });

export default mongoose.model('ApiKey', apiKeySchema);
