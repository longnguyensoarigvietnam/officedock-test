import ImageRound from '@components/common/ImageRound';

import { TemplateAction, TemplateVariant } from '@constants/enums';

export const TemplateItem = ({
  templateName,
  templateId,
  className,
  variant = TemplateVariant.DATA,
  action,
  templateNameStyle,
  onClick,
  onEdit,
}: {
  templateName?: string;
  templateId?: number;
  className?: string;
  variant?: TemplateVariant;
  action?: TemplateAction;
  templateNameStyle?: string;
  onClick?: (id?: number | undefined) => void;
  onEdit?: (id: number) => void;
}) => (
  <div
    style={{
      boxShadow: '0px 2px 8px 0px #0000001A',
    }}
    className={`relative min-w-[200px] !max-w-[200px] h-[55px] p-3 mb-3 rounded-[50px] bg-white flex items-center  hover:cursor-pointer  ${TemplateVariant.EMPTY ? '!border-dotted !border-[#D5DCE0]' : 'border-transparent shadow-common'} ${className}`}
    onClick={() => onClick?.(templateId ?? undefined)}>
    <div
      className={`rounded-full p-[6px] w-fit border-[1px] ${TemplateVariant.EMPTY ? 'bg-transparent border-dotted border-[#D5DCE0]' : 'bg-gray-200 border-transparent'}`}>
      <ImageRound
        src={`/icons/${variant == TemplateVariant.EMPTY ? 'add-gray' : 'add'}.svg`}
        name="Add"
        className="!w-3 !h-3"
      />
    </div>
    {templateName && (
      <p
        className={`text-sm font-medium ml-2 ${variant != TemplateVariant.EMPTY ? '!max-w-[calc(100%_-_50px)]' : ''} max-h-[50px] break-all line-clamp-2 overflow-hidden ${action == TemplateAction.CREATE && 'text-[#77858F]'} ${templateNameStyle}`}>
        {templateName}
      </p>
    )}
    <div className="ml-auto">
      {action != TemplateAction.CREATE && action != TemplateAction.DEFAULT && (
        <ImageRound
          src="/icons/edit-gray.svg"
          name="Edit icon"
          className="!w-3.5 !h-3.5 opacity-30"
          onClick={(e) => {
            e.stopPropagation();
            onEdit && onEdit(Number(templateId));
          }}
        />
      )}
    </div>
  </div>
);
