import { memo, useEffect, useRef } from 'react';
import { isSameDay } from 'date-fns';
import { useSession } from 'next-auth/react';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';

import ImageRound from '@components/common/ImageRound';

import { Task } from '@interfaces/task';
import { formatShowDeadline, getTimeRangeForClickDate } from '@utils/date';
import { PermissionsSystem } from '@constants/enums';
import { hasPermissionInArray } from '@utils';

export type TaskInfoModalProps = {
  top?: number;
  left?: number;
  selectedTaskScheduleId?: string;
  onClose: () => void;
  onEdit?: (values: Task) => void;
  onDelete?: (values: Task) => void;
  dataTask?: Task | null;
};

const TaskInfoModal = memo(
  ({
    top,
    left,
    selectedTaskScheduleId,
    dataTask,
    onEdit,
    onDelete,
    onClose,
  }: TaskInfoModalProps) => {
    const popoverRef = useRef<HTMLDivElement | null>(null);
    const { data: session } = useSession();

    const handleClosePopover = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    useEffect(() => {
      document.addEventListener('click', handleClosePopover, true);
      return () => {
        document.removeEventListener('click', handleClosePopover, true);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <div className="z-50 flex items-center justify-center">
        <div
          className="font-primary shadow-lg bg-white w-[330px] !rounded-2xl z-50 p-4"
          ref={popoverRef}
          style={{
            position: 'absolute',
            top: `${top}px`,
            left: `${left}px`,
          }}>
          <div className="flex items-center justify-between">
            <p className="font-medium text-xs text-[#77858F]">タスク</p>
            <div className="flex gap-1 justify-end items-center">
              {session?.user.permissions &&
                hasPermissionInArray(
                  session?.user.permissions,
                  PermissionsSystem.MY_TASK_UPDATE,
                ) && (
                  <Tippy
                    content={'タスクを編集'}
                    arrow={false}
                    delay={1000}
                    placement="top"
                    offset={[0, 5]}>
                    <div
                      className="hover:bg-[#EBF1F4] p-1.5 hover:rounded-full hover:cursor-pointer"
                      onClick={() => {
                        onEdit && onEdit(dataTask as Task);
                      }}>
                      <ImageRound
                        name="Edit"
                        src={'/icons/edit-task.svg'}
                        className="w-[16px] h-[16px] hover:cursor-pointer"
                      />
                    </div>
                  </Tippy>
                )}
              {session?.user.permissions &&
                hasPermissionInArray(
                  session?.user.permissions,
                  PermissionsSystem.MY_TASK_DELETE,
                ) && (
                  <Tippy
                    content={'タスクを削除'}
                    arrow={false}
                    delay={1000}
                    placement="top"
                    offset={[0, 5]}>
                    <div
                      className="hover:bg-[#EBF1F4] px-2 py-1.5 hover:rounded-full hover:cursor-pointer"
                      onClick={() => {
                        onDelete && onDelete(dataTask as Task);
                      }}>
                      <ImageRound
                        name="Delete"
                        src={'/icons/delete-task.svg'}
                        className="w-[13px] h-[16px] hover:cursor-pointer"
                      />
                    </div>
                  </Tippy>
                )}
              <div
                className="hover:bg-[#EBF1F4] p-1.5 hover:rounded-full hover:cursor-pointer"
                onClick={onClose}>
                <ImageRound
                  name="Close"
                  src={'/icons/close.svg'}
                  className="w-[18px] h-[18px] hover:cursor-pointer"
                />
              </div>
            </div>
          </div>
          <p className="font-bold text-[16px] mb-3  !break-words w-[90%] min-h-6">
            {dataTask?.title}
          </p>
          <div className="flex">
            <p className="">
              {dataTask?.taskSchedules.find(
                (taskSchedule) => taskSchedule.id == selectedTaskScheduleId,
              ) &&
                dataTask?.taskSchedules.find(
                  (taskSchedule) => taskSchedule.id == selectedTaskScheduleId,
                )?.planStartDate &&
                dataTask?.taskSchedules.find(
                  (taskSchedule) => taskSchedule.id == selectedTaskScheduleId,
                )?.planEndDate &&
                isSameDay(
                  new Date(
                    dataTask?.taskSchedules.find(
                      (taskSchedule) =>
                        taskSchedule.id == selectedTaskScheduleId,
                    )?.planStartDate || '',
                  ),
                  new Date(
                    dataTask?.taskSchedules.find(
                      (taskSchedule) =>
                        taskSchedule.id == selectedTaskScheduleId,
                    )?.planEndDate || '',
                  ),
                ) &&
                formatShowDeadline(
                  dataTask?.taskSchedules.find(
                    (taskSchedule) => taskSchedule.id == selectedTaskScheduleId,
                  )?.planStartDate || '',
                )}{' '}
            </p>
          </div>
          {dataTask &&
            dataTask.taskSchedules.find(
              (taskSchedule) => taskSchedule.id == selectedTaskScheduleId,
            ) &&
            dataTask.taskSchedules.find(
              (taskSchedule) => taskSchedule.id == selectedTaskScheduleId,
            )?.planStartDate &&
            dataTask.taskSchedules.find(
              (taskSchedule) => taskSchedule.id == selectedTaskScheduleId,
            )?.planEndDate && (
              <p className="">
                {getTimeRangeForClickDate(
                  new Date(
                    dataTask.taskSchedules.find(
                      (taskSchedule) =>
                        taskSchedule.id == selectedTaskScheduleId,
                    )?.planStartDate || '',
                  ),
                  new Date(
                    dataTask.taskSchedules.find(
                      (taskSchedule) =>
                        taskSchedule.id == selectedTaskScheduleId,
                    )?.planEndDate || '',
                  ),
                )}
              </p>
            )}
        </div>
      </div>
    );
  },
);

export default TaskInfoModal;
