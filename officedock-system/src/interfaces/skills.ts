import { OptionDropdownType } from './common';
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
type StepKey = 'step1' | 'step2' | 'step3';

type BaseSkillLevel = {
  skillLevelId?: number | null;
  organization?: number;
  level: string;
  measureCount?: number | null;
  measureTime?: number | null;
  lookBackInterval?: number | null;
};

type BaseStepDetail = {
  skillId?: number | null;
  name: string;
  organizationId: number;
  description: string;
  step: string;
  categories?: {
    id: number;
    name: string;
    color: string | null;
    type: string;
  }[][];
};

export type SkillLevelDetail = BaseSkillLevel & {
  items: { value: string }[];
  lookBackType?: OptionDropdownType | null;
};
export type SkillLevelRequestDetail = BaseSkillLevel & {
  items: string[];
  lookBackType?: string | null;
};

export type StepFormDataDetail = BaseStepDetail & {
  skillLevels: SkillLevelDetail[];
};

export type StepRequestDataDetail = BaseStepDetail & {
  skillLevels: SkillLevelRequestDetail[];
};

export type SkillMapFormData = Record<StepKey, StepFormDataDetail | null>;
export type SkillMapRequestData = Record<StepKey, StepRequestDataDetail>;

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

export interface SkillMapByMembers {
  id: number;
  uuid: string;
  name: string;
  icon: string | null;
  iconColor: string;
  users: {
    id: number;
    fullName: string;
    avatarColor: string;
    avatar: string | null;
    organizations: Organizations;
    skills: Record<
      number,
      {
        isChecked: boolean;
        skillMap: number;
      }
    >;
  }[];
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
  uuid: string;
  name: string;
  icon: string | null;
  iconColor: string;
  steps: {
    step1: string;
    step2: string;
    step3: string;
  };
  skills: {
    id: number;
    name: string;
    description: string;
    step: string;
    skillLevels: (Omit<BaseSkillLevel, 'skillLevelId'> & {
      id: number;
      items: string[];
      lookBackType?: string;
      skill: number;
    })[];
  }[];
}

export interface SkillMapSkill {
  id: number;
  uuid: string;
  name: string;
  icon: string | null;
  iconColor: string;
  steps: {
    step1: string;
    step2: string;
    step3: string;
  };
  skills: {
    parentName: string;
    id: number;
    detail: {
      id: number;
      name: string;
      description: string;
      step: string;
    }[];
  }[];
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

export interface OrganizationSkillMapDetail {
  id?: number;
  name: string;
  organization: {
    id: number;
    uuid: string;
    name: string;
    superior: Organizations | null;
    userCount: number;
    actions: {
      update: boolean;
      delete: boolean;
    };
    icon: string;
    iconColor: string;
  };
  description: string;
  step: string;
  skillLevels: (Omit<BaseSkillLevel, 'skillLevelId'> & {
    id: number;
    items: string[];
    lookBackType?: string;
    skill: number;
  })[];
  categories: {
    id: number;
    name: string;
    color: string | null;
    type: string;
  }[][];
  createdAt?: Date | null;
}

export interface OrganizationDefineSteps {
  defineStep1: string | null;
  defineStep2: string | null;
  defineStep3: string | null;
}

export interface ManageSkillMapsRequest {
  items: {
    isChecked: boolean;
    id: number;
  }[];
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
export interface CreationDataSkill {
  organization: {
    id: number;
    name: string;
  };
  skills: {
    id: number;
    name: string;
  }[];
}
