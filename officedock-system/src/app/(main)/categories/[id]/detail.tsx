'use client';
import { useContext, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AxiosError } from 'axios';

import ViewInfo from '@components/common/ViewInfo';
import Button from '@components/common/Button';

import { ServerStatusCode } from '@constants/enums';
import { pageRouters } from '@constants/routers';
import { ERROR_COMMON_MESSAGE } from '@constants/message';

import { useToast } from '@providers/ToastProvider';
import { CategoryStateContext } from '@providers/CategoryProvider';
import { LoadingContext } from '@providers/LoadingProvider';
import useCategoryDetail from '@hooks/useCategoryDetail';

const CategoryDetail = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  const { setIsLoading } = useContext(LoadingContext);

  const { dataCategoryDetail, setDataCategoryDetail } =
    useContext(CategoryStateContext);
  const { categoryDetail } = useCategoryDetail({
    categoryId: params.id,
    onError: (error: AxiosError) => {
      if (error.response?.status === ServerStatusCode.NOT_FOUND) {
        router.push(pageRouters.CATEGORY_MANAGEMENT.href);
        showToast({
          variant: 'error',
          description: ERROR_COMMON_MESSAGE,
        });
      }
    },
  });

  useEffect(() => {
    if (categoryDetail) {
      setDataCategoryDetail(categoryDetail);
    }
  }, [setDataCategoryDetail, categoryDetail]);
  useEffect(() => {
    if (!dataCategoryDetail) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
  }, [dataCategoryDetail, setIsLoading]);

  return (
    <div className="flex h-full flex-col justify-between">
      <div className="w-full flex flex-col gap-4 items-center">
        <ViewInfo label="カテゴリ名">{dataCategoryDetail?.name} </ViewInfo>
      </div>
      <div className="w-full flex items-center gap-4 mt-8 justify-center mb-3">
        <Button
          variant="secondary"
          type="button"
          className="w-[426px]"
          onClick={() => router.back()}>
          戻る
        </Button>
      </div>
    </div>
  );
};

export default CategoryDetail;
