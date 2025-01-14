'use client';
import { useContext, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AxiosError } from 'axios';

import ViewInfo from '@components/common/ViewInfo';

import { ServerStatusCode } from '@constants/enums';
import { pageRouters } from '@constants/routers';
import { ERROR_COMMON_MESSAGE } from '@constants/message';

import { useToast } from '@providers/ToastProvider';
import { SkillStateContext } from '@providers/SkillProvider';
import { LoadingContext } from '@providers/LoadingProvider';
import useSkillDetail from '@hooks/useSkillDetail';
import Button from '@components/common/Button';

const SkillDetail = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  const { setIsLoading } = useContext(LoadingContext);

  const { dataSkillDetail, setDataSkillDetail } = useContext(SkillStateContext);
  const { skillDetail } = useSkillDetail({
    skillId: params.id,
    onError: (error: AxiosError) => {
      if (error.response?.status === ServerStatusCode.NOT_FOUND) {
        router.push(pageRouters.SKILLS_MANAGEMENT.href);
        showToast({
          variant: 'error',
          description: ERROR_COMMON_MESSAGE,
        });
      }
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  useEffect(() => {
    if (skillDetail) {
      setDataSkillDetail(skillDetail);
    }
  }, [setDataSkillDetail, skillDetail]);
  useEffect(() => {
    if (!dataSkillDetail) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
  }, [dataSkillDetail, setIsLoading]);

  return (
    <div className="flex flex-col h-full justify-between">
      <div className="w-full flex flex-col gap-4 items-center">
        <ViewInfo label="スキル名">{dataSkillDetail?.name} </ViewInfo>
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

export default SkillDetail;
