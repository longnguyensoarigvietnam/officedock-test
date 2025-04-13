import { OptionDropdownType } from './common';
import { Organizations } from './organization';

export interface Tags {
  id?: number;
  name?: string;
  organizations?: Organizations[];
  isHidden?: boolean;
  createdAt?: Date | string;
  actions?: {
    update: boolean;
    delete: boolean;
  };
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
}

export interface TagFormData {
  name: string;
  organizations: OptionDropdownType[];
  isHidden?: boolean;
}
export interface TagCreationStatisticType {
  id: number;
  name: string;
}
