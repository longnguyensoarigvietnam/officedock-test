import { Tags } from './tag';
import { Organizations } from './organization';
import { OptionDropdownType } from './common';
import { EventCalendarType, EventParticipantType } from '@constants/enums';

export interface EventCalendarDetail {
  id?: string;
  taskId?: string;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  type?: EventCalendarType;
  isMyEvent?: boolean;
  participants?: EventParticipant[];
  resourceIds?: string[];
  address?: string;
  largeColor?: string;
  isStart?: boolean;
  planStartDate?: string;
  planEndDate?: string;
}

export interface EventCalendarDayRange {
  start: string | Date;
  end: string | Date;
}

export interface EventFormData {
  title?: string;
  startDate?: Date | null;
  startTime?: string | null;
  endDate?: Date | null;
  endTime?: string | null;
  isAllDay?: boolean;
  tagIds?: OptionDropdownType[];
  participantIds?: number[];
  selectOrganizations?: number[];
  address?: string;
  memo?: string;
  type?: OptionDropdownType;
  largeCategory?: OptionDropdownType;
  mediumCategory?: OptionDropdownType;
  smallCategory?: OptionDropdownType;
  organization?: OptionDropdownType;
}

export interface EventEditFormData {
  id?: string | number;
  title?: string;
  startDate?: Date | null;
  endDate?: Date | null;
  endTime?: string | null;
  startTime?: string | null;
  isAllDay?: boolean;
  tags?: Omit<Tags, 'peopleInCharge' | 'responsiblePerson'>[];
  tagIds?: OptionDropdownType[];
  participants?: EventParticipant[];
  participantIds?: number[];
  selectOrganizations?: number[];
  address?: string;
  memo?: string;
  type?: string | OptionDropdownType;
  largeCategory?: OptionDropdownType;
  mediumCategory?: OptionDropdownType;
  smallCategory?: OptionDropdownType;
  categories?: { id: string; name: string; type: string }[];
  organization?: OptionDropdownType | Organizations;
  createdAt?: Date;
}

export interface EventRequest {
  id?: string | number;
  title?: string;
  startDate?: string | null;
  endDate?: string | null;
  isAllDay?: boolean;
  tagIds?: number[];
  participantIds?: number[];
  address?: string;
  memo?: string;
  type?: string;
  sendToChat?: boolean;
  message?: string;
  categories?: EventWorkCategoryOption[];
  categoryIds?:
    | {
        categoryId: string | null;
        type: string;
      }[]
    | null;
  organizationId?: number | null;
  selectOrganizations?: number[];
}

export interface CreationDataEventCalendar {
  tags: Omit<Tags, 'responsiblePerson'>[];
  types: string[];
  members: EventParticipant[];
  categories: EventWorkCategory;
  organizations: {
    id: number;
    name: string;
    superior: { id: number; name: string } | null;
    tags: { id: number; name: string }[];
  }[];
}

export interface EventWorkCategory {
  LARGE: string[];
  MEDIUM: string[];
  SMALL: string[];
}

export interface EventParticipant {
  fullName: string;
  id: number | string;
  organizations?: Organizations[];
  type?: EventParticipantType;
  userIds?: number[];
  mainOrganization?: string;
  color?: string;
}

export interface CalendarDashboardMember {
  fullName: string;
  id: number | string;
  avatarColor: string;
  mainOrganization: string;
}

export interface EventCalendarProps {
  isAllDay: boolean;
  id: number | string;
  endDate: Date | null;
  startDate: Date | null;
  title: string;
  type?: EventCalendarType;
  isMySchedule?: boolean;
  isStart: boolean;
  participants?: EventParticipant[];
  address?: string;
  categories?: {
    name: string;
    type: string;
    id: number;
    color: string;
  }[];
}

export interface TaskCalendarProps {
  id: number;
  deadline: Date | null;
  planEndDate: Date | null;
  planStartDate: Date | null;
  title: string;
  taskSchedules: {
    id?: number | null;
    planStartDate: string | null;
    planEndDate?: string | null;
  }[];
  participants?: EventParticipant[];
  resourceId?: number;
}

export interface EventWorkCategoryOption {
  name: string;
  type: string;
  id?: number;
}

export interface CalendarPopoverInfo {
  date: Date;
  events: Array<{
    id: string;
    title: string;
    start?: Date;
    end?: Date;
    type?: EventCalendarType;
    participants?: EventParticipant[];
    taskId?: string;
    address?: string;
    allDay?: boolean;
  }>;
  left?: number;
  top?: number;
}
