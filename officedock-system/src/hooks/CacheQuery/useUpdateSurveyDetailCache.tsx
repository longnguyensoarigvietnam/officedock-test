import { useQueryClient } from '@tanstack/react-query';
import { SurveyDetailType } from '@interfaces/survey';

export function useUpdateSurveyDetailCache() {
  const queryClient = useQueryClient();

  const updateSurveyQuestion = (surveyId: string, questionId: number) => {
    queryClient.setQueryData(
      ['getSurveyDetail', surveyId],
      (oldData: SurveyDetailType | undefined) => {
        if (!oldData) return oldData;

        return {
          ...oldData,
          questions: oldData.questions.map((q) => {
            if (q.id === questionId) {
              // Selected sentence → turn on isSelected and +1
              return {
                ...q,
                isSelected: true,
                selectedUserCount: q.selectedUserCount + 1,
              };
            }

            if (q.isSelected) {
              // Previously selected sentence → reset to false and -1
              return {
                ...q,
                isSelected: false,
                selectedUserCount: Math.max(0, q.selectedUserCount - 1),
              };
            }

            return q;
          }),
        };
      },
    );
  };

  return { updateSurveyQuestion };
}
