import mongoose, { Document, Model, Schema } from 'mongoose';

export interface INotification extends Document {
  user: mongoose.Types.ObjectId;
  type: 'friend_request' | 'meeting_invite' | 'meeting_scheduled';
  message: string;
  data: Record<string, any>;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['friend_request', 'meeting_invite', 'meeting_scheduled'],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    data: {
      type: Object, // Extra data (e.g., meetingId, senderId)
      default: {},
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────
// Every notification query filters by the owning user
notificationSchema.index({ user: 1 });
// Unread-count queries filter by both user and read status
notificationSchema.index({ user: 1, read: 1 });

export const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>('Notification', notificationSchema);
