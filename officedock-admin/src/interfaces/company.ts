export interface Company {
  id: number;
  name: string;
  contract?: {
    startDate?: string | null;
    endDate?: string | null;
    status?: string;
  };
}
