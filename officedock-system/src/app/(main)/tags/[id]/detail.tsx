'use client';
import { useContext, useEffect } from 'react';
import { AxiosError } from 'axios';
import { useParams, useRouter } from 'next/navigation';

import ViewInfo from '@components/common/ViewInfo';
import Button from '@components/common/Button';

import { ServerStatusCode } from '@constants/enums';
import { ERROR_COMMON_MESSAGE } from '@constants/message';
import { UNREGISTERED } from '@constants';
import { pageRouters } from '@constants/routers';

import { useToast } from '@providers/ToastProvider';
import { TagStateContext } from '@providers/TagProvider';
import { LoadingContext } from '@providers/LoadingProvider';

import useTagDetail from '@hooks/useTagDetail';

const TagDetail = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  const { dataTagDetail, setDataTagDetail } = useContext(TagStateContext);
  const { setIsLoading } = useContext(LoadingContext);

  const { tagDetail } = useTagDetail({
    tagId: params.id,
    onError: (error: AxiosError) => {
      if (error.response?.status === ServerStatusCode.NOT_FOUND) {
        router.push(pageRouters.TAGS_MANAGEMENT.href);
        showToast({
          variant: 'error',
          description: ERROR_COMMON_MESSAGE,
        });
      }
    },
  });

  useEffect(() => {
    if (tagDetail) {
      setDataTagDetail(tagDetail);
    }
  }, [setDataTagDetail, tagDetail]);
  useEffect(() => {
    if (!dataTagDetail) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
  }, [dataTagDetail, setIsLoading]);
  return (
    <div className="flex flex-col justify-between h-full">
      <div className="w-full flex flex-col gap-4 items-center">
        <ViewInfo label="集計タグ">{dataTagDetail?.name}</ViewInfo>
        <ViewInfo label="責任者">
          {dataTagDetail?.responsiblePerson?.profile?.fullName || UNREGISTERED}{' '}
        </ViewInfo>
        <ViewInfo label="担当者">
          {dataTagDetail?.peopleInCharge &&
          dataTagDetail?.peopleInCharge.length > 0
            ? dataTagDetail?.peopleInCharge.map((person, index) => {
                return (
                  <span
                    key={
                      person.id
                    }>{`${person.profile.fullName}${dataTagDetail?.peopleInCharge && dataTagDetail?.peopleInCharge.length - 1 !== index ? '、' : ''}`}</span>
                );
              })
            : UNREGISTERED}
        </ViewInfo>
      </div>
      <div className="w-full flex items-center gap-2 mt-8 justify-center mb-3">
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

export default TagDetail;
