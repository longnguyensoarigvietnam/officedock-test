'use client';
import { useParams, useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import { useContext, useEffect } from 'react';

import ViewInfo from '@components/common/ViewInfo';
import Button from '@components/common/Button';

import useSubmitLevelDetail from '@hooks/useSubmitLevelDetail';
import { useToast } from '@providers/ToastProvider';

import { LoadingContext } from '@providers/LoadingProvider';
import { SubmitLevelStateContext } from '@providers/SubmitLevelProvider';
import { getSubmitLevelFormattedDate } from '@utils/date';

import { ServerStatusCode } from '@constants/enums';
import { pageRouters } from '@constants/routers';
import { ERROR_COMMON_MESSAGE } from '@constants/message';

const SubmitLevelDetail = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const { dataSubmitLevelDetail, setDataSubmitLevelDetail } = useContext(
    SubmitLevelStateContext,
  );
  const { setIsLoading } = useContext(LoadingContext);
  const { submitLevelDetail } = useSubmitLevelDetail({
    submitLevelId: params.id,
    onError: (error: AxiosError) => {
      if (error.response?.status === ServerStatusCode.NOT_FOUND) {
        router.push(pageRouters.SUBMIT_LEVELS.href);
        showToast({
          variant: 'error',
          description: ERROR_COMMON_MESSAGE,
        });
      }
    },
  });

  useEffect(() => {
    if (submitLevelDetail) {
      setDataSubmitLevelDetail(submitLevelDetail);
    }
  }, [submitLevelDetail, setDataSubmitLevelDetail]);

  useEffect(() => {
    if (!dataSubmitLevelDetail) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataSubmitLevelDetail]);

  return (
    <div className="h-full flex flex-col justify-between">
      <div className="w-full flex flex-col gap-4 items-center">
        <ViewInfo label="スキル名">
          {dataSubmitLevelDetail?.skill.name}
        </ViewInfo>
        <ViewInfo label="申請者">
          {dataSubmitLevelDetail?.staff.profile.fullName}
        </ViewInfo>
        <ViewInfo label="組織">
          {dataSubmitLevelDetail?.organization.name}
        </ViewInfo>
        <ViewInfo label="申請日">
          {dataSubmitLevelDetail
            ? getSubmitLevelFormattedDate(
                new Date(dataSubmitLevelDetail.createdAt),
              )
            : ''}
        </ViewInfo>
        <ViewInfo label="ステータス">{dataSubmitLevelDetail?.status}</ViewInfo>
        <ViewInfo label="コメント">
          {dataSubmitLevelDetail?.comment &&
            dataSubmitLevelDetail?.comment.split('\n').map((comment, index) => {
              return <p key={index}>{comment}</p>;
            })}
        </ViewInfo>
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

export default SubmitLevelDetail;
