'use client';
import { Dispatch, SetStateAction, useContext } from 'react';
import { Transition } from '@headlessui/react';

import { TemplateItem } from '@components/kanban/TemplateItem';
import ImageRound from '@components/common/ImageRound';
import { DynamicTooltip } from '@components/tooltip/DynamicTooltip';

import { Template } from '@interfaces/template';

import { TemplateAction, TemplateVariant } from '@constants/enums';

import { GlobalStateContext } from '@providers/GlobalStateProvider';

const FrequentlyTask = ({
  templates,
  showFrequentlyTasks,
  setShowTemplateModal,
  handleActionEditTemplate,
  handleCreateTaskFromTemplate,
  setShowFrequentlyTasks,
}: {
  templates: Template[];
  showFrequentlyTasks: boolean;
  setShowTemplateModal: Dispatch<SetStateAction<boolean>>;
  handleActionEditTemplate: (id: number) => void;
  handleCreateTaskFromTemplate: (id?: number) => void;
  setShowFrequentlyTasks: (value: boolean) => void;
}) => {
  const { isExtendCalendar } = useContext(GlobalStateContext);

  return (
    <div className={`w-fit`}>
      <div className={`${isExtendCalendar && 'overflow-y-hidden'} `}>
        <div
          className="flex gap-0 min-w-[130px] hover:cursor-pointer"
          onClick={() => setShowFrequentlyTasks(!showFrequentlyTasks)}>
          <p className="text-gray-500 text-xs break-all min-w-[95px]">
            マイテンプレート
          </p>
          <DynamicTooltip
            content={showFrequentlyTasks ? '閉じる' : '開く'}
            placement="top">
            <div>
              <ImageRound
                name="Filter extend icon"
                src={'/icons/arrow-down.svg'}
                className={`w-4 h-4 ${showFrequentlyTasks && 'rotate-180'}`}
              />
            </div>
          </DynamicTooltip>
        </div>
        <Transition
          show={showFrequentlyTasks}
          enter="transition-transform duration-300 ease-out"
          enterFrom="transform -translate-y-[10%]"
          enterTo="transform translate-y-0"
          leave="transition-transform duration-150 ease-in"
          leaveFrom="transform translate-y-0"
          leaveTo="transform -translate-y-[10%]">
          <div className="flex mt-3 gap-5 overflow-x-auto max-w-[1400px] !px-1 pt-[3px]">
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
              variant={TemplateVariant.EMPTY}
              templateName="テンプレートを新規作成"
              className="!w-[200px]"
              action={TemplateAction.CREATE}
              templateNameStyle="!text-xs"
              onClick={() => setShowTemplateModal(true)}
            />
          </div>
        </Transition>
      </div>
    </div>
  );
};

export default FrequentlyTask;
