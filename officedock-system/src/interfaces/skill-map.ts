import { LevelUpConditionBy } from '@constants/enums';

import { OptionDropdownType } from './common';

export type StepKey = 'step1' | 'step2' | 'step3';

export type RawCategoryItem = {
  LARGE?: OptionDropdownType;
  MEDIUM?: OptionDropdownType;
  SMALL?: OptionDropdownType;
};

export interface ConditionByMap {
  [step: number]: {
    [level: number]: LevelUpConditionBy;
  };
}
