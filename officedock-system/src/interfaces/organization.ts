import { OptionDropdownType } from './common';
import { Skill } from './skills';
import { Profile } from './user';

export interface CreateOrganizationRequest {
  name: string;
  superiorId: number | string | null;
}

export interface CreateOrganizationFormData {
  name: string;
  superiorId?: OptionDropdownType;
}

export interface Organizations {
  id: number;
  name: string;
  userCount: number;
  superior: Omit<Organizations, 'isMain'>;
  users?: Omit<Profile, 'birthday' | 'gender'>[];
  statisticCategories: statisticCategories[];
  skills: {
    defineSkill: string;
    id: number;
    level: number | null;
    skill: Skill;
  }[];
  actions?: {
    update: boolean;
    delete: boolean;
  };
  isMain?: boolean;
}

export interface OrganizationFilterFormData {
  name?: string;
  superiorName?: string;
}
export interface statisticCategories {
  id: number;
  largeStatisticCategory: {
    id: number;
    name: string;
    uuid: string;
  };
  mediumStatisticCategory: {
    id: number;
    name: string;
    uuid: string;
  };
  smallStatisticCategory: {
    id: number;
    name: string;
    uuid: string;
  };
  index: number;
  skills: Skill[];
}
