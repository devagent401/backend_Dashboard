import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  recipientId: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: 'order' | 'reject' | 'comment' | 'system' | 'stock' | 'other';
  priority: 'low' | 'medium' | 'high';
  isRead: boolean;
  readAt?: Date;
  data?: Record<string, any>;
  relatedEntity?: {
    entityType: 'order' | 'product' | 'user' | 'other';
    entityId: mongoose.Types.ObjectId;
  };
  actionUrl?: string;
}

const notificationSchema = new Schema<INotification>(
  {
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['order', 'reject', 'comment', 'system', 'stock', 'other'],
      required: true,
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: Date,
    data: {
      type: Schema.Types.Mixed,
      default: {},
    },
    relatedEntity: {
      entityType: {
        type: String,
        enum: ['order', 'product', 'user', 'other'],
      },
      entityId: Schema.Types.ObjectId,
    },
    actionUrl: String,
  },
  {
    timestamps: true,
  }
);

// Compound indexes
notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, type: 1 });

// Auto-delete notifications older than 30 days if read
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export default mongoose.model<INotification>('Notification', notificationSchema);

