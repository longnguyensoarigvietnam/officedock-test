export interface Contract {
  id: number;
  startDate: string;
  endDate: string;
  status: string;
  nextRenewalAt?: string;
}
