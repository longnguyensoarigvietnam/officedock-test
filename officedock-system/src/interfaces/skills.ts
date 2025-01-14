import { Organizations } from './organization';
import { Role } from './role';
import { Profile } from './user';

export interface Skill {
  id: number;
  name: string;
}
export interface CreateSkillFormRequest {
  name?: string;
}
export interface CreateSkillFormData {
  name?: string;
}
export interface SkillMapFormData {
  organizationId?: number | null;
  staffId?: number | null;
  skillMaps: {
    index?: number | null;
    point?: number | null;
    level?: string | null;
    skillId?: string | number | null;
    skillMapId: number | null;
  }[];
}

export interface SkillMap {
  id?: number;
  isCanSubmit?: boolean;
  skillMaps: {
    id: number;
    index: number;
    level: string;
    skill: Skill;
    isApplying?: boolean;
    isSubmitted?: boolean;
    skillLevels?: {
      level1: LevelDetail;
      level2: LevelDetail;
      level3: LevelDetail;
    };
  }[];
  organization: {
    id: number;
    name: string;
  };
  staff: {
    id: number;
    fullName: string;
    birthday: string;
    gender: string;
    roles: Role[];
  };
  actions?: {
    update: boolean;
    delete: boolean;
  };
}

export interface ChildCategory {
  id: number | string;
  name: string;
  uuid: string;
}

export interface NestedCategory {
  MEDIUM: ChildCategory;
  SMALL: ChildCategory[];
}

export interface CategoryStructure {
  LARGE: ChildCategory;
  MEDIUM: NestedCategory[];
}

export interface SkillMapCategory {
  id: number;
  largeStatisticCategory: ChildCategory;
  mediumStatisticCategory: ChildCategory | null;
  smallStatisticCategory: ChildCategory | null;
  index: number;
}

export interface SkillMapDetail {
  isCanSubmit?: boolean;
  organization: {
    id: number;
    name: string;
  };
  staff: {
    id: number;
    fullName: string;
    birthday: string;
    gender: string;
    roles: Role[];
  };
  skillMaps: {
    id: number;
    index: number;
    level: string;
    skill: Skill;
    isApplying?: boolean;
    isSubmitted?: boolean;
    skillLevels?: {
      level1: LevelDetail;
      level2: LevelDetail;
      level3: LevelDetail;
    };
  }[];
}

export interface OrganizationSkill {
  id: number;
  skill: string;
  allSkills: OrganizationSkillDetail[];
  organization: {
    id: number;
    name: string;
    superior: Organizations;
    userCount: number;
  };
  actions?: {
    update: boolean;
    delete: boolean;
  };
}

export interface OrganizationSkillFormData {
  organizationSkills: {
    id?: number;
    skillId?: number | null;
    defineSkill?: string;
    levels: {
      level1: LevelDetail;
      level2: LevelDetail;
      level3: LevelDetail;
    };
    index: number;
  }[];
}

export interface LevelDetail {
  measurementCount?: number | null;
  measurementTime?: number | null;
  reviewPeriod?: string;
  descriptions?: string[] | null;
}

export interface OrganizationSkillDetail {
  id?: number;
  skill?: {
    id: number;
    name: string;
  };
  defineSkill?: string;
  levels: {
    level1: LevelDetail;
    level2: LevelDetail;
    level3: LevelDetail;
  };
  index: number;
  isHasSkillMap?: boolean;
}

export interface Description {
  label: string;
  value: number;
}

export interface Level {
  measurementCount: number | null;
  measurementTime: number | null;
  reviewPeriod: string;
  descriptions: Description[];
}
export interface CreateRowDataType {
  id?: number | null;
  customId: string;
  skillId: number | null;
  defineSkill: string;
  levels: {
    level1: Level;
    level2: Level;
    level3: Level;
  };
  index: number;
  isShow: boolean;
  isHasSkillMap?: boolean;
}

export interface SubmitLevel {
  id: number;
  isEdited?: boolean;
  actions?: {
    update: boolean;
    delete: boolean;
  };
  organization: {
    id: number;
    name: string;
    userCount: number;
    superior: Organizations | null;
  };
  staff: {
    id: number;
    loginType: string;
    username: string | null;
    email: string;
    twoFactorAuthEmail: string;
    profile: Profile;
  };
  skill: Skill;
  levelBeforeSubmit: string;
  levelAfterSubmit?: string;
  status: string;
  comment: string;
  createdAt: Date;
}

export interface CreateSubmitLevelsFormData {
  staffId: number;
  organizationId: number;
  skillId: number;
  levelBeforeSubmit: string;
}
