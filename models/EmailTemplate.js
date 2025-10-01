import mongoose from 'mongoose';

const emailTemplateSchema = new mongoose.Schema({
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
  category: {
    type: String,
    enum: ['welcome', 'newsletter', 'promotion', 'transactional', 'custom'],
    default: 'custom'
  },
  tags: [{
    type: String,
    trim: true
  }],
  variables: [{
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    defaultValue: {
      type: String,
      default: ''
    }
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  usageCount: {
    type: Number,
    default: 0
  },
  lastUsed: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes
emailTemplateSchema.index({ userId: 1, category: 1 });
emailTemplateSchema.index({ isPublic: 1 });
emailTemplateSchema.index({ tags: 1 });

// Methods
emailTemplateSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  this.lastUsed = new Date();
  return this.save();
};

emailTemplateSchema.methods.render = function(variables = {}) {
  let html = this.content.html;
  let text = this.content.text;
  let subject = this.subject;

  // Replace variables in content
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    html = html.replace(regex, variables[key] || '');
    text = text.replace(regex, variables[key] || '');
    subject = subject.replace(regex, variables[key] || '');
  });

  return {
    subject,
    content: {
      html,
      text
    }
  };
};

// Static methods
emailTemplateSchema.statics.getUserTemplates = function(userId, category = null) {
  const query = { $or: [{ userId }, { isPublic: true }] };
  if (category) {
    query.category = category;
  }
  return this.find(query).sort({ lastUsed: -1, createdAt: -1 });
};

emailTemplateSchema.statics.getPublicTemplates = function(category = null) {
  const query = { isPublic: true };
  if (category) {
    query.category = category;
  }
  return this.find(query).sort({ usageCount: -1 });
};

export default mongoose.model('EmailTemplate', emailTemplateSchema);
