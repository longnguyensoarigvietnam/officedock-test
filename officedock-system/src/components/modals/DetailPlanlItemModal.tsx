import React, {
  MutableRefObject,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import ImageRound from '@components/common/ImageRound';
import { ActionTask, ItemScheduleType, ItemStartType } from '@constants/enums';
import { DataDetailTaskType } from '@interfaces/task';
import {
  compareWithCurrentDate,
  formatShowDeadlineTask,
  formatTime24h,
} from '@utils/date';
import { TaskContext } from '@providers/TaskProvider';

type Props = {
  popoverInfo: DataDetailTaskType | null;
  popoverRef: MutableRefObject<HTMLDivElement | null>;
  onClose: () => void;
  deletePlanTask: (uuid: string) => void;
  deleteActualTask: (uuid: string) => void;
  copyPlanTime: (uuid: string) => void;
};

const DetailPlanItemModal = ({
  popoverInfo,
  popoverRef,
  onClose,
  deletePlanTask,
  deleteActualTask,
}: Props) => {
  const { setIdTaskEditSelected } = useContext(TaskContext);
  const [isShowAction, setIsShowAction] = useState(false);
  const [checkDeadline, setCheckDeadline] = useState<boolean>(false);

  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams);
  const router = useRouter();

  const handleSetParam = ({
    id,
    action,
  }: {
    id: string | null;
    action: string;
  }) => {
    if (id) {
      params.set('task', id);
    }
    params.set('type', ItemStartType.TASK);
    params.set('action', action);
    router.push(`?${params.toString()}`);
  };

  useEffect(() => {
    if (popoverInfo && popoverInfo.deadline) {
      setCheckDeadline(compareWithCurrentDate(popoverInfo.deadline));
    }
  }, [popoverInfo]);

  return (
    <>
      {popoverInfo && (
        <div
          className={`w-[250px] z-[10] relative h-fit rounded-md pl-5 pr-[10px] pt-[10px] pb-5 bg-white`}
          ref={popoverRef}
          style={{
            position: 'absolute',
            top: `${popoverInfo ? popoverInfo.top : 0}px`,
            left: `${popoverInfo ? popoverInfo.left : 0}px`,
            boxShadow: '0px 2px 8px 0px #0000001A',
          }}>
          <div className="flex justify-between items-center">
            <span>
              {popoverInfo.resource === ItemScheduleType.PLANS
                ? '予定'
                : '実績'}
            </span>
            <div className="flex gap-x-[6px] items-center justify-center">
              <div
                onClick={() => setIsShowAction(!isShowAction)}
                className={`rounded-full cursor-pointer w-6 h-6  flex items-center justify-center bg-[#E3EAED]`}>
                <ImageRound
                  src={`/icons/more-black.svg`}
                  name="more"
                  className="w-fit h-fit"
                />
              </div>
              <div
                style={{
                  padding: '5px',
                }}
                onClick={onClose}
                className={`rounded-full cursor-pointer w-6 h-6 bg-[#E3EAED]`}>
                <ImageRound
                  src={`/icons/close-black.svg`}
                  name="close"
                  className="w-fit h-fit"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-x-1 items-center mt-[10px]">
            <div
              style={{
                backgroundColor: popoverInfo.largeColor,
              }}
              className="w-3 h-3 rounded-sm"></div>
            <span className="text-black font-bold text-base">
              {popoverInfo.title}
            </span>
          </div>
          <div className="text-[#77858F] text-xs  font-medium flex items-center gap-x-[6px] mt-4">
            <div className="flex gap-1 items-center">
              <span>開始</span>
              <span className="text-base font-normal text-black">
                {formatTime24h(popoverInfo.start)}
              </span>
            </div>
            <p>~</p>
            <div className="flex gap-1 items-center">
              <span>終了</span>
              <span className="text-base font-normal text-black">
                {formatTime24h(popoverInfo.end)}
              </span>
            </div>
          </div>

          {/* Important & deadline */}
          {popoverInfo.resource === ItemScheduleType.PLANS && (
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-[10px] pt-[10px]">
                  {popoverInfo.isImportant ? (
                    <div className="flex w-9 h-5 text-xs items-center justify-center font-medium text-[#0068B6] bg-[#DFE6EA] rounded">
                      重要
                    </div>
                  ) : null}
                  <p className="flex gap-2 items-center text-[13px]">
                    締切
                    <span
                      className={`hover:cursor-pointer font-normal ${checkDeadline && 'text-[#0068B6]'}`}>
                      {popoverInfo.deadline &&
                        formatShowDeadlineTask(popoverInfo.deadline)}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action detail */}
          {isShowAction && popoverInfo.resource === ItemScheduleType.PLANS && (
            <div className="absolute top-10 right-[-105px] bg-[#5B6770] w-[168px] rounded-md py-[6px] text-white font-medium text-sm">
              <p
                // TODO: BE update with QA
                // onClick={() => copyPlanTime(popoverInfo.uuid)}
                className="py-[10px] px-[14px] hover:bg-[#7D8A94] cursor-pointer">
                予定内のタスクを複製
              </p>
              <p
                onClick={() => deletePlanTask(popoverInfo.uuid)}
                className="py-[10px] px-[14px] hover:bg-[#7D8A94] cursor-pointer">
                予定からタスクを削除
              </p>
              <p
                onClick={() => {
                  setIdTaskEditSelected(`${popoverInfo.taskId}`);
                  handleSetParam({
                    id: `${popoverInfo.taskId}`,
                    action: ActionTask.EDIT,
                  });
                  onClose();
                }}
                className="py-[10px] px-[14px] hover:bg-[#7D8A94] cursor-pointer">
                タスクを編集
              </p>
            </div>
          )}
          {isShowAction && popoverInfo.resource === ItemScheduleType.ACTUAL && (
            <div className="absolute top-10 right-[-105px] bg-[#5B6770] w-[126px] rounded-md py-[6px] text-white font-medium text-sm">
              <p
                onClick={() => deleteActualTask(popoverInfo.uuid)}
                className="py-[10px] px-[14px] hover:bg-[#7D8A94] cursor-pointer">
                この実績を削除
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default DetailPlanItemModal;
