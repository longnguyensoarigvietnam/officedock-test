export interface Category {
  id: number;
  name: string;
}
export interface CreateCategoryFormRequest {
  name?: string;
  uuid?: string;
}
export interface CreateCategoryFormData {
  name?: string;
}
