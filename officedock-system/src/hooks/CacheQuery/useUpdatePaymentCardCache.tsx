import { useQueryClient } from '@tanstack/react-query';
import { PaymentMethod } from '@interfaces/payment';

export function useUpdatePaymentCardCache() {
  const queryClient = useQueryClient();

  const removePaymentCard = (id: number) => {
    const queries = queryClient
      .getQueryCache()
      .findAll({ queryKey: ['getPaymentMethodList'] });

    queries.forEach(({ queryKey }) => {
      queryClient.setQueryData(queryKey, (oldData: any) => {
        if (!oldData) return oldData;

        if (Array.isArray(oldData.results)) {
          return {
            ...oldData,
            results: oldData.results.filter(
              (card: PaymentMethod) => card.id !== id,
            ),
          };
        }

        if (Array.isArray(oldData)) {
          return oldData.filter((card: PaymentMethod) => card.id !== id);
        }

        return oldData;
      });
    });
  };
  const updateDefaultCard = (id: number) => {
    const queries = queryClient
      .getQueryCache()
      .findAll({ queryKey: ['getPaymentMethodList'] });

    queries.forEach(({ queryKey }) => {
      queryClient.setQueryData(queryKey, (oldData: any) => {
        if (!oldData) return oldData;

        if (Array.isArray(oldData.results)) {
          return {
            ...oldData,
            results: oldData.results.map((card: PaymentMethod) => ({
              ...card,
              isDefault: card.id === id,
            })),
          };
        }

        if (Array.isArray(oldData)) {
          return oldData.map((card: PaymentMethod) => ({
            ...card,
            isDefault: card.id === id,
          }));
        }

        return oldData;
      });
    });
  };
  const addCardPayment = (newCard: PaymentMethod) => {
    const queries = queryClient
      .getQueryCache()
      .findAll({ queryKey: ['getPaymentMethodList'] });

    queries.forEach(({ queryKey }) => {
      queryClient.setQueryData(queryKey, (oldData: any) => {
        if (!oldData) {
          return { results: [newCard] };
        }

        if (Array.isArray(oldData.results)) {
          return {
            ...oldData,
            results: [newCard, ...oldData.results],
          };
        }
        if (Array.isArray(oldData)) {
          return [newCard, ...oldData];
        }

        return oldData;
      });
    });
  };

  return { removePaymentCard, updateDefaultCard, addCardPayment };
}
