import {
  ChatParticipantType,
  MessageType,
  PermissionsSystem,
  SubmitLevelStatus,
} from '@constants/enums';

import { Organizations } from './organization';

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
    participants: ChatParticipant[];
  };
  sender: {
    id: number;
    fullName: string;
    avatar?: string | null;
    avatarColor?: string;
    organizations?: {
      id: number;
      name: string;
    } | null;
  };
  task: {
    id: number;
    deadline: string;
    title: string;
    organization?: {
      icon: string;
      iconColor: string;
      id: number;
      name: string;
      uuid: string;
    };
    tags: {
      id: number;
      name: string;
    }[];
  } | null;
  scheduleChanges?: {
    new?: {
      endDate?: Date | string;
      startDate?: Date | string;
      repeatType?: string | null;
      repeatInterval?: number | null;
      monthDay?: number | null;
      month?: number | null;
      weekDay?: number | null;
    };
    old?: {
      endDate?: Date | string;
      startDate?: Date | string;
      repeatType?: string | null;
      repeatInterval?: number | null;
      monthDay?: number | null;
      month?: number | null;
      weekDay?: number | null;
    };
    participants?: {
      id: number;
      name: string;
      isCreator?: boolean;
    }[];
    fieldChanges?: string[];
    newMember?: {
      id: number;
      fullName: string;
      avatar: null | string;
      avatarColor: string;
    };
    oldMember?: {
      id: number;
      fullName: string;
      avatar: null | string;
      avatarColor: string;
    };
    task?: {
      id: number;
      title: string;
    };
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
  reply?: ChatMessageResponse;
  isEdited: boolean;
  createdAt: Date | string;
  deletedAt: Date | null;
  bookmarkAt: Date | null;
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
  quote: ChatMessageResponse[] | null;
  organization?: {
    icon: string;
    iconColor: string;
    id: number;
    name: string;
    uuid: string;
  };
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
  id: number | string | null;
  avatar?: string | null;
  color?: string;
  fullName: string;
  organizations?: Organizations | null;
  type?: ChatParticipantType;
  userIds?: number[];
  mainOrganization?: string;
  avatarColor?: string;
  avatarUrl?: string | null;
}

export interface ChatRoomDetail {
  id: number;
  name: string;
  code: string;
  participants: ChatParticipant[];
  selectOrganizations: string;
  type: string;
  memo: string;
  unreadMessages: number;
  isMuted: boolean;
  avatarColor?: string;
  avatar?: string | null;
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
  isMuted: boolean;
  chatRoom: {
    avatar: string | null;
    avatarColor: string;
  };
  avatar?: string | null;
  avatarColor?: string;
}

export interface WebSocketMessageData extends DataSkillReward {
  id?: number;
  action: string;
  clientId: string | null;
  chatRoom: ChatRoomItem & {
    avatar: string | null;
    avatarColor: string;
  };
  chatMessage: ChatMessageResponse;
  total?: number;
  isChangeRole?: boolean;
  task: {
    id: number;
    deadline: string;
    title: string;
    organization?: {
      icon: string;
      iconColor: string;
      id: number;
      name: string;
      uuid: string;
    };
    tags: {
      id: number;
      name: string;
    }[];
    status: {
      id: number;
      name: string;
    };
  } | null;
  remindCountdown?: number;
  remindType?: string;
  title?: string;
  user?: {
    id: number;
    permissions?: PermissionsSystem[];
  };
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
  skillMap: number;
  skillMapLevel: number;
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

export interface DataChatFileMemo {
  id: number;
  createdAt: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  originalFile: string;
  chatMessages: {
    id: number;
    uuid: string;
  }[];
  uuid: string;
}
export interface ChatFileDetailResponse {
  createdAt: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  id: number;
  originalFile: string;
  uuid: string;
  files: {
    nextFile: ChatFileDetailResponse | null;
    previousFile: ChatFileDetailResponse | null;
  };
  chatMessages?: {
    chatRoom?: string;
    id: number;
    uuid: string;
  }[];
}
