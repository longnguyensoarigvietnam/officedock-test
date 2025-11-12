'use client';
import { Controller, useForm } from 'react-hook-form';
import { useContext, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import ImageRound from '@components/common/ImageRound';
import { DynamicTooltip } from '@components/tooltip/DynamicTooltip';
import Dropdown from '@components/common/Dropdown';
import ClockIconColor from '@components/custom/ClockIconColor';

import {
  EventWorkCategory,
  StatusValueTask,
  TaskRepetitiveValue,
} from '@constants/enums';
import { Task, TaskFormData } from '@interfaces/task';

import {
  compareWithCurrentDate,
  convertToTimeString,
  formatShowDeadlineTask,
  getJapaneseWeekDay,
} from '@utils/date';
import { TaskTeamStateContext } from '@providers/TaskTeamProvider';
import { NO_SETTING } from '@constants';

interface ItemProps {
  id: string;
  index: number;
  content: Task;
  userColumn: string;
  handleActionEditTask: (id: number) => void;
  handleConfirmCopyTask: (id: number) => void;
  handleUpdateItemInline: (data: Task) => void;
  editTask: (data: {
    status: string;
    task: number;
    oldIdStatus: string;
    oldNameStatus: string;
  }) => void;
  handlePinItem: (id: string) => void;
  handleUnPinItem: (id: string) => void;
  updateTaskIsStart: (taskId: number, isPause?: boolean) => void;
  disableDraggable?: boolean;
}
const ItemTeam = ({
  content,
  userColumn,
  editTask,
  handlePinItem,
  handleUnPinItem,
  handleActionEditTask,
}: ItemProps) => {
  const {
    columnWidth,
    selectedOptionZoom,
    dataOptionsStatus,
    setOldUserAction,
  } = useContext(TaskTeamStateContext);

  let statusStyle = '';

  // TODO: Because the number of states can change.
  // So, determining the color code from the enum is unreasonable.
  // This is a temporary solution as there is no defined color code, this will be changed and updated
  switch (content.status && content.status.id) {
    case StatusValueTask.NOT_STARTED:
      statusStyle = '!bg-[#A3EBF0]';
      break;
    case StatusValueTask.IN_PROGRESS:
      statusStyle = '!bg-[#92E9AF]';
      break;
    case StatusValueTask.CONFIRMING:
      statusStyle = '!bg-[#FCCF79]';
      break;
    case StatusValueTask.COMPLETED:
      statusStyle = '!bg-[#F58383]';
      break;
    case StatusValueTask.MY_ROUTINE:
      statusStyle = '!bg-[#EBF1F7]';
      break;
    default:
      break;
  }

  const {
    watch,
    control,
    reset,
    formState: { errors },
  } = useForm<TaskFormData>({
    mode: 'onSubmit',
  });

  const searchParams = useSearchParams();

  const taskDetailId = searchParams.get('task');

  const [checkDeadline, setCheckDeadline] = useState<boolean>(false);

  const defaultValues = useMemo<TaskFormData>(() => {
    const value: TaskFormData = {
      title: '',
      statusId: {
        label: '',
        value: '',
      },
      priority: {
        label: '',
        value: '',
      },
      peopleInChargeIds: [],
      categories: {
        LARGE: {
          label: '',
          value: '',
        },
        MEDIUM: {
          label: '',
          value: '',
        },
        SMALL: {
          label: '',
          value: '',
        },
      },
      isImportant: false,
      plans: null,
    };
    if (content) {
      (value.title = content.title),
        (value.statusId = {
          label: (content.status && content.status.name) || '',
          value: (content.status && content.status.id) || '',
        });
    }
    return value;
  }, [content]);

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  useEffect(() => {
    if (content && content.deadline) {
      setCheckDeadline(compareWithCurrentDate(content.deadline));
    }
  }, [content]);

  const isShowSchedule = content.isScheduleInToday || false;

  const [isClicked, setIsClicked] = useState(false);

  const handleClick = () => {
    if (isClicked) return;
    if (content.isCrossTeamTask) return;

    setOldUserAction({
      id: String(userColumn),
      statusId: content.status?.id as number,
      statusName: content.status?.name as string,
    });

    setIsClicked(true);
    handleActionEditTask(parseInt(`${content.id}`));

    setTimeout(() => setIsClicked(false), 2000);
  };

  const largeColor =
    content.categories &&
    content.categories.find((item) => item.type === EventWorkCategory.LARGE)
      ?.color;
  const largeCategory =
    (content.categories &&
      content.categories.find((item) => item.type === EventWorkCategory.LARGE)
        ?.name) ||
    NO_SETTING;

  const displayRoutineTaskScheduleTitle = (item: Task) => {
    let title = '';
    const repeatStartTime = item.planStartDate
      ? convertToTimeString(item.planStartDate)
      : '';
    const repeatEndTime = item.planEndDate
      ? convertToTimeString(item.planEndDate)
      : '';
    switch (item.repeatType) {
      case TaskRepetitiveValue.ONCE:
        title = '';
        break;
      case TaskRepetitiveValue.DAILY:
        title = '毎日' + repeatStartTime + '~' + repeatEndTime;
        break;
      case TaskRepetitiveValue.WEEKLY:
        title =
          '毎週' +
          getJapaneseWeekDay(Number(item.weekDay || 0)) +
          '曜日' +
          repeatStartTime +
          '~' +
          repeatEndTime;
        break;
      case TaskRepetitiveValue.MONTHLY:
        title =
          '毎月' + item.monthDay + '日' + repeatStartTime + '~' + repeatEndTime;
        break;
      case TaskRepetitiveValue.YEARLY:
        title =
          '毎年' +
          item.month +
          '月' +
          item.monthDay +
          '日' +
          repeatStartTime +
          '~' +
          repeatEndTime;
        break;
    }
    return title;
  };

  return (
    <>
      {selectedOptionZoom.value !== 25 ? (
        <div>
          <div
            className={`relative ${content.status?.id === StatusValueTask.MY_ROUTINE && 'min-h-[81px]'} ${selectedOptionZoom.value !== 50 && 'gap-2'} ex-event-draggable   group border border-transparent no-show hover:border hover:border-[#BEC9CE] active:bg-[#EBF1F7]  hover:border-solid    bg-white shadow-common rounded-[20px] text-xs flex flex-col  mb-[14px] `}>
            <div className="relative w-[100%] h-full">
              <>
                <div
                  style={{
                    top: `${(columnWidth / 247) * 12}px`,
                    right: `${(columnWidth / 247) * 12}px`,
                  }}
                  onClick={() => {
                    if (content.pinAt) {
                      handleUnPinItem(`${content.id}`);
                    } else {
                      handlePinItem(`${content.id}`);
                    }
                  }}
                  className={`absolute   ${content.pinAt ? '' : 'opacity-0 group-hover:opacity-100'} `}>
                  <DynamicTooltip
                    content={content.pinAt ? 'ピンを外す' : 'ピン留め'}
                    placement="right">
                    <ImageRound
                      src={
                        content.pinAt
                          ? `/icons/pin-task.svg`
                          : `/icons/unpin-task.svg`
                      }
                      name="Pin icon"
                      style={{
                        width:
                          (selectedOptionZoom.value as number) > 75
                            ? '14px'
                            : (selectedOptionZoom.value as number) === 75
                              ? '12px'
                              : `10px`,
                        height:
                          (selectedOptionZoom.value as number) > 75
                            ? '14px'
                            : (selectedOptionZoom.value as number) === 75
                              ? '12px'
                              : `10px`,
                      }}
                      className=" text-gray-400 cursor-pointer"
                    />
                  </DynamicTooltip>
                </div>
              </>
            </div>
            <div
              style={{
                paddingTop: `${(columnWidth / 247) * 12}px`,
                paddingBottom: `${(columnWidth / 247) * 12}px`,
                paddingLeft: `${(columnWidth / 247) * 18}px`,
                paddingRight: `${(columnWidth / 247) * 12}px`,
              }}
              className={`flex flex-col gap-2`}
              onClick={() => {
                if (!taskDetailId) {
                  handleClick();
                }
              }}>
              <div className="flex gap-2 items-start">
                {isShowSchedule ? (
                  <div className="w-fit flex-shrink-0">
                    <ClockIconColor color={largeColor} />
                  </div>
                ) : (
                  <div
                    style={{ backgroundColor: largeColor || '#BFBFBF' }}
                    className="w-2 h-2 rounded-full mt-[5px] flex-shrink-0"></div>
                )}
                <p
                  style={{
                    width:
                      selectedOptionZoom.value !== 50
                        ? `${(columnWidth / 247) * 175}px`
                        : '85px',
                    fontSize:
                      (selectedOptionZoom.value as number) > 75
                        ? '14px'
                        : '12px',
                    minHeight:
                      (selectedOptionZoom.value as number) > 75
                        ? '20px'
                        : '18px',
                    marginRight: `${(columnWidth / 247) * 12}px`,
                  }}
                  className={`!border-none leading-[1.4] break-all line-clamp-2 cursor-pointer rounded-none bg-transparent !p-0 font-semibold  resize-none overflow-hidden focus:border-none focus:!rounded-none focus:shadow-none focus:!ring-offset-0 focus:!ring-0 focus:!ring-white`}>
                  {content.isCrossTeamTask
                    ? `${largeCategory}タスク`
                    : content.title}
                </p>
              </div>
              {content.status?.id == StatusValueTask.MY_ROUTINE && (
                <p className="text-[13px] font-normal">
                  {displayRoutineTaskScheduleTitle(content)}
                </p>
              )}
              {content.status?.id !== StatusValueTask.MY_ROUTINE && (
                <div className="flex items-center justify-between">
                  <div
                    style={{
                      paddingTop:
                        selectedOptionZoom.value !== 50
                          ? `${(columnWidth / 247) * 10}px`
                          : 0,
                      gap: `${(columnWidth / 247) * 10}px`,
                    }}
                    className="flex items-center">
                    {content.isImportant ? (
                      <div
                        style={{
                          width:
                            (selectedOptionZoom.value as number) > 75
                              ? '36px'
                              : '26px',
                          height:
                            (selectedOptionZoom.value as number) > 75
                              ? '20px'
                              : '15px',
                          fontSize:
                            (selectedOptionZoom.value as number) > 75
                              ? '12px'
                              : '9px',
                        }}
                        className="flex items-center justify-center font-medium text-primary bg-[#DFE6EA] rounded">
                        重要
                      </div>
                    ) : null}
                    <p
                      style={{
                        fontSize:
                          (selectedOptionZoom.value as number) > 75
                            ? '13px'
                            : '10px',
                      }}
                      className="flex gap-2 font-normal items-center">
                      締切
                      <span
                        className={`hover:cursor-pointer ${checkDeadline && 'text-primary'}`}>
                        {content.deadline &&
                          formatShowDeadlineTask(content.deadline)}
                      </span>
                    </p>
                  </div>
                </div>
              )}
              {selectedOptionZoom.value !== 50 &&
                content.status?.id != StatusValueTask.MY_ROUTINE && (
                  <div className="flex justify-between items-center mt-[2px]">
                    <DynamicTooltip content="ステータスを変更" placement="top">
                      <div
                        className="w-20 max-w-20 h-[21px] rounded"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}>
                        <Controller
                          control={control}
                          name={'statusId'}
                          render={({ field: { value, onChange } }) => (
                            <Dropdown
                              openByDefault
                              isStatusDropdown={true}
                              className={`!py-1 border-none disabled:opacity-100  !shadow-none ${statusStyle}`}
                              styleClass={{
                                fontSize:
                                  (selectedOptionZoom.value as number) > 75
                                    ? '12px'
                                    : '9px',
                                width:
                                  (selectedOptionZoom.value as number) > 75
                                    ? '70px'
                                    : '50px',
                                height:
                                  (selectedOptionZoom.value as number) > 75
                                    ? '22px'
                                    : '16px',
                                padding: `${(columnWidth / 247) * 6}px`,
                                gap: `${(columnWidth / 247) * 10}px`,
                                borderRadius: `${(columnWidth / 247) * 4}px`,
                              }}
                              classNameTextData={`!text-xs`}
                              classNameOption={`!text-xs !w-[120px]`}
                              classNameError={`!text-xs`}
                              styleClassOption={{
                                fontSize: '12px',
                              }}
                              disabled={
                                content.status?.id ===
                                  StatusValueTask.COMPLETED ||
                                content.isCrossTeamTask
                              }
                              options={
                                content.status?.id !== StatusValueTask.COMPLETED
                                  ? dataOptionsStatus.filter(
                                      (item) =>
                                        item.value !==
                                          StatusValueTask.COMPLETED &&
                                        item.value !==
                                          StatusValueTask.MY_ROUTINE,
                                    )
                                  : dataOptionsStatus.filter(
                                      (item) =>
                                        item.value !==
                                        StatusValueTask.MY_ROUTINE,
                                    )
                              }
                              selectedOption={dataOptionsStatus.find(
                                (element) => element.value === value?.value,
                              )}
                              onChange={(e) => {
                                if (
                                  (e.value !== StatusValueTask.COMPLETED &&
                                    content.status?.id ===
                                      StatusValueTask.COMPLETED) ||
                                  (e.value === StatusValueTask.COMPLETED &&
                                    content.status?.id !==
                                      StatusValueTask.COMPLETED)
                                ) {
                                  return;
                                } else {
                                  onChange(e);
                                  editTask({
                                    oldIdStatus: `${content.status?.id}`,
                                    status: watch('statusId')?.value as string,
                                    task: content.id,
                                    oldNameStatus: content.status?.name || '',
                                  });
                                }
                              }}
                              error={errors.statusId?.message}
                            />
                          )}
                        />
                      </div>
                    </DynamicTooltip>
                  </div>
                )}
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div
            className={`relative ex-event-draggable   group border border-transparent no-show hover:border hover:border-[#BEC9CE] active:bg-[#EBF1F7]  hover:border-solid   bg-white shadow-common rounded-md text-xs flex flex-col gap-2 mb-2 `}>
            <div
              style={{
                paddingTop: `${(columnWidth / 247) * 12}px`,
                paddingBottom: `${(columnWidth / 247) * 12}px`,
                paddingLeft: `${(columnWidth / 247) * 18}px`,
                paddingRight: `${(columnWidth / 247) * 12}px`,
              }}
              className={`flex flex-col gap-2`}
              onClick={() => {
                if (!taskDetailId) {
                  handleClick();
                }
              }}>
              <div className="flex gap-1 items-start">
                {isShowSchedule ? (
                  <div
                    style={{
                      width: `${(columnWidth / 247) * 20}px`,
                    }}
                    className="h-full">
                    <ImageRound
                      src="/icons/clock.svg"
                      name="Clock icon"
                      style={{
                        width: `10px`,
                        height: `10px`,
                        marginTop: `${(columnWidth / 247) * 5}px`,
                      }}
                      className="text-gray-400"
                    />
                  </div>
                ) : (
                  ''
                )}
                <p
                  style={{
                    width: isShowSchedule
                      ? `${(columnWidth / 247) * 130}px`
                      : `${(columnWidth / 247) * 160}px`,
                    fontSize: '12px',
                    marginRight: `${(columnWidth / 247) * 12}px`,
                  }}
                  className={`!border-none leading-[1.4] break-all line-clamp-2 cursor-pointer rounded-none bg-transparent !p-0 font-semibold  resize-none overflow-hidden focus:border-none focus:!rounded-none focus:shadow-none focus:!ring-offset-0 focus:!ring-0 focus:!ring-white`}>
                  {content.isCrossTeamTask
                    ? `${largeCategory}タスク`
                    : content.title}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ItemTeam;
