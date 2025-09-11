export interface HistoryPoint {
  id: number;
  currency: string;
  amountUsed: number;
  amountReceived: number;
  balanceAfter: number;
  transactionType: string;
  memo: string;
  createdAt: string | Date | null
}
