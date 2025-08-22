import { UserProfile } from "./user";

export interface ThanksMessageDetail {
  id: number;
  sender: UserProfile
  recipient: UserProfile
  message: string;
  readAt: string | Date | null
  createdAt: string | Date | null
  updatedAt: string | Date | null
  deletedAt: string | Date | null
}
