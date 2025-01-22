export interface Company {
  id: number;
  name: string;
  contract?: {
    startDate?: string | null;
    endDate?: string | null;
    status?: string;
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
