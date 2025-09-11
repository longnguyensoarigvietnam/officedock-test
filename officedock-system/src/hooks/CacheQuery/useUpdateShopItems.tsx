import { useQueryClient } from '@tanstack/react-query';
import { ItemUser, ShopItem } from '@interfaces/shop';

export function useUpdateShopItemCache() {
  const queryClient = useQueryClient();

  const updateItemOwned = ({
    screenName,
    type,
    id,
    isOwned,
  }: {
    screenName: string | undefined;
    type: string;
    id: number;
    isOwned: boolean;
  }) => {
    queryClient.setQueryData(
      ['getListShopItem', screenName, type],
      (oldData: any) => {
        if (!oldData) return oldData;

        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            results: page.results.map((shopItem: ShopItem) => ({
              ...shopItem,
              items: shopItem.items.map((item: ItemUser) =>
                item.id === id ? { ...item, isOwned } : item,
              ),
            })),
          })),
        };
      },
    );
  };

  return { updateItemOwned };
}
