import { CompanyTransactionType } from '@constants/enums';

export interface Company {
  id: number;
  name: string;
  totalUsers: number;
  status?: string | null;
  plan?: {
    id: number;
    exchangeableAmount: number;
    limitPerson: number;
    monthlyFee: number;
    name: string;
  };
  maxUserAt?: string | null;
  maxUserInContractPeriod?: number;
  paymentMethod?: string | null;
  contract?: {
    startDate?: string | null;
    endDate?: string | null;
    createdAt?: string | null;
    address?: string | null;
    id?: string | null;
    department?: string[] | null;
    industry?: string | null;
    nextRenewalAt?: string | null;
    phone?: string | null;
    systemMainPurpose?: string[] | null;
  };
  responsiblePersonMail?: string | null;
  responsiblePersonName?: string | null;
  closeDate?: number;
  editableAfterClosing?: number;
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
  status?: string | null;
  paymentMethod?: string | null;
  responsiblePersonName?: string | null;
  responsiblePersonMail?: string | null;
  contract: {
    startDate?: string | null;
    endDate?: string | null;
    phone?: string | null;
    address?: string | null;
    industry?: string | null;
    systemMainPurpose?: string[] | null;
    department?: string[] | null;
  };
  customPlan?: {
    monthlyFee: number | null;
    exchangeableAmount: number | null;
    limitPerson: number | null;
  };
  closeDate?: number;
  editableAfterClosing?: number;
}
