import { UserProfile } from './user';

export interface VotingListItem {
  id: number;
  title: string;
  selectedOrganizations: string;
  bonusPoint: number;
  startDate: string | Date | null;
  endDate: string | Date | null;
  createdBy: UserProfile | string | null;
  updatedBy: UserProfile | string | null;
  isStart: boolean;
  isAllUsers: boolean;
  totalVoters?: number;
  candidates: {
    id: number;
    fullName: string;
    avatar: string | null;
    avatarColor: string;
    mainOrganization: {
      id: number;
      name: string;
      uuid: string;
    };
    voteCount: number | null;
    mvpCandidateId: number | null;
  }[];
  organizations: {
    id: number;
    name: string;
    uuid: string;
    icon: string | null;
    iconColor: string;
    type: string;
  }[];
  createdAt: string | Date | null;
}

export interface VotingDetail {
  id: number;
  title: string;
  selectedOrganizations: string;
  bonusPoint: number;
  startDate: string | Date | null;
  endDate: string | Date | null;
  createdBy: string;
  updatedBy: string;
  isStart: boolean;
  isAllUsers: boolean;
  candidates: {
    id: number;
    fullName: string;
    avatar: string | null;
    avatarColor: string;
    mainOrganization: {
      id: number;
      name: string;
      uuid: string;
    };
    voteCount: number | null;
    mvpCandidateId: number | null;
  }[];
  organizations: {
    id: number;
    name: string;
    uuid: string;
    icon: string | null;
    iconColor: string;
    type: string;
  }[];
  totalVoters?: number;
  createdAt: string | Date | null;
}

export interface VotingFormData {
  id?: number | string;
  title: string;
  selectedOrganizations: number[];
  candidateIds: number[];
  bonusPoint: number | string;
  endDate: string | Date | null;
  endTime: string | null;
  isStart: boolean;
}

export interface VotingRequest {
  title: string;
  selectedOrganizations: string;
  candidateIds: number[];
  bonusPoint: number | string;
  endDate: string | Date | null;
  isStart: boolean;
}
