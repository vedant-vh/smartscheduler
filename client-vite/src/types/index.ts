export interface IUser {
  _id: string;
  name: string;
  email: string;
  friends?: string[];
  sentRequests?: string[];
  receivedRequests?: string[];
}

export interface ITiming {
  start: Date | string;
  end: Date | string;
}

export interface IInviteeResponse {
  user: IUser | string;
  timings: ITiming[];
}

export interface IMeeting {
  _id: string;
  title: string;
  description?: string;
  host: IUser | string;
  invitees: (IUser | string)[];
  duration: number;
  meetingDate: string;
  windowStart: string;
  windowEnd: string;
  deadlineToRespond: string;
  status: 'pending' | 'awaiting_selection' | 'finalized' | 'expired';
  suggestedSlots?: {
    start: Date | string;
    end: Date | string;
    availableUserIds: string[];
  }[];
  finalizedSlot?: {
    start: Date | string;
    end: Date | string;
    confirmedParticipants: (IUser | string)[];
  };
  meetLink?: string;
  inviteeResponses: IInviteeResponse[];
  submittedCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface IScheduledMeeting {
  _id: string;
  meetingId: string;
  title: string;
  host: string;
  invitees: string[];
  start: string;
  end: string;
  meetLink: string;
}

export interface INotification {
  _id: string;
  user: string;
  type: 'friend_request' | 'meeting_invite' | 'meeting_scheduled';
  message: string;
  data: Record<string, any>;
  read: boolean;
  createdAt: string;
}
