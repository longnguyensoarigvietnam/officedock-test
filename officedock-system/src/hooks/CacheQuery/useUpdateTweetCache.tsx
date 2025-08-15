import { useQueryClient } from '@tanstack/react-query';

import { TweetDetail } from '@interfaces/tweet';

export function useUpdateTweetCache() {
  const queryClient = useQueryClient();

  const createTweetMessageLocal = (data: TweetDetail) => {
    queryClient.setQueryData(['fetchTweetList'], (oldData: any) => {
      if (!oldData) return oldData;

      // Insert new tweet at the start of the first page
      return {
        ...oldData,
        pages: oldData.pages.map((page: any, index: number) => {
          if (index === 0) {
            return {
              ...page,
              results: [data, ...page.results],
            };
          }
          return page;
        }),
      };
    });
  };

  const deleteTweetLocal = (id: number) => {
    queryClient.setQueryData(['fetchTweetList'], (oldData: any) => {
      if (!oldData) return oldData;

      // Delete selected tweet
      return {
        ...oldData,
        pages: oldData.pages.map((page: any) => ({
          ...page,
          results: page.results.filter((tweet: TweetDetail) => tweet.id != id), // remove deleted tweet
        })),
      };
    });
  };

  return { createTweetMessageLocal, deleteTweetLocal };
}
