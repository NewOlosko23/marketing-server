import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    maxlength: 255
  },
  phone: {
    type: String,
    trim: true,
    maxlength: 20
  },
  company: {
    type: String,
    trim: true,
    maxlength: 100
  },
  position: {
    type: String,
    trim: true,
    maxlength: 100
  },
  location: {
    type: String,
    trim: true,
    maxlength: 100
  },
  website: {
    type: String,
    trim: true,
    maxlength: 255
  },
  tags: [{
    type: String,
    trim: true
  }],
  customFields: {
    type: Map,
    of: String,
    default: {}
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'unsubscribed', 'bounced'],
    default: 'active'
  },
  source: {
    type: String,
    enum: ['import', 'manual', 'signup', 'api'],
    default: 'manual'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastContacted: {
    type: Date,
    default: null
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  phoneVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
contactSchema.index({ userId: 1, email: 1 }, { unique: true });
contactSchema.index({ userId: 1, status: 1 });
contactSchema.index({ userId: 1, tags: 1 });
contactSchema.index({ userId: 1, company: 1 });
contactSchema.index({ email: 1 });

// Methods
contactSchema.methods.addTag = function(tag) {
  if (!this.tags.includes(tag)) {
    this.tags.push(tag);
  }
  return this.save();
};

contactSchema.methods.removeTag = function(tag) {
  this.tags = this.tags.filter(t => t !== tag);
  return this.save();
};

contactSchema.methods.updateCustomField = function(key, value) {
  this.customFields.set(key, value);
  return this.save();
};

contactSchema.methods.markAsContacted = function() {
  this.lastContacted = new Date();
  return this.save();
};

// Static methods
contactSchema.statics.getUserContacts = function(userId, filters = {}) {
  const query = { userId, status: 'active' };
  
  if (filters.tags && filters.tags.length > 0) {
    query.tags = { $in: filters.tags };
  }
  
  if (filters.company) {
    query.company = new RegExp(filters.company, 'i');
  }
  
  if (filters.location) {
    query.location = new RegExp(filters.location, 'i');
  }
  
  return this.find(query).sort({ createdAt: -1 });
};

contactSchema.statics.getContactsByGroup = function(userId, groupId) {
  // This would need to be implemented based on your ContactGroup model
  // For now, return all active contacts
  return this.find({ userId, status: 'active' }).sort({ createdAt: -1 });
};

contactSchema.statics.searchContacts = function(userId, searchTerm) {
  const regex = new RegExp(searchTerm, 'i');
  return this.find({
    userId,
    status: 'active',
    $or: [
      { name: regex },
      { email: regex },
      { company: regex },
      { tags: { $in: [regex] } }
    ]
  }).sort({ createdAt: -1 });
};

export default mongoose.model('Contact', contactSchema);
