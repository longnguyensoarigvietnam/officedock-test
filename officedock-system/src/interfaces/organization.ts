import { Skill } from './skills';
import { Profile } from './user';
export interface Organizations {
  id?: number;
  name: string;
  userCount?: number;
  superior?: Omit<Organizations, 'isMain' | 'superior'>;
  users?: Omit<Profile, 'birthday' | 'gender'>[];
  statisticCategories?: statisticCategories[];
  skills?: {
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
  uuid?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
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
export type ConfigNode = {
  uuid: string;
  value?: string;
  name: string | null;
  icon?: string;
  parentUuid?: string;
  children: ConfigNode[];
};
export type NodeDataRequest = {
  uuid: string;
  parentUuid?: string;
  name: string | null;
  icon?: string;
};
