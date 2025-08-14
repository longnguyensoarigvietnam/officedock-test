import { Survey } from '@interfaces/survey';
import { useQueryClient } from '@tanstack/react-query';

export function useUpdateSurveyCache() {
  const queryClient = useQueryClient();

  const updateSurveyAnswered = (id: number, TabTypeSurveyValue: string) => {
    queryClient.setQueryData(
      ['getSurveyList', undefined, TabTypeSurveyValue],
      (oldData: any) => {
        if (!oldData) return oldData;

        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            results: page.results.map((item: Survey) =>
              item.id === id ? { ...item, isAnswered: true } : item,
            ),
          })),
        };
      },
    );
  };
  const refreshSurveyList = async (TabTypeSurveyValue: string) => {
    await queryClient.invalidateQueries({
      queryKey: ['getSurveyList', undefined, TabTypeSurveyValue],
      refetchType: 'active',
    });
  };

  return { updateSurveyAnswered, refreshSurveyList };
}
