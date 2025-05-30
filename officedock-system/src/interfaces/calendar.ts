import { Tags } from './tag';
import { Organizations } from './organization';
import { OptionDropdownType } from './common';
import { LocationEventType } from './location';
import { EventCalendarType, EventParticipantType } from '@constants/enums';

export interface EventCalendarDetail {
  id?: string;
  title: string;
  start: Date | string;
  end?: Date | string;
  allDay?: boolean;
  type?: string;
  isMyEvent?: boolean;
  participants?: EventParticipant[];
  resourceIds?: string[];
  location?: LocationEventType;
  largeColor?: string;
  isStart?: boolean;
  planStartDate?: string;
  planEndDate?: string;
  scheduleId?: number | null;
  taskId?: number | null;
  eventId?: string;
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
  location?: OptionDropdownType;
  memo?: string;
  type?: OptionDropdownType;
  largeCategory?: OptionDropdownType;
  mediumCategory?: OptionDropdownType;
  smallCategory?: OptionDropdownType;
  repeatType?: OptionDropdownType | null;
  repeatInterval?: OptionDropdownType | null;
  weekDay?: OptionDropdownType | null;
  monthDay?: OptionDropdownType | null;
  month?: OptionDropdownType | null;
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
  location?: OptionDropdownType | LocationEventType | null;
  memo?: string;
  type?: string | OptionDropdownType;
  largeCategory?: OptionDropdownType;
  mediumCategory?: OptionDropdownType;
  smallCategory?: OptionDropdownType;
  categories?: { id: string; name: string; type: string }[];
  createdAt?: Date;
  repeatType?: OptionDropdownType;
  repeatInterval?: OptionDropdownType;
  weekDay?: OptionDropdownType;
  monthDay?: OptionDropdownType;
  month?: OptionDropdownType;
}

export interface EventRequest {
  id?: string | number;
  title?: string;
  startDate?: string | null;
  endDate?: string | null;
  isAllDay?: boolean;
  tagIds?: number[];
  participantIds?: number[];
  locationId?: string;
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
  selectOrganizations?: number[];
  repeatType?: string | null;
  repeatInterval?: number | null;
  weekDay?: number | null;
  monthDay?: number | null;
  month?: number | null;
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
  eventLocations: LocationEventType[];
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
  avatarUrl?: string;
}

export interface CalendarDashboardMember {
  fullName: string;
  id: number | string;
  avatarColor: string;
  mainOrganization: string;
  avatar?: string;
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
  location?: LocationEventType;
  categories?: {
    name: string;
    type: string;
    id: number;
    color: string;
  }[];
  taskId: number | null;
  scheduleId: number | null;
  repeatSchedules?: {
    id: number;
    planEndDate: Date | null;
    planStartDate: Date | null;
    schedule: number;
    uuid: string;
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
    eventId: string;
    repeatScheduleId: string;
    title: string;
    start?: Date;
    end?: Date;
    type?: EventCalendarType;
    participants?: EventParticipant[];
    location?: LocationEventType;
    allDay?: boolean;
  }>;
  left?: number;
  top?: number;
}
