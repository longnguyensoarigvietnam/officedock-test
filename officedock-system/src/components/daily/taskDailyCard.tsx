import React from 'react';
import { EventContentArg } from '@fullcalendar/core/index.js';
import {
  convertToTimeString,
  getMinuteDifference,
  isMoreThanSixtyMinutes,
} from '@utils/date';
import { generateVerticalGradient } from '@utils';

type Props = {
  event: EventContentArg;
  isDownload?: boolean;
};

const TaskDailyCard = ({ event, isDownload }: Props) => {
  const differentTime =
    event.timeText && isMoreThanSixtyMinutes(event.timeText);
  const largeColor = event.event?.extendedProps.largeColor;
  const isCalculate = event.event?.extendedProps.isCalculate;

  return (
    <>
      <div
        key={event.event.id}
        style={{
          background: largeColor
            ? generateVerticalGradient(largeColor)
            : '#A7B9C2',
        }}
        className={`h-full card-schedule item-schedule-shadow   text-white rounded-[14px]  flex justify-between overflow-hidden p-2 bg-white border`}>
        <div className="flex flex-col gap-3 w-[80%]">
          <p
            className={`text-sm font-bold truncate block w-full ${isDownload ? '-translate-y-[50%] h-8' : ''} `}>
            {event.event.title}
          </p>

          <div className="flex items-center gap-2 text-[11px]">
            {event.timeText && differentTime && !isCalculate && event && (
              <p
                className={`text-xs ${isDownload ? '-translate-y-[50%] h-8' : ''}`}>
                {event.timeText}
              </p>
            )}
            {!isCalculate && (
              <p className="break-all">
                {getMinuteDifference(event.timeText)}分
              </p>
            )}
            {isCalculate && (
              <p
                className={`text-xs ${isDownload ? '-translate-y-[50%] h-8' : ''}`}>
                {event.event?.extendedProps?.startedAt &&
                  convertToTimeString(
                    event.event?.extendedProps?.startedAt,
                  )}{' '}
                ~ 計測中
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default TaskDailyCard;
