export interface Category {
  id?: number | string;
  name: string;
  uuid?: string;
  color?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  organizations?: {
    id: number;
    name: string;
  }[];
}
export interface CreateCategoryFormRequest {
  name?: string;
  uuid?: string;
}
export interface CreateCategoryFormData {
  name?: string;
}
export interface CreationDataStatisticCategory {
  id: number;
  name: string;
  uuid: string;
  team?: number | null;
}
