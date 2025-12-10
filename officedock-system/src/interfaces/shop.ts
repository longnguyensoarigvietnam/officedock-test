import { ItemAvatarType } from '@constants/enums';

export interface ItemUser {
  id: number;
  createdAt: string; // ISO datetime string
  updatedAt: string;
  deletedAt: string | null;
  name: string;
  itemType: ItemAvatarType;
  price: number;
  color: string;
  typePrice: string;
  cropFile: string;
  fullFile: string;
  isOwned: boolean;
  isEquipped?: boolean;
}

export interface ShopItem {
  name: string;
  isAllOwned: boolean;
  itemType: string;
  items: ItemUser[];
  thumb?: string;
}
export interface AvatarItemUser {
  name: string;
  type: string;
  url: string;
}
export interface ShopItemResponse {
  itemType: ItemAvatarType;
  item: number;
  isEquipped: true;
}
export interface CustomizeItemResponse {
  itemType: ItemAvatarType;
  item: number;
  isEquipped: true;
}
