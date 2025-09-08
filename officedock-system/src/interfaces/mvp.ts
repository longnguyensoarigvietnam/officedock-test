import { VotingCandidateRanking, VotingManagementType } from '@constants/enums';

import { UserProfile } from './user';
import { Organizations } from './organization';

export interface Candidate {
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
  ranking?: VotingCandidateRanking;
}

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
  candidates: Candidate[];
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
  candidates: Candidate[];
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

export interface MVPOrganization {
  id: number;
  name: string;
  uuid: string;
  icon: string | null;
  iconColor: string;
  type: string;
  candidates: {
    id: number;
    fullName: string;
    avatar: string | null;
    avatarColor: string;
    isVoted: boolean;
    mvpCandidateId: number | null;
  }[];
}

export interface CurrentMVPVotingDetail {
  id: number;
  title: string;
  selectedOrganizations: string;
  bonusPoint: number;
  startDate: string | Date | null;
  endDate: string | Date | null;
  createdBy: {
    id: number;
    fullName: string;
    avatar: string | null;
    avatarColor: string;
  };
  updatedBy: {
    id: number;
    fullName: string;
    avatar: string | null;
    avatarColor: string;
  };
  type: VotingManagementType;
  createdAt: string | Date | null;
  isAllUsers: boolean;
  isVoted: boolean;
  organizations: MVPOrganization[];
}

export interface MVPAnnouncementDetail {
  id: number;
  title: string;
  selectedOrganizations: string;
  bonusPoint: number;
  startDate: string | Date | null;
  endDate: string | Date | null;
  createdBy: {
    id: number;
    fullName: string;
    avatar: string | null;
    avatarColor: string;
  };
  updatedBy: {
    id: number;
    fullName: string;
    avatar: string | null;
    avatarColor: string;
  };
  type: VotingManagementType;
  createdAt: string | Date | null;
  isAllUsers: boolean;
  organizations: MVPOrganization[];
  topCandidates?: {
    id: number;
    fullName: string;
    avatar: string | null;
    avatarColor: string;
    organizations: Organizations;
  }[];
}

export interface MVPVotingComment {
  id?: number;
  mvpVoteManagement: number | null;
  mvpCandidate: number | null;
  comment: string;
  userInfo?: {
    id: number;
    fullName: string;
    avatar: string | null;
    avatarColor: string;
    organizationName: string | null;
  };
}
