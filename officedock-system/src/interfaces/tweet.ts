export interface TweetFormData {
  content: string;
}

export interface TweetDetail {
  id: number;
  user: {
    id: number;
    fullName: string;
    avatarColor: string;
    avatar: string | null;
  };
  content: string;
  isSystem: boolean;
  createdAt?: Date | string;
}

export interface WebSocketTweetMessage {
  action: string;
  tweet: TweetDetail
}
