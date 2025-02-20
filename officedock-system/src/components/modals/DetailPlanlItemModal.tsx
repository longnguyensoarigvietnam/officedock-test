import React, {
  Dispatch,
  MutableRefObject,
  SetStateAction,
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
  convertToCurrentTimezone,
  formatShowDeadlineTask,
  formatTime24h,
} from '@utils/date';
import { TaskContext } from '@providers/TaskProvider';
import { useMutation, useQueryClient } from 'react-query';
import useCalculateDurationTask from '@hooks/useCalculateDurationTask';
import api from '@base/api';
import { apiRouters } from '@constants/routers';
import WarningStartTaskModal from './WarningStartTaskModal';

type Props = {
  popoverInfo: DataDetailTaskType;
  isStart: boolean;
  popoverRef: MutableRefObject<HTMLDivElement | null>;
  onClose: () => void;
  deletePlanTask: (uuid: string) => void;
  deleteActualTask: (uuid: string) => void;
  copyPlanTime: (uuid: string) => void;
  handleUpdateItemStart: (data: {
    id: string;
    isStart: boolean;
    type: string;
  }) => void;
  setIsStartPopupDetail: Dispatch<SetStateAction<boolean>>;
};

const DetailPlanItemModal = ({
  popoverInfo,
  popoverRef,
  isStart,
  onClose,
  deletePlanTask,
  deleteActualTask,
  handleUpdateItemStart,
  setIsStartPopupDetail,
}: Props) => {
  const { setIdTaskEditSelected } = useContext(TaskContext);
  const [isShowAction, setIsShowAction] = useState(false);
  const [checkDeadline, setCheckDeadline] = useState<boolean>(false);
  const [showWarningStartModal, setShowWarningStartModal] =
    useState<boolean>(false);

  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams);
  const router = useRouter();

  const {
    idTaskStarting,
    taskSelectedToStart,
    setDataRunning,
    setDataClickTask,
    setIdTaskStarting,
    setTaskSelectedToStart,
    setTaskSelectedAction,
    setTaskSelected,
    setDataActualAddSchedule,
  } = useContext(TaskContext);

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

  const queryClient = useQueryClient();

  const { calculateDurationTask } = useCalculateDurationTask({
    onSuccess: (response) => {
      const data = response.data;
      setIsStartPopupDetail(!isStart);
      taskSelectedToStart &&
        queryClient.refetchQueries([
          'getTaskDurationDetail',
          {
            id: `${taskSelectedToStart.id}`,
            type: `${taskSelectedToStart.type}`,
          },
        ]);
      handleUpdateItemStart({
        id: `${popoverInfo?.taskId}`,
        isStart: !isStart,
        type: ItemStartType.TASK,
      });

      taskSelectedToStart &&
        setTaskSelected({
          label: taskSelectedToStart?.title,
          value:
            taskSelectedToStart.type === ItemStartType.TASK
              ? taskSelectedToStart.id
              : `${taskSelectedToStart.id}event`,
          type: taskSelectedToStart.type,
        });
      queryClient.refetchQueries(['getTaskHeaderStart']);
      queryClient.refetchQueries(['getDataTaskHeaderList']);

      if (data) {
        const startDateActual = new Date(
          convertToCurrentTimezone(`${data.planStartDate}`),
        );
        const endDateActual = new Date(
          convertToCurrentTimezone(`${data.planEndDate}`),
        );
        setDataActualAddSchedule({
          ...data,
          start: startDateActual,
          end: endDateActual,
          id: data.id.toString(),
          startEditable: false,
          resourceId: ItemScheduleType.ACTUAL,
          type: ItemStartType.TASK,
          isMyTask: false,
        });
        if (!data.isStart) {
          queryClient.refetchQueries(['getDataTaskHeaderList']);
        }
      }
    },
  });
  // Handle call API check start task
  const handleCheckStartTask = async ({
    id,
    type,
  }: {
    id: string;
    type: string;
  }) => {
    return await api.post(apiRouters.TASK_CHECK_START(), {
      id,
      type,
    });
  };
  // Function call API  check start task
  const { mutate: checkTask } = useMutation(
    'postCheckStartTaskSchedule',
    handleCheckStartTask,
    {
      onSuccess: async ({ data }, task) => {
        if (!data.isAnotherTaskStarted) {
          calculateDurationTask({
            id: `${popoverInfo.taskId}`,
            type: ItemStartType.TASK,
          });
          setTaskSelectedAction({
            id: popoverInfo.taskId,
            isStart: !isStart,
            title: popoverInfo.title,
            type: ItemStartType.TASK,
          });
          setDataRunning({
            id: `${popoverInfo.taskId}`,
            type: ItemStartType.TASK,
          });
        } else {
          setDataClickTask({
            id: task.id,
            type: task.type,
          });
          setIdTaskStarting({
            id: data.id,
            type: data.type,
          });
          setShowWarningStartModal(true);
        }
      },
      onError: () => {},
      onSettled: () => {},
    },
  );

  // Action call API check start task
  const handleConfirmCheckStartTask = (id: string) => {
    checkTask({
      id: id,
      type: ItemStartType.TASK,
    });
  };

  const handleStartStopTask = async (e: any) => {
    e.stopPropagation();

    await new Promise<void>((resolve) => {
      setTaskSelectedToStart({
        id: parseInt(`${popoverInfo.taskId}`),
        title: popoverInfo.title,
        type: ItemStartType.TASK,
      });
      resolve();
    });
    handleConfirmCheckStartTask(`${popoverInfo.taskId}`);
  };

  const handleConfirmStartNewTask = async () => {
    handleUpdateItemStart({
      id:
        idTaskStarting.type === ItemStartType.TASK
          ? `${idTaskStarting.id}`
          : `${idTaskStarting.id}event`,
      isStart: false,
      type: idTaskStarting.type,
    });
    calculateDurationTask({
      id: `${popoverInfo.taskId}`,
      type: ItemStartType.TASK,
    });
    setShowWarningStartModal(false);

    setDataRunning({
      id: `${popoverInfo.id.replace('event', '')}`,
      type: ItemStartType.TASK,
    });
  };

  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
            <span className="text-[#77858F] text-xs font-medium">
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
            <div className="relative">
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
              <ImageRound
                src={`/icons/${isStart ? 'pause' : 'play'}.svg`}
                name="Start task"
                className="absolute  w-[26px] h-[26px] bottom-0 right-2  hover:cursor-pointer"
                onClick={handleStartStopTask}
              />
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
          {showWarningStartModal && (
            <WarningStartTaskModal
              open={showWarningStartModal}
              type={
                idTaskStarting.type === ItemStartType.TASK ? 'タスク' : '予定'
              }
              onClose={() => {
                setShowWarningStartModal(false);
              }}
              onConfirm={handleConfirmStartNewTask}
            />
          )}
        </div>
      )}
    </>
  );
};

export default DetailPlanItemModal;
