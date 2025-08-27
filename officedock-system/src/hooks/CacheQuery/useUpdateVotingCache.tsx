import { useQueryClient } from '@tanstack/react-query';

import { VotingDetail } from '@interfaces/mvp';

import { VotingManagementType } from '@constants/enums';

export function useUpdateVotingCache() {
  const queryClient = useQueryClient();

  const createVotingLocal = (
    data: VotingDetail,
    timeline: VotingManagementType,
  ) => {
    queryClient.setQueryData(
      ['fetchMVPVotingList', timeline],
      (oldData: any) => {
        if (!oldData) return oldData;

        // Insert new voting at the start of the first page
        return {
          ...oldData,
          pages: oldData.pages.map((page: any, index: number) => {
            if (index === 0) {
              return {
                ...page,
                results: [data, ...(page.results ?? [])],
              };
            }
            return page;
          }),
        };
      },
    );
  };

  const updateVotingLocal = (
    updatedData: VotingDetail,
    timeline: VotingManagementType,
  ) => {
    queryClient.setQueryData(
      ['fetchMVPVotingList', timeline],
      (oldData: any) => {
        if (!oldData) return oldData;

        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => {
            return {
              ...page,
              results: page.results.map((item: VotingDetail) =>
                item.id === updatedData.id
                  ? { ...item, ...updatedData } // Merge or replace
                  : item,
              ),
            };
          }),
        };
      },
    );
  };

  const deleteVotingLocal = (id: number, timeline: VotingManagementType) => {
    queryClient.setQueryData(
      ['fetchMVPVotingList', timeline],
      (oldData: any) => {
        if (!oldData) return oldData;

        // Delete selected voting
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            results: page.results.filter((vote: VotingDetail) => vote.id != id), // remove deleted vote
          })),
        };
      },
    );
  };

  return { createVotingLocal, updateVotingLocal, deleteVotingLocal };
}
