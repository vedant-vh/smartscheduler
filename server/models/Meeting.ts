import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ITiming {
  start: Date;
  end: Date;
}

export interface IInviteeResponse {
  user: mongoose.Types.ObjectId;
  timings: ITiming[];
}

export interface IMeeting extends Document {
  title: string;
  description?: string;
  host: mongoose.Types.ObjectId;
  invitees: mongoose.Types.ObjectId[];
  duration: number; // in minutes
  meetingDate: string;
  windowStart: string;
  windowEnd: string;
  deadlineToRespond: Date;
  status: 'pending' | 'awaiting_selection' | 'finalized' | 'expired';
  suggestedSlots: {
    start: Date;
    end: Date;
    availableUserIds: mongoose.Types.ObjectId[];
  }[];
  finalizedSlot?: {
    start: Date;
    end: Date;
    confirmedParticipants: mongoose.Types.ObjectId[];
  };
  meetLink?: string;
  inviteeResponses: IInviteeResponse[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IScheduledMeeting extends Document {
  meetingId: mongoose.Types.ObjectId;
  title: string;
  host: mongoose.Types.ObjectId;
  invitees: mongoose.Types.ObjectId[];
  start: Date;
  end: Date;
  meetLink: string;
  createdAt: Date;
}

const timingSchema = new Schema<ITiming>(
  {
    start: { type: Date },
    end: { type: Date },
  },
  { _id: false }
);

const inviteeResponseSchema = new Schema<IInviteeResponse>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    timings: [timingSchema],
  },
  { _id: false }
);

const meetingSchema = new Schema<IMeeting>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    host: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    invitees: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    duration: {
      type: Number, // Duration in minutes
      required: true,
    },
    meetingDate: {
      type: String,
      required: true,
    },
    windowStart: {
      type: String,
      required: true,
    },
    windowEnd: {
      type: String,
      required: true,
    },
    deadlineToRespond: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'awaiting_selection', 'finalized', 'expired'],
      default: 'pending',
    },
    suggestedSlots: [
      {
        start: { type: Date },
        end: { type: Date },
        availableUserIds: [
          {
            type: Schema.Types.ObjectId,
            ref: 'User',
          },
        ],
      },
    ],
    finalizedSlot: {
      start: { type: Date },
      end: { type: Date },
      confirmedParticipants: [
        {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
    },
    meetLink: {
      type: String,
      default: null,
    },
    inviteeResponses: [inviteeResponseSchema],
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

meetingSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// ─── Indexes ─────────────────────────────────────────────────────────────────
// Dashboard query: "find all meetings where I am host or invitee"
meetingSchema.index({ host: 1 });
meetingSchema.index({ invitees: 1 });
// Notification badge query: "count my unanswered invites with pending/awaiting status"
meetingSchema.index({ invitees: 1, status: 1 });
// General status filters
meetingSchema.index({ status: 1 });
// Sorting / expiry cron: find meetings past their deadline
meetingSchema.index({ deadlineToRespond: 1 });

const scheduledMeetingSchema = new Schema<IScheduledMeeting>({
  meetingId: { type: Schema.Types.ObjectId, ref: 'Meeting', required: true },
  title: { type: String, required: true },
  host: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  invitees: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  start: { type: Date, required: true },
  end: { type: Date, required: true },
  meetLink: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// ─── Indexes ─────────────────────────────────────────────────────────────────
scheduledMeetingSchema.index({ host: 1 });
scheduledMeetingSchema.index({ meetingId: 1 }, { unique: true });

export const Meeting: Model<IMeeting> =
  mongoose.models.Meeting || mongoose.model<IMeeting>('Meeting', meetingSchema);

export const ScheduledMeeting: Model<IScheduledMeeting> =
  mongoose.models.ScheduledMeeting ||
  mongoose.model<IScheduledMeeting>('ScheduledMeeting', scheduledMeetingSchema);
