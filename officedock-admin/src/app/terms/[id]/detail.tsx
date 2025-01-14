'use client';
import { useParams, useRouter } from 'next/navigation';
import { AxiosError } from 'axios';

import ViewInfo from '@components/common/ViewInfo';

import { ServerStatusCode } from '@constants/enums';
import { pageRouters } from '@constants/routers';
import { ERROR_COMMON_MESSAGE } from '@constants/message';

import { useToast } from '@providers/ToastProvider';
import useDetailTerm from '@hooks/useDetailTerm';
import { renderDate } from '@utils';
import 'react-quill/dist/quill.snow.css';

const TermDetail = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  const { termDetail } = useDetailTerm({
    termId: params.id,
    onError: (error: AxiosError) => {
      if (error.response?.status === ServerStatusCode.NOT_FOUND) {
        router.push(pageRouters.TERMS_MANAGEMENT.href);
        showToast({
          variant: 'error',
          description: ERROR_COMMON_MESSAGE,
        });
      }
    },
  });

  return (
    <div className="w-full bg-white flex flex-col gap-4">
      <ViewInfo label="タイトル">{termDetail?.title} </ViewInfo>
      <ViewInfo label="有効期間開始日">
        {termDetail && termDetail.periodStart
          ? renderDate(`${termDetail.periodStart}`)
          : '未設定'}{' '}
      </ViewInfo>
      <ViewInfo label="有効期間終了日">
        {termDetail && termDetail.periodEnd
          ? renderDate(`${termDetail.periodEnd}`)
          : '未設定'}{' '}
      </ViewInfo>
      <ViewInfo label="ステータス">{`${termDetail?.status}`} </ViewInfo>
      <ViewInfo label="内容">
        <p
          className="quill-editor ql-editor custom-quill-text ml-[-15px] max-w-[80vw]"
          dangerouslySetInnerHTML={{
            __html: termDetail?.description ? `${termDetail?.description}` : '',
          }}></p>
      </ViewInfo>
    </div>
  );
};

export default TermDetail;
