import { OptionDropdownType } from './common';
import { User } from './user';

export interface Tags {
  id: number;
  name: string;
  responsiblePerson?: Omit<User, 'role' | 'company' | 'organizations'>;
  peopleInCharge: Omit<User, 'role' | 'company' | 'organizations'>[];
}
export interface TagDetailData {
  id: number;
  name: string;
  responsiblePerson?: Omit<User, 'role' | 'company' | 'organizations'>;
  peopleInCharge: Omit<User, 'role' | 'company' | 'organizations'>[];
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
export interface CreateTagRequest {
  name: string;
  responsiblePersonId: number | string | null;
  peopleInChargeIds: PeopleInCharge[];
}

export interface CreateTagFormData {
  name: string;
  responsiblePersonId: OptionDropdownType;
  peopleInChargeIds: OptionDropdownType[];
}
