import { CompanyTransactionType } from '@constants/enums';

export interface Company {
  id: number;
  name: string;
  totalUsers: number;
  status?: string | null;
  plan?: string | null;
  maxUserAt?: string | null;
  maxUserInContractPeriod?: number;
  paymentMethod?: string | null;
  contract?: {
    startDate?: string | null;
    endDate?: string | null;
    createdAt?: string | null;
    address?: string | null;
    id?: string | null;
    implementationMainIssue?: string | null;
    industry?: string | null;
    nextRenewalAt?: string | null;
    phone?: string | null;
    responsiblePersonMail?: string | null;
    responsiblePersonName?: string | null;
    systemMainPurpose?: string | null;
  };
}

export interface CreateCompanyFormData {
  id: number;
  name: string;
  fullname: string;
  email: string;
  contract?: {
    startDate?: string | null;
    endDate?: string | null;
    status?: string;
  };
}

export interface CompanyTransaction {
  type: CompanyTransactionType;
  invoiceTarget: string | null;
  planStartAt: string | null;
  planEndAt: string | null;
  status: string | null;
  paidAt: string | null;
  plan: string | null;
}

export interface EditCompanyRequest {
  id?: number;
  name: string;
  plan?: string | null;
  paymentMethod?: string | null;
  contract: {
    startDate?: string | null;
    endDate?: string | null;
    responsiblePersonName?: string | null;
    responsiblePersonMail?: string | null;
    phone?: string | null;
    address?: string | null;
    industry?: string | null;
    systemMainPurpose?: string | null;
    implementationMainIssue?: string | null;
  };
}