import React, { useState } from 'react';
import { useMutation } from 'react-query';

import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import Button from '@components/common/Button';
import Modal from '@components/common/Modal';
import RowSkeleton from '@components/skeleton/RowSkeleton';

import useSurveyDetail from '@hooks/useSurveyDetail';
import { useUpdateSurveyDetailCache } from '@hooks/CacheQuery/useUpdateSurveyDetailCache';

import { ERROR_COMMON_MESSAGE } from '@constants/message';
import { apiRouters } from '@constants/routers';

import { useToast } from '@providers/ToastProvider';
import { useSessionCache } from '@providers/SessionCacheProvider';

import { formatShowDateJapanese } from '@utils/date';
import { getDaysUntil } from '@utils';
import api from '@base/api';

type Props = {
  open: boolean;
  detailId: string;
  isMySurvey: boolean;
  handleAnswerSurvey: (id: number) => void;
  onClose: () => void;
};

const ActionAnswerSurveyModal = ({
  open,
  detailId,
  isMySurvey,
  handleAnswerSurvey,
  onClose,
}: Props) => {
  const { showToast } = useToast();
  const { data: session } = useSessionCache();

  const [isMyCreate, setMyCreate] = useState(isMySurvey);

  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

  const { surveyDetail, isFetchingSurveyDetail } = useSurveyDetail({
    surveyId: detailId,
    onSuccess: (data) => {
      const selectedItem = data.questions.find((q) => q.isSelected);

      if (selectedItem) {
        setSelectedAnswer(selectedItem.id);
      }
      setMyCreate(data.createdBy.id == session?.user.id);
    },
  });
  const { updateSurveyQuestion } = useUpdateSurveyDetailCache();

  // Answer API
  const handleAnswerQuestion = async (id: number) => {
    return await api.post(apiRouters.ANSWER_QUESTION(detailId), { id });
  };

  const { mutate: answerQuestion } = useMutation(
    'postAnswerQuestion',
    handleAnswerQuestion,
    {
      onSuccess: (data, id) => {
        if (isMyCreate) {
          updateSurveyQuestion(detailId, id);
        }
      },
      onError: () => {
        showToast({
          variant: 'error',
          description: ERROR_COMMON_MESSAGE,
        });
        onClose();
      },
    },
  );

  const totalVotes = surveyDetail?.questions.reduce(
    (sum, o) => sum + o.selectedUserCount,
    0,
  );

  return (
    <Modal
      open={open}
      className="font-primary bg-white w-[500px] max-h-[620px] overflow-y-auto !rounded-[20px] py-10 px-[30px]"
      isOutSideAction={false}
      onClose={onClose}>
      <div className="text-center text-[18px] font-medium">アンケート</div>
      {isFetchingSurveyDetail && (
        <div className="mt-[30px] mb-5">
          <RowSkeleton numberOfRows={5} className="h-[44px]" />
        </div>
      )}
      {!isFetchingSurveyDetail && (
        <>
          <div className="mt-[30px]">
            <div className="text-[#77858F] text-[13px] font-medium flex items-center gap-[6px]">
              <p>実施日</p>
              <p className="text-black mr-[6px]">
                {surveyDetail?.createdAt &&
                  formatShowDateJapanese(surveyDetail.createdAt)}
              </p>
              {surveyDetail && surveyDetail.status.closed && (
                <Button
                  variant="outline"
                  className="w-[104px] h-[22px] !px-0 !bg-[#EBF1F7] !rounded-[3px] hover:opacity-80 !text-black text-xs font-normal !border-none ]">
                  受付終了
                </Button>
              )}
              {surveyDetail && surveyDetail.status.open && (
                <Button
                  variant="option"
                  className="w-[56px] h-[22px] !font-normal !px-0 !rounded-[3px] hover:opacity-80 !text-black text-xs !border-none !bg-[#FFEE6F]">
                  受付中
                </Button>
              )}
              {surveyDetail?.status.mySurvey && (
                <Button
                  variant="outline"
                  className="w-[104px] h-[22px] !px-0 !bg-[#EBF1F7] !rounded-[3px] hover:opacity-80 !text-black text-xs font-normal !border-none ]">
                  マイアンケート
                </Button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-[26px]">
            <div>
              <CustomUserAvatar
                avatarUrl={surveyDetail?.createdBy.avatar || ''}
                avatarColor={surveyDetail?.createdBy.avatarColor || ''}
                size={36}
              />
            </div>
            <p className="break-all line-clamp-2 text-base font-medium">
              {surveyDetail?.createdBy.fullName}
            </p>
          </div>
          {/* Question */}
          <div className="mt-4 font-medium text-base">
            <p
              dangerouslySetInnerHTML={{
                __html: surveyDetail?.title || '',
              }}></p>
            <div className="flex flex-col gap-[6px] mt-4">
              {surveyDetail?.questions?.map((question, idx) => {
                const percent = totalVotes
                  ? Math.round((question.selectedUserCount / totalVotes) * 100)
                  : 0;

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (
                        surveyDetail.status.open &&
                        selectedAnswer != question.id
                      ) {
                        answerQuestion(question.id);
                        setSelectedAnswer(question.id);
                        handleAnswerSurvey(surveyDetail.id);
                      }
                    }}
                    className={`${selectedAnswer == question.id && surveyDetail.status.open && !isMyCreate && 'bg-[#8DD1EE] !text-black'} relative min-h-[44px] flex items-center ${surveyDetail.status.open && 'cursor-pointer'}  justify-between rounded-md border border-[#77858F] overflow-hidden`}>
                    {/* Background color bar */}
                    {(surveyDetail.status.closed || isMyCreate) && (
                      <div
                        className={`absolute top-0 left-0 h-full ${
                          selectedAnswer == question.id
                            ? 'bg-[#8DD1EE]'
                            : percent > 0 && selectedAnswer
                              ? 'bg-[#ECF1F7]'
                              : 'bg-white'
                        }`}
                        style={{ width: `${percent}%` }}></div>
                    )}

                    {/* Content */}
                    <div className="relative flex-1 p-3 flex items-center justify-between z-10">
                      <p
                        dangerouslySetInnerHTML={{ __html: question.text }}
                        className={`text-sm break-all font-normal text-[#77858F] ${selectedAnswer == question.id && ' !text-black'}`}></p>
                      {(surveyDetail.status.closed || isMyCreate) && (
                        <span
                          className={`text-sm flex-shrink-0 ${
                            question.selectedUserCount === 0
                              ? isMyCreate
                                ? 'text-back'
                                : 'text-[#77858F]'
                              : 'text-black'
                          }`}>
                          {question.selectedUserCount}票
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}{' '}
            </div>
            {surveyDetail?.status.open && !isMyCreate && (
              <p className="text-[13px] font-normal mt-[8px]">
                残り{surveyDetail?.endAt && getDaysUntil(surveyDetail.endAt)}日
              </p>
            )}
            {(surveyDetail?.status.closed || isMyCreate) && (
              <p className="text-[13px] font-normal mt-[8px]">
                合計{totalVotes}票
              </p>
            )}
          </div>
        </>
      )}
      <div className="flex justify-center gap-3  items-center">
        <Button variant="text" onClick={onClose} className="">
          {surveyDetail?.status.open ? '投票する' : '閉じる'}
        </Button>
      </div>
    </Modal>
  );
};

export default ActionAnswerSurveyModal;
