import { PointHistoryActiveTab } from "@constants/enums";

import { Staff } from "./user";

export interface CurrentPointDetail {
  coin: number;
  pearl: number;
  exchangeableCoin: number;
}

export interface CoinStatusDetail {
  totalCoins: number;
  targetUserCount: number;
  exchangeableCoinsPerUser: number;
  issueDate: string | null;
  expirationDate: string | null
}

export interface HistoryPointDetail {
  id: number;
  user: Staff;
  currency: PointHistoryActiveTab;
  amountUsed: number | null;
  amountReceived: number | null;
  companyBalanceAfter: number | null;
  transactionType: string | null;
  memo: string | null;
  createdAt: string | null;
}
