import { useQueryClient } from '@tanstack/react-query';
import { ItemUser, ShopItem } from '@interfaces/shop';

export function useUpdateCusTomizeItemCache() {
  const queryClient = useQueryClient();

  const updateItemEquipped = ({
    screenName,
    type,
    id,
  }: {
    screenName: string | undefined;
    type: string;
    id: number;
  }) => {
    queryClient.setQueryData(
      ['getListItemCustomize', screenName, type],
      (oldData: any) => {
        if (!oldData) return oldData;

        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            results: page.results.map((shopItem: ShopItem) => ({
              ...shopItem,
              items: shopItem.items.map((item: ItemUser) =>
                item.id === id
                  ? { ...item, isEquipped: true }
                  : { ...item, isEquipped: false },
              ),
            })),
          })),
        };
      },
    );
  };

  return { updateItemEquipped };
}
