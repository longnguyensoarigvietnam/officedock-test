export interface ThanksListResultItem {
  icon: string | null;
  iconColor: string;
  id: number;
  name: string;
  type: string;
  users: {
    avatar: string;
    avatarColor: string;
    fullName: string;
    id: number;
  }[];
  uuid: string;
}
export interface ThankListMemberMsgType {
  results: ThanksListResultItem[];
  fullOrganizations: {
    id: number;
    name: string;
  }[];
}
export interface ThankListDetailMsgType {
  id: number;
  sender: {
    id: number;
    fullName: string;
    avatarColor: string | null;
    avatar: string | null;
    organizations: {
      id: number;
      uuid: string;
      name: string;
      icon: string | null;
      iconColor: string;
      type: string;
    } | null;
  };
  recipient: {
    id: number;
    fullName: string;
    avatarColor: string;
    avatar: string;
    organizations: {
      id: number;
      uuid: string;
      name: string;
      icon: string | null;
      iconColor: string;
      type: string;
    } | null;
  };
  message: string;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
