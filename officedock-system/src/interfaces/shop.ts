export interface ItemUser {
  id: number;
  createdAt: string; // ISO datetime string
  updatedAt: string;
  deletedAt: string | null;
  name: string;
  itemType: string;
  price: number;
  color: string;
  typePrice: string;
  cropFile: string;
  fullFile: string;
}

export interface ShopItem {
  name: string;
  itemType: string;
  items: ItemUser[];
}
