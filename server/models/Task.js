const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    maxlength: [100, 'Task title cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Task description cannot exceed 500 characters']
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  dueDate: {
    type: Date,
    validate: {
      validator: function(v) {
        return !v || v > new Date();
      },
      message: 'Due date must be in the future'
    }
  },
  completedAt: {
    type: Date
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 20
  }],
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isPublic: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for task status
taskSchema.virtual('isOverdue').get(function() {
  if (!this.dueDate || this.status === 'completed') return false;
  return new Date() > this.dueDate;
});

// Virtual for task age
taskSchema.virtual('age').get(function() {
  return Math.floor((new Date() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Indexes for better query performance
taskSchema.index({ status: 1, priority: 1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ tags: 1 });

// Pre-save middleware to set completedAt
taskSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  } else if (this.isModified('status') && this.status !== 'completed') {
    this.completedAt = undefined;
  }
  next();
});

// Static method to get tasks by user
taskSchema.statics.findByUser = function(userId, options = {}) {
  const query = {
    $or: [
      { createdBy: userId },
      { assignedTo: userId },
      { isPublic: true }
    ]
  };
  
  if (options.status) query.status = options.status;
  if (options.priority) query.priority = options.priority;
  
  return this.find(query)
    .populate('assignedTo', 'username email')
    .populate('createdBy', 'username email')
    .sort({ createdAt: -1 });
};

// Instance method to mark as complete
taskSchema.methods.markComplete = function() {
  this.status = 'completed';
  this.completedAt = new Date();
  return this.save();
};

// Instance method to assign to user
taskSchema.methods.assignTo = function(userId) {
  this.assignedTo = userId;
  return this.save();
};

module.exports = mongoose.model('Task', taskSchema); 