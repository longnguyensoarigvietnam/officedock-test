import { useQueryClient } from '@tanstack/react-query';

import { MVPVotingComment } from '@interfaces/mvp';

export function useUpdateMVPVoteCommentCache() {
  const queryClient = useQueryClient();

  const deleteVoteCommentLocal = (data: {
    commentId: number;
    mvpCandidateId: number;
  }) => {
    queryClient.setQueryData(
      ['fetchVoteCommentList', data.mvpCandidateId],
      (oldData: any) => {
        if (!oldData) return oldData;

        // Delete selected comment
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            results: page.results.map((comment: MVPVotingComment) => {
              if (comment.id != data.commentId) return { ...comment };
              return { ...comment, deletedAt: new Date() };
            }), // remove deleted comment
          })),
        };
      },
    );
  };

  return { deleteVoteCommentLocal };
}
