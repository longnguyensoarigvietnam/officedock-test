import { AuthenticationTypes } from '@constants/enums';
import { Company } from './company';

export interface TermsStep {
  id: number;
  periodStart: string;
  periodEnd: string;
  status: string;
  title: string;
  type: string;
  description: string;
  isAccepted: boolean;
}

export interface UserAuth {
  id: number;
  email: string;
  password: string;
  authenticationType: AuthenticationTypes;
  profile: Profile;
  accessToken?: string;
  refreshToken?: string;
  sessionId?: string;
  unreadTerms?: TermsStep[];
}

export interface User {
  id: number;
  email: string;
  role: {
    id: number;
    name: string;
  };
  profile?: Profile;
  company: Company;
}

export interface Profile {
  id: number;
  fullName: string;
  birthday: string;
  gender: string;
}
export interface UserFilterFormData {
  fullName?: string;
  email?: string;
}
export interface CreateUserFormRequest {
  email: string;
  profile: {
    fullName: string;
  };
}
export interface CreateUserFormData {
  name: string;
  email: string;
}
