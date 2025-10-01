import mongoose from 'mongoose';

const contactGroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  contacts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact'
  }],
  filters: {
    tags: [{
      type: String,
      trim: true
    }],
    company: {
      type: String,
      trim: true
    },
    location: {
      type: String,
      trim: true
    },
    customFields: {
      type: Map,
      of: String
    }
  },
  isDynamic: {
    type: Boolean,
    default: false
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  contactCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes
contactGroupSchema.index({ userId: 1 });
contactGroupSchema.index({ name: 1, userId: 1 }, { unique: true });

// Virtual for contact count
contactGroupSchema.virtual('totalContacts').get(function() {
  return this.contacts.length;
});

// Methods
contactGroupSchema.methods.addContact = function(contactId) {
  if (!this.contacts.includes(contactId)) {
    this.contacts.push(contactId);
    this.contactCount = this.contacts.length;
  }
  return this.save();
};

contactGroupSchema.methods.removeContact = function(contactId) {
  this.contacts = this.contacts.filter(id => !id.equals(contactId));
  this.contactCount = this.contacts.length;
  return this.save();
};

contactGroupSchema.methods.addContacts = function(contactIds) {
  const newContacts = contactIds.filter(id => !this.contacts.includes(id));
  this.contacts.push(...newContacts);
  this.contactCount = this.contacts.length;
  return this.save();
};

contactGroupSchema.methods.updateFilters = function(filters) {
  this.filters = { ...this.filters, ...filters };
  return this.save();
};

// Static methods
contactGroupSchema.statics.getUserGroups = function(userId) {
  return this.find({ userId }).populate('contacts', 'name email phone company').sort({ createdAt: -1 });
};

contactGroupSchema.statics.createFromFilters = async function(userId, name, description, filters) {
  // This would need to be implemented based on your Contact model
  // For now, we'll create an empty group
  const group = new this({
    name,
    description,
    filters,
    userId,
    isDynamic: true
  });
  
  return group.save();
};

export default mongoose.model('ContactGroup', contactGroupSchema);
