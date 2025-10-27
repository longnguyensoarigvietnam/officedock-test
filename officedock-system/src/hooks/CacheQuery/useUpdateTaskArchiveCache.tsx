import { useQueryClient } from '@tanstack/react-query';
import { Task, TaskArchive } from '@interfaces/task';

export function useUpdateTaskArchiveCache() {
  const queryClient = useQueryClient();

  const removeTaskFromCache = (id: number) => {
    const queries = queryClient
      .getQueryCache()
      .findAll({ queryKey: ['getTaskArchiveList'] });

    queries.forEach(({ queryKey }) => {
      queryClient.setQueryData(queryKey, (oldData: any) => {
        if (!oldData) return oldData;
        if (Array.isArray(oldData.pages)) {
          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              results: Array.isArray(page.results)
                ? page.results.filter((task: TaskArchive) => task.id !== id)
                : page.results,
            })),
          };
        }
        if (Array.isArray(oldData.results)) {
          return {
            ...oldData,
            results: oldData.results.filter(
              (task: TaskArchive) => task.id !== id,
            ),
          };
        }

        if (Array.isArray(oldData)) {
          return oldData.filter((task: TaskArchive) => task.id !== id);
        }

        return oldData;
      });
    });
  };
  const updateTaskInCache = (updatedTask: Task) => {
    const queries = queryClient
      .getQueryCache()
      .findAll({ queryKey: ['getTaskArchiveList'] });

    queries.forEach(({ queryKey }) => {
      queryClient.setQueryData(queryKey, (oldData: any) => {
        if (!oldData) return oldData;

        // Infinite query
        if (Array.isArray(oldData.pages)) {
          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              results: Array.isArray(page.results)
                ? page.results.map((task: TaskArchive) =>
                    task.id === updatedTask.id
                      ? {
                          ...task,
                          title: updatedTask.title,
                          categories: updatedTask.categories,
                        }
                      : task,
                  )
                : page.results,
            })),
          };
        }

        // Paginated query
        if (Array.isArray(oldData.results)) {
          return {
            ...oldData,
            results: oldData.results.map((task: TaskArchive) =>
              task.id === updatedTask.id ? { ...task, ...updatedTask } : task,
            ),
          };
        }

        // Flat array
        if (Array.isArray(oldData)) {
          return oldData.map((task: TaskArchive) =>
            task.id === updatedTask.id ? { ...task, ...updatedTask } : task,
          );
        }

        return oldData;
      });
    });
  };
  const refreshTaskArchiveList = async (
    orderingOptions?: any,
    ordering?: string,
  ) => {
    await queryClient.invalidateQueries({
      queryKey: ['getTaskArchiveList', orderingOptions, ordering],
      refetchType: 'active',
    });
  };

  return {
    removeTaskFromCache,
    updateTaskInCache,
    refreshTaskArchiveList,
  };
}
