import { Contract } from './contract';

export interface Company {
  id: number;
  name: string;
  contract: Contract;
  isShowHolidaysCalendar: boolean
}
