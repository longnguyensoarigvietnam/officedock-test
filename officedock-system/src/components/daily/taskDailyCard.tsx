import React from 'react';
import { EventContentArg } from '@fullcalendar/core/index.js';
import { isMoreThanSixtyMinutes } from '@utils/date';

type Props = {
  event: EventContentArg;
  isDownload?: boolean;
};

const TaskDailyCard = ({ event, isDownload }: Props) => {
  const differentTime =
    event.timeText && isMoreThanSixtyMinutes(event.timeText);
  const largeColor = event.event?.extendedProps.largeColor;

  return (
    <>
      <div
        key={event.event.id}
        style={{
          backgroundColor: largeColor ? largeColor : 'white',
        }}
        className={`h-full card-schedule item-schedule-shadow   text-white rounded-md  flex justify-between overflow-hidden p-2 bg-white border`}>
        <div className="flex flex-col gap-3 w-[80%]">
          <p
            className={`text-sm font-bold truncate block w-full ${isDownload ? '-translate-y-[50%] h-8' : ''} `}>
            {event.event.title}
          </p>

          {event.timeText && differentTime && (
            <p
              className={`text-xs ${isDownload ? '-translate-y-[50%] h-8' : ''}`}>
              {event.timeText}
            </p>
          )}
        </div>
      </div>
    </>
  );
};

export default TaskDailyCard;
