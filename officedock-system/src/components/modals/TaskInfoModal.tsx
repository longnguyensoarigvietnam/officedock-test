import { memo, useEffect, useRef } from 'react';
import { isSameDay } from 'date-fns';
import { useSession } from 'next-auth/react';

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
          <div className="flex gap-1 justify-end mb-3 items-center">
            {session?.user.permissions &&
              hasPermissionInArray(
                session?.user.permissions,
                PermissionsSystem.MY_TASK_UPDATE,
              ) && (
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
              )}
            {session?.user.permissions &&
              hasPermissionInArray(
                session?.user.permissions,
                PermissionsSystem.MY_TASK_DELETE,
              ) && (
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
          <div className="mb-3 bg-[#EBF1F4] relative pl-2 py-2 rounded-md">
            <p className="font-medium !break-words w-[90%] min-h-6">
              {dataTask?.title}
            </p>
            <ImageRound
              className="scale-[0.5] text-xs ml-auto absolute top-0 right-0 hover:cursor-pointer"
              src="/icons/three-dots-vertical.svg"
              border="full"
              name="Three dots vertical"
            />
          </div>
          <div className="flex">
            <p className="pl-2">
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
              <p className="pl-2">
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
