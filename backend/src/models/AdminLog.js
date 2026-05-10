const mongoose = require('mongoose');

const adminLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    actorRole: {
      type: String,
      enum: ['admin_master', 'admin_secondary'],
      required: true,
    },
    action: {
      type: String,
      required: true,
      // e.g. user.block, user.unblock, user.remove, admin.create,
      //      admin.block, admin.remove, admin.update
      index: true,
    },
    targetType: {
      type: String,
      enum: ['user', 'admin', 'ride', 'system'],
      default: 'user',
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

adminLogSchema.index({ actorId: 1, createdAt: -1 });

module.exports = mongoose.model('AdminLog', adminLogSchema);
