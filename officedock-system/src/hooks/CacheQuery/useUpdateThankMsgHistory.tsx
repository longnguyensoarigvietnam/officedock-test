import { useQueryClient } from '@tanstack/react-query';

import { BasePagination } from '@interfaces/common';
import { ThankListDetailMsgType } from '@interfaces/thank';

export function useUpdateThankMsgHistoryCache() {
  const queryClient = useQueryClient();

  const removeMsgFromCache = ({
    id,
    type,
    user_id,
  }: {
    id: number;
    type: 'received' | 'sent';
    user_id: string;
  }) => {
    queryClient.setQueryData(
      ['getDetailThankMsgList', [type, user_id]],
      (oldData: any) => {
        if (!oldData) return oldData;
        const now = new Date().toISOString();

        return {
          ...oldData,
          pages: oldData.pages.map(
            (page: BasePagination<ThankListDetailMsgType[]>) => ({
              ...page,
              results: page.results.map((item) =>
                item.id === id ? { ...item, deletedAt: now } : item,
              ),
            }),
          ),
        };
      },
    );
  };

  return { removeMsgFromCache };
}
