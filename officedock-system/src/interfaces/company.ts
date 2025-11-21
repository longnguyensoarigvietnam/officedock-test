import { Contract } from './contract';

export interface Company {
  id: number;
  name: string;
  contract: Contract;
  isShowHolidaysCalendar: boolean;
  mfCustomerId?: string | null;
  paymentType?: string | null;
  totalUsers?: number;
  plan?: {
    id: number;
    exchangeableAmount: number;
    limitPerson: number;
    monthlyFee: number;
    name: string;
  };
  closeDate?: number;
  startEditableDate?: string;
  isPaymentFailed?: boolean;
}
