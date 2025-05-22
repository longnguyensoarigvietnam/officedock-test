import { MessageType, SubmitLevelStatus } from '@constants/enums';

export interface ChatMessageResponse {
  id?: number;
  uuid: string;
  message: string;
  isBookmark?: boolean;
  chatRoom?: {
    id: number;
    name: string;
    code: string;
    type: string;
    participants: ChatParticipant;
  };
  sender: {
    id: number;
    fullName: string;
    organizations?: {
      id: number;
      name: string;
    } | null;
  };
  task: {
    id: number;
    deadline: string;
    title: string;
    tags: {
      id: number;
      name: string;
    }[];
  } | null;
  scheduleChanges?: {
    new?: {
      endDate?: Date | string;
      startDate?: Date | string;
    };
    old?: {
      endDate?: Date | string;
      startDate?: Date | string;
    };
    participants?: {
      id: number;
      name: string;
      isCreator?: boolean;
    }[];
    fieldChanges?: string[];
  };
  submitLevel?: {
    comment: string | null;
    id: number;
    organization: number;
    skill: {
      id: number;
      name: string;
    };
    staff: number;
    status: SubmitLevelStatus;
  };
  schedule?: {
    id: number;
    title: string;
    isAllDay: boolean;
  };
  chatFiles: ChatFileResponse[];
  isEdited: boolean;
  createdAt: Date | string;
  deletedAt: Date | null;
  type: MessageType;
  mentions?: number[];
  reactions?: {
    icon: string;
    users: number[];
  }[];
  tasks?: {
    id: number;
    title: string;
  }[];
}

export interface TaskUserListChat {
  id: number;
  title: string;
}
export interface ChatFileResponse {
  compressedFile?: string;
  createdAt?: Date | string;
  id?: number;
  fileType: string;
  fileSize: number;
  fileName: string;
  uuid: string;
}

export interface ChatDashboardMember {
  fullName: string;
  id: number | string;
  avatarColor: string;
  avatarUrl: string;
}

export interface OrganizationDetail {
  id: number;
  name: string;
  superior: {
    id: number;
    name: string;
  } | null;
}

export interface ChatParticipant {
  id: number | null;
  fullName: string;
  organizations?: {
    id: number;
    name: string;
  } | null;
}

export interface ChatRoomDetail {
  id: number;
  name: string;
  code: string;
  participants: ChatParticipant[];
  type: string;
  unreadMessages: number;
}

export interface ChatRoomItem {
  code: string;
  name: string;
  type: string;
  unreadMessages: number;
  hiddenAt: string | null;
  pinAt: string | null;
  lastMessageAt: string | null;
  participants: ChatParticipant[];
  isExisted?: boolean;
}

export interface WebSocketMessageData extends DataSkillReward {
  id?: number;
  action: string;
  clientId: string | null;
  chatRoom: ChatRoomItem;
  chatMessage: ChatMessageResponse;
  total?: number;
  isChangeRole?: boolean;
  task?: {
    id: number;
    status: {
      id: number;
      name: string;
    };
  };
  remindCountdown?: number;
  remindType?: string;
  title?: string;
}
interface DataSkillReward {
  skill: {
    id: number;
    name: string;
  };
  measureCount: number | null;
  measureTime: string | null;
  lookBackInterval: string | null;
  lookBackType: string | null;
  skill_map: number;
  skill_map_level: number;
}
export interface WebSocketMessageDataOverTime {
  action: string;
  isOverEstimate: boolean;
  taskDurationRunningUuid: string;
  type: string;
  id: number;
}

export interface WebSocketMessageSortKanban {
  action: string;
  isSortingTaskByDeadline: boolean;
  isSortingTaskByImportant: boolean;
}

export interface DataChatRoomSocket {
  code: string;
  lastMessageAt: string | null;
}
