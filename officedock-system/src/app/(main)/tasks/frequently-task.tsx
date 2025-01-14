'use client';
import { Dispatch, SetStateAction, useContext } from 'react';
import { UseMutateFunction } from 'react-query';

import ImageRound from '@components/common/ImageRound';

import {
  CreationDataTask,
  Task,
  TaskErrorPerson,
  TaskRequest,
} from '@interfaces/task';
import { ResponseError } from '@interfaces/response';
import { Template } from '@interfaces/template';

import { TemplateAction } from '@constants/enums';
import { GlobalStateContext } from '@providers/GlobalStateProvider';
import { Transition } from '@headlessui/react';

const TemplateItem = ({
  templateName,
  templateId,
  className,
  variant = 'data',
  action,
  onClick,
  onEdit,
}: {
  templateName?: string;
  templateId?: number;
  className?: string;
  variant?: 'empty' | 'data';
  action?: TemplateAction;
  onClick?: (id?: number | undefined) => void;
  onEdit?: (id: number) => void;
}) => (
  <div
    className={`relative min-w-[230px] !max-w-[230px] h-[55px] p-3 mb-3 rounded-md bg-white flex items-center border-[1px] hover:cursor-pointer  ${variant === 'empty' ? '!border-dotted !border-[#D5DCE0]' : 'border-transparent shadow-common'} ${className}`}
    onClick={() => onClick?.(templateId ?? undefined)}>
    <div
      className={`rounded-full p-[6px] w-fit border-[1px] ${variant === 'empty' ? 'bg-transparent border-dotted border-[#D5DCE0]' : 'bg-gray-200 border-transparent'}`}>
      <ImageRound
        src={`/icons/${variant === 'empty' ? 'add-gray' : 'add'}.svg`}
        name="Add"
        className="!w-3 !h-3"
      />
    </div>
    {templateName && (
      <p
        className={`text-sm font-medium ml-2 !max-w-[calc(100%_-_50px)] max-h-[50px] text-ellipsis break-all overflow-hidden ${action == TemplateAction.CREATE && 'text-[#77858F]'}`}
        style={{
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}>
        {templateName}
      </p>
    )}
    {action != TemplateAction.CREATE && action != TemplateAction.DEFAULT && (
      <ImageRound
        src="/icons/edit-gray.svg"
        name="Edit icon"
        className="!w-3.5 !h-3.5 absolute top-3 right-3"
        onClick={(e) => {
          e.stopPropagation();
          onEdit && onEdit(Number(templateId));
        }}
      />
    )}
  </div>
);

const FrequentlyTask = ({
  setShowTemplateModal,
  templates,
  handleActionEditTemplate,
  handleCreateTaskFromTemplate,
  showFrequentlyTasks,
  setShowFrequentlyTasks,
}: {
  setShowModalTask: Dispatch<SetStateAction<boolean>>;
  setShowTemplateModal: Dispatch<SetStateAction<boolean>>;
  templates: Template[];
  showFrequentlyTasks: boolean;
  setShowFrequentlyTasks: Dispatch<SetStateAction<boolean>>;
  creationDataTaskData?: CreationDataTask;
  handleActionEditTemplate: (id: number) => void;
  handleActionEditTask: (id: number) => void;
  handleConfirmCopyTask: (id: number) => void;
  handleUpdateItemInline: (data: Task) => void;
  handleCreateTaskFromTemplate: (id?: number) => void;
  editTask: UseMutateFunction<
    Task,
    ResponseError<{
      detail: TaskErrorPerson;
    }>,
    TaskRequest,
    unknown
  >;
  frequentlyTasks: Task[];
  pinItemToTop: (itemId: string | number) => void;
}) => {
  const { isExtendCalendar } = useContext(GlobalStateContext);

  return (
    <div className={`w-fit`}>
      <div className={`${isExtendCalendar && 'overflow-y-hidden'} `}>
        <div className="flex gap-2">
          <p className="text-gray-500 text-xs">マイテンプレート</p>
          <ImageRound
            name="Filter extend icon"
            src={'/icons/arrow-down.svg'}
            className={`w-4 h-4 hover:cursor-pointer ${showFrequentlyTasks && 'rotate-180'}`}
            onClick={() => setShowFrequentlyTasks(!showFrequentlyTasks)}
          />
        </div>
        <Transition
          show={showFrequentlyTasks}
          enter="transition-transform duration-300 ease-out"
          enterFrom="transform -translate-y-[10%]"
          enterTo="transform translate-y-0"
          leave="transition-transform duration-150 ease-in"
          leaveFrom="transform translate-y-0"
          leaveTo="transform -translate-y-[10%]">
          <div className="flex mt-3 gap-5 overflow-x-auto max-w-[1270px] pr-3">
            {templates &&
              templates.length > 0 &&
              templates.map((template) => {
                return (
                  <TemplateItem
                    key={template.id}
                    templateName={template.title}
                    templateId={template.id}
                    onEdit={handleActionEditTemplate}
                    onClick={handleCreateTaskFromTemplate}
                  />
                );
              })}
            <TemplateItem
              variant="empty"
              templateName="新規テンプレートを作成"
              className="!w-[230px]"
              action={TemplateAction.CREATE}
              onClick={() => setShowTemplateModal(true)}
            />
          </div>
        </Transition>
      </div>
    </div>
  );
};

export default FrequentlyTask;
