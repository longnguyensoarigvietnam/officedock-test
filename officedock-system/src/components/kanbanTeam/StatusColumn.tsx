import React, { useState } from 'react';
import { Draggable, Droppable } from '@hello-pangea/dnd';

import ItemTeam from './ItemTeam';
import ImageRound from '@components/common/ImageRound';

import { StatusTask } from '@constants/enums';
import { TransformedStatuses, TransformedUser } from '@interfaces/task';

type Props = {
  user: TransformedUser;
  status: keyof TransformedStatuses;
};

const StatusColumn = ({ user, status }: Props) => {
  const [isExtendData, setIsExtendData] = useState(true);
  function getStatusColor(statusKey: string): string {
    const status = StatusTask[statusKey as keyof typeof StatusTask];

    switch (status) {
      case StatusTask.NOT_STARTED:
        return '!bg-[#A3EBF0]';
      case StatusTask.IN_PROGRESS:
        return '!bg-[#92E9AF]';
      case StatusTask.CONFIRMING:
        return '!bg-[#FCCF79]';
      case StatusTask.COMPLETED:
        return '!bg-[#F58383]';
      case StatusTask.MY_ROUTINE:
        return '!bg-[#EBF1F7]';
      default:
        return '';
    }
  }
  return (
    <Droppable droppableId={`${user.id}-${status}`}>
      {(provided) => (
        <div ref={provided.innerRef} {...provided.droppableProps}>
          <div className="flex items-center justify-between pr-[10px]">
            <div
              style={{
                gap: `6px`,
              }}
              className="flex items-center text-sm break-all font-medium mb-[14px] ">
              <span
                className={`w-[10px] h-[10px] rounded-full ${status && getStatusColor(status)}`}></span>
              <span>
                {status && StatusTask[status as keyof typeof StatusTask]}
              </span>
              <span className="font-medium text-sm text-[#77858F]">12</span>
            </div>
            <div onClick={() => setIsExtendData(!isExtendData)}>
              <ImageRound
                src={`/icons/extend-column.svg`}
                className={`${isExtendData ? 'rotate-90' : '-rotate-90'} cursor-pointer`}
                name="extend"
                style={{
                  width: `8px`,
                  height: `12px`,
                }}
              />
            </div>
          </div>
          {isExtendData && (
            <div
              style={{
                paddingRight: '10px',
                boxShadow: `inset -${(247 / 247) * 16}px 0 0 #EBF1F7`,
              }}
              className="min-h-[130px] max-h-[420px] overflow-y-auto">
              {user.statuses[status].map((task, index) => (
                <Draggable
                  key={task.id}
                  draggableId={String(task.id)}
                  index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className="">
                      <ItemTeam
                        id={String(task.id)}
                        index={index}
                        content={task}
                        handleActionEditTask={() => {}}
                        handleConfirmCopyTask={() => {}}
                        handleUpdateItemInline={() => {}}
                        editTask={() => {}}
                        handlePinItem={() => {}}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </div>
      )}
    </Droppable>
  );
};

export default StatusColumn;
