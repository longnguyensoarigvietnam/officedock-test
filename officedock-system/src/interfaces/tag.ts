import { OptionDropdownType } from './common';
import { Organizations } from './organization';

export interface Tags {
  id?: number;
  name?: string;
  organizations?: Organizations[];
  deletedAt?: Date | string | null;
  createdAt?: Date | string | null;
  actions?: {
    update: boolean;
    delete: boolean;
    updateName?: boolean;
  };
  isCalendarOrganizationCheck?: boolean
}

export interface TagFilterFormData {
  name?: string;
  personInCharge?: OptionDropdownType;
}
export interface PeopleInCharge {
  peopleInChargeId: number | string;
}
export interface TagId {
  tagId: number | string;
  name?: string;
}
export interface TagRequest {
  name: string;
  organizationIds: number[];
  calendarOrganizationCheck: boolean
}

export interface TagFormData {
  name: string;
  organizations: OptionDropdownType[];
  isHidden?: boolean;
  calendarOrganizationCheck: boolean;
}
export interface TagCreationStatisticType {
  id: number;
  name: string;
}
