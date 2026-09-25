import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  friends: mongoose.Types.ObjectId[];
  sentRequests: mongoose.Types.ObjectId[];
  receivedRequests: mongoose.Types.ObjectId[];
  confirmPassword?: string;
  resetPasswordToken?: string;
  resetPasswordExpiry?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpiry: {
      type: Date,
      default: null,
    },
    friends: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    sentRequests: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    receivedRequests: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  { timestamps: true }
);

// Virtual field for confirmPassword (not stored in DB)
userSchema.virtual('confirmPassword');

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', userSchema);
