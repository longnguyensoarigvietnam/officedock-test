import { OptionDropdownType } from './common';

export interface Term {
  id: number;
  title: string;
  status: OptionDropdownType | string;
  periodStart: Date | string | null;
  periodEnd: Date | string | null;
  type: string;
  description: string;
  isConfirmed?: boolean;
}

export interface CreateTermFormData {
  title: string;
  status: OptionDropdownType | string;
  periodStart: Date | string | null;
  periodEnd: Date | string | null;
  type?: string;
  description: string;
}

export interface TermFormDataRequest {
  title: string;
  status: string;
  periodStart: Date | string | null;
  periodEnd: Date | string | null;
  type: string;
  description: string;
}
