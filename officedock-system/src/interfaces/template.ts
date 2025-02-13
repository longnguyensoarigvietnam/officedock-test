import { OptionDropdownType } from './common';
import { Organizations } from './organization';
import { PeopleInCharge, TagId, Tags } from './tag';
import { TodoItem } from './task';

export interface TemplateRequest {
  id?: number | string;
  title?: string;
  type?: string;
  description?: string;
  tagIds?: TagId[] | null;
  categoryIds?:
    | {
        categoryId: string | null;
        type: string;
      }[]
    | null;
  index?: number;
  isImportant?: boolean;
  todoList?: TodoItem[];
  action?: string;
  organizationId?: number | null;
  peopleInChargeIds?: PeopleInCharge[] | null;
}
export interface TemplateFormData {
  id?: string;
  title?: string;
  type?: OptionDropdownType;
  description?: string;
  tagIds?: OptionDropdownType[] | null;
  createdAt?: Date;
  index?: number;
  categories: {
    LARGE: OptionDropdownType;
    MEDIUM: OptionDropdownType;
    SMALL: OptionDropdownType;
  };
  isImportant: boolean;
  todoList?: TodoItem[];
  oldIdStatus?: string;
  organization?: OptionDropdownType | null;
  peopleInChargeIds?: OptionDropdownType[];
}

export interface Template {
  id: number;
  title: string;
  type?: string;
  description?: string;
  categories?: {
    name: string;
    type: string;
    id: number;
  }[];
  isImportant?: boolean;
  todoList?: TodoItem[];
  organization?: Organizations;
  tags?: Omit<Tags, 'peopleInCharge' | 'responsiblePerson'>[];
  createdAt?: Date;
}
