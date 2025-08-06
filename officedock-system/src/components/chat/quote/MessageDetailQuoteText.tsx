import React from 'react';

import { ChatDashboardMember, ChatMessageResponse } from '@interfaces/chat';
import ImageRound from '@components/common/ImageRound';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import {
  convertToCurrentTimezone,
  formatCheckDate,
  getFormattedDateTime,
} from '@utils/date';

type Props = {
  messageDetail: ChatMessageResponse;
  dashboardMembers: ChatDashboardMember[];
  title: string;
  uuidQuote: string;
};

const MessageDetailQuoteText = ({
  messageDetail,
  dashboardMembers,
  title,
  uuidQuote,
}: Props) => {
  // Render avatar
  const renderAvatar = (senderId: number) => {
    const memberInfo = dashboardMembers.find(
      (member) => member.id === senderId,
    );

    return (
      <div className="h-6 flex items-center gap-2">
        <ImageRound
          className="w-fit h-fit"
          name="Quote icon"
          src="/icons/quotation.svg"
        />
        <CustomUserAvatar
          avatarUrl={memberInfo?.avatarUrl || ''}
          avatarColor={memberInfo?.avatarColor || ''}
          size={22}
        />
      </div>
    );
  };
  return (
    <div
      className={`flex flex-col border border-[#D2DBE1] p-5 bg-white rounded-md !box-border group-hover:bg-[#FFFFFF] py-3 ml-5 mr-3 group-hover:rounded-md`}>
      {renderAvatar(messageDetail.sender.id)}
      <div className={`ml-3 !w-full`}>
        <div className="flex w-full gap-2 items-baseline pb-2">
          <div className="flex w-fit  gap-2 items-baseline font-semibold text-[15px] pr-2">
            <div className="w-fit min-w-0 break-all text-[13px] text-[#77858F] whitespace-normal line-clamp-3">
              {messageDetail.sender.fullName}
              <span className="font-medium text-xs text-[#77858F]">
                {' '}
                {messageDetail.sender?.organizations?.name}
              </span>
            </div>
          </div>
          <div className={`flex items-start w-fit flex-shrink-0`}>
            <p className="font-medium text-xs text-[#77858F] text-right min-w-[90px]">
              {messageDetail.createdAt &&
                formatCheckDate(
                  getFormattedDateTime(
                    convertToCurrentTimezone(messageDetail.createdAt),
                  ),
                )}
            </p>
          </div>
        </div>
      </div>
      <p
        data-id={uuidQuote}
        className={`text-chat-box font-normal text-sm hover:cursor-pointer max-w-full -ml-1 p-1 rounded-[5px]  `}>
        {title}
      </p>
    </div>
  );
};

export default MessageDetailQuoteText;
