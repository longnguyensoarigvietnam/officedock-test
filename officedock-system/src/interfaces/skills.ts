import { SkillMapLookBackType, SubmitLevelStatus } from '@constants/enums';
import { OptionDropdownType } from './common';
import { Organizations } from './organization';
import { Role } from './role';
import { Staff } from './user';

export interface Skill {
  id: number;
  name: string;
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
  rawCategories: {
    LARGE: OptionDropdownType;
    MEDIUM: OptionDropdownType;
    SMALL: OptionDropdownType;
  }[];
};

export type StepRequestDataDetail = BaseStepDetail & {
  skillLevels: SkillLevelRequestDetail[];
  categoryIds: {
    largeStatisticCategoryId: number | null;
    mediumStatisticCategoryId: number | null;
    smallStatisticCategoryId: number | null;
  }[];
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
  SMALL?: ChildCategory[];
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

export interface SkillMapInfo {
  id?: number;
  user: {
    id: number;
    fullName: string;
    avatarColor: string;
    avatar: string | null;
    organizations: Organizations;
  };
  organizations: SkillMapByOrganization[];
  nextUser: number;
  prevUser: number;
}

export interface SkillMapByOrganization {
  organizationName: string;
  skillMaps: SkillMapByOrganizationInfo[][];
  steps: {
    step1: string;
    step2: string;
    step3: string;
  };
}

export interface SkillMapByOrganizationInfo {
  id: number | null;
  skill: {
    id: number | null;
    name: string | null;
    description: string | null;
    step: string | null;
  };
  isComplete: boolean | null;
  step: string | null;
  isLocked: boolean | null;
  isHaveComment: boolean | null;
  progressPercent?: number | null;
  level: {
    id: number | null;
    skillMap: number | null;
    level: string | null;
    measureCount: number | null;
    actualMeasureCount: number | null;
    measureTime: number | null;
    actualMeasureTime: number | null;
    startLookbackAt: Date | string | null;
    nextSubmitAt: Date | string | null;
    lookBackInterval: number | null;
    lookBackType: string | null;
    items: string[];
    isComplete: boolean | null;
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
    id: number | null;
    skillId: number;
    userId: number;
    isChecked: boolean;
  }[];
}

export interface SkillMapComment {
  id: number;
  staff: Staff;
  approver: Staff;
  organization: Pick<
    Organizations,
    'id' | 'uuid' | 'name' | 'userCount' | 'actions'
  >;
  skill: {
    id: number;
    name: string;
    description: string;
    step: string;
  };
  levelBeforeSubmit: string;
  levelAfterSubmit: string;
  stepBeforeSubmit: string;
  stepAfterSubmit: string;
  status: string;
  comment: string;
  createdAt: Date | null;
}

export interface SkillMapLevelUp {
  organization: number;
  skill: {
    id: number;
    name: string;
  };
  isApplying: boolean;
  approver: Staff;
  approvers: Staff[];
  levelBeforeSubmit: string;
  levelAfterSubmit: string;
  stepBeforeSubmit: string;
  stepAfterSubmit: string;
  items: {
    item: string;
    isChecked: boolean;
  }[];
  skillMapSkillLevel: number;
  submitLevel: number | null;
}

export interface SubmitLevelUpRequest {
  staffId: number;
  organizationId: number;
  skillId: number;
  levelBeforeSubmit: string;
  stepBeforeSubmit: string;
  approverId: number | null;
  status?: SubmitLevelStatus;
  items?: {
    item: string;
    isChecked: boolean;
  }[];
  submitLevel: number | null;
  skillMapSkillLevel?: number | null;
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

export interface SubmitLevel {
  id: number;
  staff: Staff;
  skill: {
    id: number;
    name: string;
    description: string;
    step: string;
  };
  status: string;
  createdAt: string | Date | undefined;
  progression: {
    levelBeforeSubmit: string;
    levelAfterSubmit: string;
    stepBeforeSubmit: string;
    stepAfterSubmit: string;
  };
  skillMapSkillLevel: {
    id: number | null;
    skillMap: number | null;
    level: string | null;
    measureCount: number | null;
    actualMeasureCount: number | null;
    measureTime: number | null;
    actualMeasureTime: number | null;
    startLookbackAt: Date | string | null;
    nextSubmitAt: Date | string | null;
    lookBackInterval: number | null;
    lookBackType: string | null;
    items: {
      item: string;
      isChecked: boolean;
    }[];
    isComplete: boolean | null;
  };
  comment: string;
  approver?: Staff;
}

export interface SubmitLevelByOrganization {
  organizationName: string;
  submitLevels: {
    id: number;
    skill: {
      id: number;
      name: string;
      description: string;
      step: string;
    };
    createdAt: string | Date | undefined;
    progression: {
      levelBeforeSubmit: string;
      levelAfterSubmit: string;
      stepBeforeSubmit: string;
      stepAfterSubmit: string;
    };
    status: string;
    staff: Staff;
  }[];
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
export interface CensorSubmittedLevelRequest {
  status: SubmitLevelStatus;
  comment: string;
  items: {
    item: string;
    isChecked: boolean;
  }[];
  measureCount?: number;
  measureTime?: number;
  lookBackInterval?: number;
  lookBackType?: SkillMapLookBackType;
}
export interface SaveLevelUpDraftRequest {
  items: {
    item: string;
    isChecked: boolean;
  }[];
  approver: number;
}
