'use client';

import { AxiosError } from 'axios';
import { useMutation } from 'react-query';
import { format } from 'date-fns';
import {
  Dispatch,
  Fragment,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useSession } from 'next-auth/react';
import { useInView } from 'react-intersection-observer';
import { v4 as uuidv4 } from 'uuid';
import { useRouter, useSearchParams } from 'next/navigation';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';

import RowSkeleton from '@components/skeleton/RowSkeleton';
import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';
import InputSearch from '@components/common/InputSearch';
import Quill from '@components/common/Quill';
import ActionsChatMembersModal from '@components/modals/ActionsChatMembersModal';
import ChatSettingModal from '@components/modals/ChatSettingModal';
import ConfirmDeleteModal from '@components/modals/ConfirmDeleteModal';
import ActionsTaskModal from '@components/modals/ActionsTaskModal';
import socketEventEmitter from '@components/socket/socketEventEmitter';
import ActionsEventModal from '@components/modals/ActionsEventModal';
import ConfirmActionsEventModal from '@components/modals/ConfirmActionsEventModal';

import { apiRouters, pageRouters } from '@constants/routers';
import {
  ADD_MEMBER_TASK_MESSAGE,
  CREATION_TASK_MESSAGE,
  DATE_FORMAT,
  DEFAULT_END_TIME,
  DEFAULT_START_TIME,
  DELETED_SKILL_UP_MESSAGE,
  EVENT_BEFORE_EDITED,
  EVENT_CREATED,
  EVENT_DELETED,
  EVENT_EDITED,
  MESSAGE_DELETED,
  NO_OPTION_CATEGORY,
  NO_SETTING,
  PAGINATION_PAGE_SIZE_HIGHT,
  REMOVE_MEMBER_TASK_MESSAGE,
  SKILL_UP_MESSAGE,
  TASK_DELETED,
} from '@constants';
import {
  SocketActions,
  ChatRoomType,
  ServerStatusCode,
  ActionTask,
  StatusValueTask,
  MessageType,
  ActionsEvent,
  EventWorkCategory,
  PermissionsSystem,
} from '@constants/enums';
import {
  ERROR_CREATE_MESSAGE,
  ERROR_DELETE_MESSAGE,
  ERROR_NOT_FOUND_EVENT,
  ERROR_UPDATE_MESSAGE,
  SUCCESS_DELETE_MESSAGE,
  SUCCESS_UPDATE_MESSAGE,
} from '@constants/message';

import useChatRoomDetail from '@hooks/useChatRoomDetail';
import useCreationDataEventCalendar from '@hooks/useCreationDataEventCalendar';
import {
  addTimeToDate,
  convertToCurrentTimezone,
  convertToTimeString,
  formatCheckDate,
  getCurrentTimeInJapan,
  getFormattedDateTime,
  getJapaneseDayName,
} from '@utils/date';
import {
  formatWithParagraphTags,
  hasPermissionInArray,
  showModalHeaderBackgroundColorByTime,
  trimUnnecessaryLineBreaks,
} from '@utils';
import {
  ChatDashboardMember,
  ChatMessageResponse,
  ChatParticipant,
  ChatRoomDetail,
  ChatRoomItem,
  WebSocketMessageData,
} from '@interfaces/chat';
import { BasePagination, OptionDropdownType } from '@interfaces/common';
import { EventEditFormData, EventRequest } from '@interfaces/calendar';
import { Profile } from '@interfaces/user';
import {
  CreationDataTask,
  Task,
  TaskFormData,
  TaskRequest,
} from '@interfaces/task';
import { ChatContext } from '@providers/ChatProvider';
import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';
import { GlobalStateContext } from '@providers/GlobalStateProvider';
import api from '@base/api';
import { useErrorToast } from '@hooks/useErrorToast';
import AvatarIconWithDynamicColor from '@components/common/AvatarIcon';

export type MessageDetailProps = {
  chatRoomDetail: ChatRoomDetail | undefined;
  messageDetail: ChatMessageResponse;
  messageSubmitted?: boolean;
  msgIdUpdated?: string;
  msgEditing?: string;
  roomDetail?: ChatRoomItem;
  setMsgIdUpdated?: Dispatch<SetStateAction<string | undefined>>;
  setMessageSubmitted?: Dispatch<SetStateAction<boolean>>;
  setOpenConfirmDeleteModal: Dispatch<SetStateAction<boolean>>;
  setMsgIdDeleted?: Dispatch<SetStateAction<string | undefined>>;
  setMsgEditing?: Dispatch<SetStateAction<string | undefined>>;
  handleConfirmUpdateMsg: (uuid: string) => void;
  handleConfirmGetDataDetailEvent: (id: string) => void;
};

const MessageDetail = ({
  chatRoomDetail,
  messageDetail,
  messageSubmitted,
  msgIdUpdated,
  msgEditing,
  setMsgIdUpdated,
  setOpenConfirmDeleteModal,
  setMessageSubmitted,
  setMsgIdDeleted,
  setMsgEditing,
  handleConfirmUpdateMsg,
  handleConfirmGetDataDetailEvent,
}: MessageDetailProps) => {
  const { data: session } = useSession();
  const router = useRouter();
  const handleOpenDeleteMsgModal = (id: string) => {
    setOpenConfirmDeleteModal(true);
    if (setMsgIdDeleted) {
      setMsgIdDeleted(id);
    }
  };
  const handleOpenEditForm = (id: string) => {
    if (setMsgIdUpdated) {
      setMsgIdUpdated(id);
    }
    if (setMsgEditing) {
      setMsgEditing(messageDetail.message);
    }
  };

  return (
    <Fragment>
      <div className="py-8 group">
        {(chatRoomDetail?.type === ChatRoomType.PRIVATE ||
          chatRoomDetail?.type === ChatRoomType.GROUP ||
          chatRoomDetail?.type === ChatRoomType.SELF) && (
          <div
            className={`flex px-8 !box-border group-hover:bg-[#FFFFFF] py-3 mx-3 group-hover:rounded-md`}>
            <ImageRound
              className="w-10 h-10"
              src="/images/avatar-default.svg"
              border="full"
              name="Avatar user"
            />
            <div className={`ml-6 w-full`}>
              <div className="flex justify-between">
                <p className="font-semibold text-sm pb-2">
                  {messageDetail.sender.fullName}{' '}
                  <span className="font-normal text-[10px]">
                    {messageDetail.sender.organizations &&
                      messageDetail.sender.organizations.map(
                        (organization, index) => (
                          <span
                            key={
                              organization.id
                            }>{`${organization.name}${messageDetail.sender.organizations && messageDetail.sender.organizations.length - 1 !== index ? '、' : ''}`}</span>
                        ),
                      )}
                  </span>
                </p>
                <p className="font-medium text-xs text-[#77858F]">
                  {messageDetail.createdAt &&
                    formatCheckDate(
                      getFormattedDateTime(
                        convertToCurrentTimezone(messageDetail.createdAt),
                      ),
                    )}
                </p>
              </div>
              <div className="relative">
                <div className={`flex items-start`}>
                  {messageDetail.isEdited && !messageDetail.deletedAt && (
                    <div className="flex items-center">
                      <ImageRound
                        name="Dot"
                        src={'/icons/dot.svg'}
                        className="w-[4px] h-[4px] hover:cursor-pointer ml-2"
                      />
                      <p className="font-normal text-xs ml-2">編集済</p>
                    </div>
                  )}
                </div>

                {messageDetail.uuid === msgIdUpdated ? (
                  <div className="!w-full">
                    <Quill
                      text={messageDetail?.message}
                      setMsgEditing={setMsgEditing}
                      msgEditing={msgEditing}
                      messageSubmitted={messageSubmitted}
                      setMessageSubmitted={setMessageSubmitted}
                      className="min-w-[700px] w-[700px]"
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <Button
                        className="w-[120px] !bg-[#EAF8FF] !text-[#0068B7]"
                        onClick={() => {
                          setMsgIdUpdated && setMsgIdUpdated(undefined);
                        }}>
                        キャンセル
                      </Button>
                      <Button
                        className="w-[100px]"
                        onClick={() =>
                          handleConfirmUpdateMsg(messageDetail.uuid)
                        }
                        disabled={
                          trimUnnecessaryLineBreaks(msgEditing as string) === ''
                        }>
                        更新
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex flex-col">
                      {messageDetail.deletedAt ? (
                        <p
                          className={`font-normal text-sm hover:cursor-pointer -ml-1 p-1 rounded-[5px] text-gray-600 italic bg-[#f0f1f1] w-[220px]`}>
                          {MESSAGE_DELETED}
                        </p>
                      ) : (
                        <div>
                          {messageDetail.type === MessageType.MESSAGE && (
                            <p
                              className={`text-chat-box font-normal text-sm hover:cursor-pointer -ml-1 p-1 rounded-[5px]  `}
                              dangerouslySetInnerHTML={{
                                __html: messageDetail.message,
                              }}></p>
                          )}
                          {messageDetail.type ===
                            MessageType.REMOVE_SCHEDULE && (
                            <div className={`w-full flex justify-start`}>
                              <div
                                className={`text-xs font-normal bg-[#eaf8ff] !w-[100%] p-4 `}>
                                <div className={`flex flex-col items-start`}>
                                  <p className="w-fit font-semibold text-black">
                                    {EVENT_DELETED}
                                  </p>
                                  <p className="font-semibold mt-2">日時</p>
                                  <p>
                                    {messageDetail.scheduleChanges?.new &&
                                      `${format(
                                        messageDetail.scheduleChanges?.new
                                          .startDate as string,
                                        DATE_FORMAT,
                                      )}(${getJapaneseDayName(
                                        messageDetail.scheduleChanges?.new
                                          .startDate as string,
                                      )})`}{' '}
                                    {messageDetail.scheduleChanges?.new &&
                                      convertToTimeString(
                                        `${messageDetail.scheduleChanges?.new.startDate}`,
                                      )}{' '}
                                    ~{' '}
                                    {messageDetail.scheduleChanges?.new &&
                                      String(
                                        format(
                                          messageDetail.scheduleChanges?.new
                                            .startDate as string,
                                          DATE_FORMAT,
                                        ),
                                      ) !==
                                        String(
                                          format(
                                            messageDetail.scheduleChanges?.new
                                              .endDate as string,
                                            DATE_FORMAT,
                                          ),
                                        ) &&
                                      `${format(
                                        messageDetail.scheduleChanges?.new
                                          .endDate as string,
                                        DATE_FORMAT,
                                      )}(${getJapaneseDayName(
                                        messageDetail.scheduleChanges?.new
                                          .endDate as string,
                                      )})`}{' '}
                                    {messageDetail.scheduleChanges?.new &&
                                      convertToTimeString(
                                        `${messageDetail.scheduleChanges?.new.endDate}`,
                                      )}
                                  </p>
                                  <p className="font-semibold mt-2">参加者</p>
                                  <p>
                                    {
                                      messageDetail.scheduleChanges?.participants?.find(
                                        (participant) => participant.isCreator,
                                      )?.name
                                    }{' '}
                                    {messageDetail.scheduleChanges?.participants?.find(
                                      (participant) => participant.isCreator,
                                    ) && '-主催者'}
                                  </p>
                                  {messageDetail.scheduleChanges?.participants?.find(
                                    (participant) => participant.isCreator,
                                  )
                                    ? messageDetail.scheduleChanges?.participants
                                        ?.filter(
                                          (participant) =>
                                            !participant.isCreator,
                                        )
                                        ?.slice(0, 3)
                                        .map((participant) => (
                                          <p key={participant.id}>
                                            {participant.name}{' '}
                                          </p>
                                        ))
                                    : messageDetail.scheduleChanges?.participants
                                        ?.slice(0, 4)
                                        .map((participant) => (
                                          <p key={participant.id}>
                                            {participant.name}{' '}
                                          </p>
                                        ))}
                                  {messageDetail.scheduleChanges
                                    ?.participants &&
                                    messageDetail.scheduleChanges?.participants
                                      ?.length > 4 && <p>その他</p>}
                                  <p
                                    className={`mt-2 text-left`}
                                    dangerouslySetInnerHTML={{
                                      __html: formatWithParagraphTags(
                                        messageDetail.message,
                                      ),
                                    }}></p>
                                </div>
                              </div>
                            </div>
                          )}
                          {messageDetail.type === MessageType.EDIT_SCHEDULE && (
                            <div className={`w-full flex justify-start`}>
                              <div
                                className={`text-xs font-normal bg-[#eaf8ff] !w-[100%] p-4 `}>
                                <div className={`flex flex-col items-start`}>
                                  <p className="w-fit font-semibold text-black">
                                    {EVENT_EDITED}
                                  </p>
                                  <p className="mt-2">
                                    変更あり:{' '}
                                    {messageDetail.scheduleChanges?.fieldChanges?.map(
                                      (field, index) => {
                                        return (
                                          <span key={index}>
                                            {field}
                                            {messageDetail.scheduleChanges &&
                                              messageDetail.scheduleChanges
                                                .fieldChanges &&
                                              index <
                                                messageDetail.scheduleChanges
                                                  .fieldChanges.length -
                                                  1 &&
                                              '、'}
                                          </span>
                                        );
                                      },
                                    )}
                                  </p>
                                  <p className="font-semibold mt-2">日時</p>
                                  <div className={`text-left`}>
                                    <p>
                                      {messageDetail.scheduleChanges?.new &&
                                        `${format(
                                          messageDetail.scheduleChanges?.new
                                            .startDate as string,
                                          DATE_FORMAT,
                                        )}(${getJapaneseDayName(
                                          messageDetail.scheduleChanges?.new
                                            .startDate as string,
                                        )})`}{' '}
                                      {messageDetail.scheduleChanges?.new &&
                                        convertToTimeString(
                                          `${messageDetail.scheduleChanges?.new.startDate}`,
                                        )}{' '}
                                      ~{' '}
                                      {messageDetail.scheduleChanges?.new &&
                                        String(
                                          format(
                                            messageDetail.scheduleChanges?.new
                                              .startDate as string,
                                            DATE_FORMAT,
                                          ),
                                        ) !==
                                          String(
                                            format(
                                              messageDetail.scheduleChanges?.new
                                                .endDate as string,
                                              DATE_FORMAT,
                                            ),
                                          ) &&
                                        `${format(
                                          messageDetail.scheduleChanges?.new
                                            .endDate as string,
                                          DATE_FORMAT,
                                        )}(${getJapaneseDayName(
                                          messageDetail.scheduleChanges?.new
                                            .endDate as string,
                                        )})`}{' '}
                                      {messageDetail.scheduleChanges?.new &&
                                        convertToTimeString(
                                          `${messageDetail.scheduleChanges?.new.endDate}`,
                                        )}
                                    </p>
                                    {messageDetail.scheduleChanges?.old && (
                                      <p>
                                        {'('}
                                        {EVENT_BEFORE_EDITED}
                                        {messageDetail.scheduleChanges?.old &&
                                          `${format(
                                            messageDetail.scheduleChanges?.old
                                              .startDate as string,
                                            DATE_FORMAT,
                                          )}(${getJapaneseDayName(
                                            messageDetail.scheduleChanges?.old
                                              .startDate as string,
                                          )})`}{' '}
                                        {messageDetail.scheduleChanges?.old &&
                                          convertToTimeString(
                                            `${messageDetail.scheduleChanges?.old.startDate}`,
                                          )}{' '}
                                        ~{' '}
                                        {messageDetail.scheduleChanges?.old &&
                                          String(
                                            format(
                                              messageDetail.scheduleChanges?.old
                                                .startDate as string,
                                              DATE_FORMAT,
                                            ),
                                          ) !==
                                            String(
                                              format(
                                                messageDetail.scheduleChanges
                                                  ?.old.endDate as string,
                                                DATE_FORMAT,
                                              ),
                                            ) &&
                                          `${format(
                                            messageDetail.scheduleChanges?.old
                                              .endDate as string,
                                            DATE_FORMAT,
                                          )}(${getJapaneseDayName(
                                            messageDetail.scheduleChanges?.old
                                              .endDate as string,
                                          )})`}{' '}
                                        {messageDetail.scheduleChanges?.old &&
                                          convertToTimeString(
                                            `${messageDetail.scheduleChanges?.old.endDate}`,
                                          )}
                                        {')'}
                                      </p>
                                    )}
                                  </div>
                                  <p className="font-semibold mt-2">参加者</p>
                                  <p>
                                    {
                                      messageDetail.scheduleChanges?.participants?.find(
                                        (participant) => participant.isCreator,
                                      )?.name
                                    }{' '}
                                    {messageDetail.scheduleChanges?.participants?.find(
                                      (participant) => participant.isCreator,
                                    ) && '-主催者'}
                                  </p>
                                  {messageDetail.scheduleChanges?.participants?.find(
                                    (participant) => participant.isCreator,
                                  )
                                    ? messageDetail.scheduleChanges?.participants
                                        ?.filter(
                                          (participant) =>
                                            !participant.isCreator,
                                        )
                                        ?.slice(0, 3)
                                        .map((participant) => (
                                          <p key={participant.id}>
                                            {participant.name}{' '}
                                          </p>
                                        ))
                                    : messageDetail.scheduleChanges?.participants
                                        ?.slice(0, 4)
                                        .map((participant) => (
                                          <p key={participant.id}>
                                            {participant.name}{' '}
                                          </p>
                                        ))}
                                  {messageDetail.scheduleChanges
                                    ?.participants &&
                                    messageDetail.scheduleChanges?.participants
                                      ?.length > 4 && <p>その他</p>}
                                  {messageDetail.scheduleId ? (
                                    <p
                                      className="hover:cursor-pointer mt-2"
                                      onClick={() =>
                                        handleConfirmGetDataDetailEvent(
                                          `${messageDetail.scheduleId}`,
                                        )
                                      }>
                                      予定を確認する
                                    </p>
                                  ) : (
                                    <p className="mt-2 italic text-gray-600">
                                      {EVENT_DELETED}
                                    </p>
                                  )}
                                  <p
                                    className={`mt-2 text-left`}
                                    dangerouslySetInnerHTML={{
                                      __html: formatWithParagraphTags(
                                        messageDetail.message,
                                      ),
                                    }}></p>
                                </div>
                              </div>
                            </div>
                          )}
                          {messageDetail.type ===
                            MessageType.CREATION_SCHEDULE && (
                            <div className={`w-full flex justify-start`}>
                              <div
                                className={`text-xs font-normal bg-[#eaf8ff] !w-[100%] p-4 `}>
                                <div className={`flex flex-col items-start`}>
                                  <p className="w-fit font-semibold text-black">
                                    {messageDetail.sender.fullName}{' '}
                                    {EVENT_CREATED}
                                  </p>
                                  <p className="font-semibold mt-2">日時</p>
                                  <p>
                                    {messageDetail.scheduleChanges?.new &&
                                      `${format(
                                        messageDetail.scheduleChanges?.new
                                          .startDate as string,
                                        DATE_FORMAT,
                                      )}(${getJapaneseDayName(
                                        messageDetail.scheduleChanges?.new
                                          .startDate as string,
                                      )})`}{' '}
                                    {messageDetail.scheduleChanges?.new &&
                                      convertToTimeString(
                                        `${messageDetail.scheduleChanges?.new.startDate}`,
                                      )}{' '}
                                    ~{' '}
                                    {messageDetail.scheduleChanges?.new &&
                                      String(
                                        format(
                                          messageDetail.scheduleChanges?.new
                                            .startDate as string,
                                          DATE_FORMAT,
                                        ),
                                      ) !==
                                        String(
                                          format(
                                            messageDetail.scheduleChanges?.new
                                              .endDate as string,
                                            DATE_FORMAT,
                                          ),
                                        ) &&
                                      `${format(
                                        messageDetail.scheduleChanges?.new
                                          .endDate as string,
                                        DATE_FORMAT,
                                      )}(${getJapaneseDayName(
                                        messageDetail.scheduleChanges?.new
                                          .endDate as string,
                                      )})`}{' '}
                                    {messageDetail.scheduleChanges?.new &&
                                      convertToTimeString(
                                        `${messageDetail.scheduleChanges?.new.endDate}`,
                                      )}
                                  </p>
                                  <p className="font-semibold mt-2">参加者</p>
                                  <p>
                                    {
                                      messageDetail.scheduleChanges?.participants?.find(
                                        (participant) => participant.isCreator,
                                      )?.name
                                    }{' '}
                                    {messageDetail.scheduleChanges?.participants?.find(
                                      (participant) => participant.isCreator,
                                    ) && '-主催者'}
                                  </p>
                                  {messageDetail.scheduleChanges?.participants?.find(
                                    (participant) => participant.isCreator,
                                  )
                                    ? messageDetail.scheduleChanges?.participants
                                        ?.filter(
                                          (participant) =>
                                            !participant.isCreator,
                                        )
                                        ?.slice(0, 3)
                                        .map((participant) => (
                                          <p key={participant.id}>
                                            {participant.name}{' '}
                                          </p>
                                        ))
                                    : messageDetail.scheduleChanges?.participants
                                        ?.slice(0, 4)
                                        .map((participant) => (
                                          <p key={participant.id}>
                                            {participant.name}{' '}
                                          </p>
                                        ))}
                                  {messageDetail.scheduleChanges
                                    ?.participants &&
                                    messageDetail.scheduleChanges?.participants
                                      ?.length > 4 && <p>その他</p>}
                                  {messageDetail.scheduleId ? (
                                    <p
                                      className="hover:cursor-pointer mt-2"
                                      onClick={() =>
                                        handleConfirmGetDataDetailEvent(
                                          `${messageDetail.scheduleId}`,
                                        )
                                      }>
                                      予定を確認する
                                    </p>
                                  ) : (
                                    <p className="mt-2 italic text-gray-600">
                                      {EVENT_DELETED}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                          {(messageDetail.type === MessageType.CREATION_TASK ||
                            messageDetail.type ===
                              MessageType.REMOVE_MEMBER_TASK ||
                            messageDetail.type ===
                              MessageType.ADD_MEMBER_TASK) &&
                            (messageDetail.task ? (
                              <div className={`w-full flex justify-start`}>
                                <div
                                  className={`text-xs font-normal bg-[#eaf8ff] w-[750px] p-4 `}>
                                  <div className={`flex flex-col items-start`}>
                                    <h4 className="text-sm w-fit font-medium text-black h-5">
                                      {messageDetail.type ==
                                      MessageType.CREATION_TASK
                                        ? CREATION_TASK_MESSAGE
                                        : messageDetail.type ==
                                            MessageType.REMOVE_MEMBER_TASK
                                          ? REMOVE_MEMBER_TASK_MESSAGE
                                          : ADD_MEMBER_TASK_MESSAGE}
                                    </h4>
                                    <h4 className="text-sm w-fit text-black h-5 truncate max-w-[500px]">
                                      タスクのタイトル:{' '}
                                      {messageDetail.task.title || NO_SETTING}
                                    </h4>
                                    {messageDetail.type !==
                                      MessageType.REMOVE_MEMBER_TASK && (
                                      <p className="w-fit mt-2">
                                        締切 :{' '}
                                        {(messageDetail.task.deadline &&
                                          format(
                                            messageDetail.task.deadline,
                                            DATE_FORMAT,
                                          )) ||
                                          NO_SETTING}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className={`w-full flex justify-start`}>
                                <div
                                  className={`text-sm font-normal bg-[#eaf8ff] p-1`}>
                                  <div className={`flex flex-col items-start`}>
                                    <p
                                      className={`font-normal w-[500px]  text-sm hover:cursor-pointer text-start -ml-1 p-1 rounded-[5px] text-gray-600 italic`}>
                                      {TASK_DELETED}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                    <>
                      {!messageDetail.deletedAt && (
                        <div
                          className={`bg-white group-hover:flex hidden rounded-2xl px-3 py-1.5 shadow-md absolute left-1/2 transform -translate-x-1/2 items-center gap-2`}>
                          <Tippy
                            content={'返信'}
                            arrow={false}
                            delay={1000}
                            placement="top"
                            offset={[0, 5]}>
                            <div className="bg-[#f0f1f1] hover:bg-[#dbdbdb] rounded-full p-[7px] hover:cursor-pointer">
                              <ImageRound
                                name="Reply"
                                src={'/icons/reply.svg'}
                                className="w-[17px] h-[15px] hover:cursor-pointer"
                              />
                            </div>
                          </Tippy>
                          <Tippy
                            content={'リアクション'}
                            arrow={false}
                            delay={1000}
                            placement="top"
                            offset={[0, 5]}>
                            <div className="bg-[#f0f1f1] hover:bg-[#dbdbdb] rounded-full p-[7px] hover:cursor-pointer">
                              <ImageRound
                                name="Reaction"
                                src={'/icons/reaction.svg'}
                                className="w-[15px] h-[15px] hover:cursor-pointer"
                              />
                            </div>
                          </Tippy>

                          <Tippy
                            content={'引用'}
                            arrow={false}
                            delay={1000}
                            placement="top"
                            offset={[0, 5]}>
                            <div className="bg-[#f0f1f1] hover:bg-[#dbdbdb] rounded-full px-[7px] py-[9px] hover:cursor-pointer">
                              <ImageRound
                                name="Quotation"
                                src={'/icons/quotation.svg'}
                                className="w-[15px] h-[10px] hover:cursor-pointer"
                              />
                            </div>
                          </Tippy>
                          <Tippy
                            content={'ブックマーク'}
                            arrow={false}
                            delay={1000}
                            placement="top"
                            offset={[0, 5]}>
                            <div className="bg-[#f0f1f1] hover:bg-[#dbdbdb] rounded-full px-[8px] py-[7px] hover:cursor-pointer">
                              <ImageRound
                                name="Save"
                                src={'/icons/save.svg'}
                                className="w-[12px] h-[14px] hover:cursor-pointer"
                              />
                            </div>
                          </Tippy>

                          {Number(session?.user.id) ===
                            Number(messageDetail.sender.id) &&
                            !messageDetail.deletedAt &&
                            session?.user.permissions &&
                            ((messageDetail.type == MessageType.MESSAGE &&
                              hasPermissionInArray(
                                session?.user.permissions,
                                PermissionsSystem.CHAT_UPDATE,
                              )) ||
                              hasPermissionInArray(
                                session?.user.permissions,
                                PermissionsSystem.CHAT_DELETE,
                              )) && (
                              <>
                                {messageDetail.type == MessageType.MESSAGE &&
                                  session?.user.permissions &&
                                  hasPermissionInArray(
                                    session?.user.permissions,
                                    PermissionsSystem.CHAT_UPDATE,
                                  ) && (
                                    <Tippy
                                      content={'編集'}
                                      arrow={false}
                                      delay={1000}
                                      placement="top"
                                      offset={[0, 5]}>
                                      <div
                                        className="bg-[#f0f1f1] hover:bg-[#dbdbdb] rounded-full p-[7px] hover:cursor-pointer"
                                        onClick={() =>
                                          handleOpenEditForm(messageDetail.uuid)
                                        }>
                                        <ImageRound
                                          name="Edit"
                                          src={'/icons/edit-chat.svg'}
                                          className="w-[14px] h-[14px] hover:cursor-pointer"
                                        />
                                      </div>
                                    </Tippy>
                                  )}
                                {session?.user.permissions &&
                                  hasPermissionInArray(
                                    session?.user.permissions,
                                    PermissionsSystem.CHAT_DELETE,
                                  ) && (
                                    <Tippy
                                      content={'消去'}
                                      arrow={false}
                                      delay={1000}
                                      placement="top"
                                      offset={[0, 5]}>
                                      <div
                                        className="bg-[#f0f1f1] hover:bg-[#dbdbdb] rounded-full p-[7px] hover:cursor-pointer"
                                        onClick={() => {
                                          handleOpenDeleteMsgModal(
                                            messageDetail.uuid,
                                          );
                                        }}>
                                        <ImageRound
                                          name="Delete"
                                          src={'/icons/delete-chat.svg'}
                                          className="w-[15px] h-[15px] hover:cursor-pointer"
                                        />
                                      </div>
                                    </Tippy>
                                  )}
                              </>
                            )}
                        </div>
                      )}
                    </>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {chatRoomDetail?.type === ChatRoomType.TASK && (
          <div
            className={`flex px-8 !box-border group-hover:bg-[#FFFFFF] py-3 mx-3 group-hover:rounded-md`}>
            {messageDetail.type !== MessageType.MESSAGE ? (
              <ImageRound
                className="w-10 h-10"
                src="/icons/document.svg"
                border="full"
                name="Task"
              />
            ) : (
              <ImageRound
                className="w-10 h-10"
                src="/images/avatar-default.svg"
                border="full"
                name="Avatar user"
              />
            )}
            <div className={`ml-6 !w-[100%]`}>
              <div className="flex justify-between">
                {messageDetail.type !== MessageType.MESSAGE ? (
                  <p className="font-semibold text-sm pb-2">タスクカード</p>
                ) : (
                  <p className="font-semibold text-sm pb-2">
                    {messageDetail.sender.fullName}{' '}
                    <span className="font-normal text-[10px]">
                      {messageDetail.sender.organizations &&
                        messageDetail.sender.organizations.map(
                          (organization, index) => (
                            <span
                              key={
                                organization.id
                              }>{`${organization.name}${messageDetail.sender.organizations && messageDetail.sender.organizations.length - 1 !== index ? '、' : ''}`}</span>
                          ),
                        )}
                    </span>
                  </p>
                )}
                <p className="font-normal text-xs text-[#77858F]">
                  {messageDetail.createdAt &&
                    formatCheckDate(
                      getFormattedDateTime(
                        convertToCurrentTimezone(messageDetail.createdAt),
                      ),
                    )}
                </p>
              </div>
              <div className="relative">
                <div className={`flex items-start`}>
                  {messageDetail.isEdited && !messageDetail.deletedAt && (
                    <div className="flex items-center">
                      <ImageRound
                        name="Dot"
                        src={'/icons/dot.svg'}
                        className="w-[4px] h-[4px] hover:cursor-pointer ml-2"
                      />
                      <p className="font-normal text-xs ml-2">編集済</p>
                    </div>
                  )}
                </div>

                {messageDetail.uuid === msgIdUpdated ? (
                  <div className="!w-full">
                    <Quill
                      text={messageDetail?.message}
                      setMsgEditing={setMsgEditing}
                      msgEditing={msgEditing}
                      messageSubmitted={messageSubmitted}
                      setMessageSubmitted={setMessageSubmitted}
                      className="w-[100%]"
                    />
                    <div className="flex gap-2 mt-2">
                      <Button
                        className="w-[120px] !bg-[#EAF8FF] !text-[#0068B7]"
                        onClick={() => {
                          setMsgIdUpdated && setMsgIdUpdated(undefined);
                        }}>
                        キャンセル
                      </Button>
                      <Button
                        className="w-[100px]"
                        onClick={() =>
                          handleConfirmUpdateMsg(messageDetail.uuid)
                        }
                        disabled={
                          trimUnnecessaryLineBreaks(msgEditing as string) === ''
                        }>
                        更新
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className={`!w-[100%]`}>
                    <div className="flex flex-col">
                      {messageDetail.deletedAt ? (
                        <p
                          className={`font-normal text-sm hover:cursor-pointer -ml-1 p-1 rounded-[5px] text-gray-600 italic bg-[#f0f1f1] w-[220px]`}>
                          {MESSAGE_DELETED}
                        </p>
                      ) : (
                        <div>
                          {messageDetail.type === MessageType.MESSAGE && (
                            <p
                              className={`text-chat-box font-normal text-sm hover:cursor-pointer max-w-[750px] -ml-1 p-1 rounded-[5px]  `}
                              dangerouslySetInnerHTML={{
                                __html: messageDetail.message,
                              }}></p>
                          )}
                          {messageDetail.type !== MessageType.MESSAGE &&
                            (messageDetail.task ? (
                              <div className={`w-full flex justify-start`}>
                                <div
                                  className={`text-xs font-normal bg-[#eaf8ff] w-[750px] p-4 `}>
                                  <div className={`flex flex-col items-start`}>
                                    <h4 className="text-sm w-fit font-medium text-black h-5">
                                      {messageDetail.type ==
                                      MessageType.CREATION_TASK
                                        ? CREATION_TASK_MESSAGE
                                        : messageDetail.type ==
                                            MessageType.REMOVE_MEMBER_TASK
                                          ? REMOVE_MEMBER_TASK_MESSAGE
                                          : ADD_MEMBER_TASK_MESSAGE}
                                    </h4>
                                    <h4 className="text-sm w-fit text-black h-5 truncate max-w-[500px]">
                                      タスクのタイトル:{' '}
                                      {messageDetail.task.title || NO_SETTING}
                                    </h4>
                                    {messageDetail.type !==
                                      MessageType.REMOVE_MEMBER_TASK && (
                                      <p className="w-fit mt-2">
                                        締切 :{' '}
                                        {(messageDetail.task.deadline &&
                                          format(
                                            messageDetail.task.deadline,
                                            DATE_FORMAT,
                                          )) ||
                                          NO_SETTING}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className={`w-full flex justify-start `}>
                                <div
                                  className={`text-sm font-normal bg-[#eaf8ff] p-1`}>
                                  <div className={`flex flex-col items-end`}>
                                    <p
                                      className={`font-normal w-[500px]  text-sm hover:cursor-pointer text-start -ml-1 p-1 rounded-[5px] text-gray-600 italic`}>
                                      {TASK_DELETED}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                    <>
                      {!messageDetail.deletedAt && (
                        <div
                          className={`bg-white group-hover:flex hidden rounded-2xl px-3 py-1.5 shadow-md absolute left-1/2 transform -translate-x-1/2 items-center gap-2`}>
                          <Tippy
                            content={'返信'}
                            arrow={false}
                            delay={1000}
                            placement="top"
                            offset={[0, 5]}>
                            <div className="bg-[#f0f1f1] hover:bg-[#dbdbdb] rounded-full p-[7px] hover:cursor-pointer">
                              <ImageRound
                                name="Reply"
                                src={'/icons/reply.svg'}
                                className="w-[17px] h-[15px] hover:cursor-pointer"
                              />
                            </div>
                          </Tippy>
                          <Tippy
                            content={'リアクション'}
                            arrow={false}
                            delay={1000}
                            placement="top"
                            offset={[0, 5]}>
                            <div className="bg-[#f0f1f1] hover:bg-[#dbdbdb] rounded-full p-[7px] hover:cursor-pointer">
                              <ImageRound
                                name="Reaction"
                                src={'/icons/reaction.svg'}
                                className="w-[15px] h-[15px] hover:cursor-pointer"
                              />
                            </div>
                          </Tippy>

                          <Tippy
                            content={'引用'}
                            arrow={false}
                            delay={1000}
                            placement="top"
                            offset={[0, 5]}>
                            <div className="bg-[#f0f1f1] hover:bg-[#dbdbdb] rounded-full px-[7px] py-[9px] hover:cursor-pointer">
                              <ImageRound
                                name="Quotation"
                                src={'/icons/quotation.svg'}
                                className="w-[15px] h-[10px] hover:cursor-pointer"
                              />
                            </div>
                          </Tippy>
                          <Tippy
                            content={'ブックマーク'}
                            arrow={false}
                            delay={1000}
                            placement="top"
                            offset={[0, 5]}>
                            <div className="bg-[#f0f1f1] hover:bg-[#dbdbdb] rounded-full px-[8px] py-[7px] hover:cursor-pointer">
                              <ImageRound
                                name="Save"
                                src={'/icons/save.svg'}
                                className="w-[12px] h-[14px] hover:cursor-pointer"
                              />
                            </div>
                          </Tippy>

                          {Number(session?.user.id) ===
                            Number(messageDetail.sender.id) &&
                            !messageDetail.deletedAt &&
                            session?.user.permissions &&
                            ((messageDetail.type == MessageType.MESSAGE &&
                              hasPermissionInArray(
                                session?.user.permissions,
                                PermissionsSystem.CHAT_UPDATE,
                              )) ||
                              hasPermissionInArray(
                                session?.user.permissions,
                                PermissionsSystem.CHAT_DELETE,
                              )) && (
                              <>
                                {messageDetail.type == MessageType.MESSAGE &&
                                  session?.user.permissions &&
                                  hasPermissionInArray(
                                    session?.user.permissions,
                                    PermissionsSystem.CHAT_UPDATE,
                                  ) && (
                                    <Tippy
                                      content={'編集'}
                                      arrow={false}
                                      delay={1000}
                                      placement="top"
                                      offset={[0, 5]}>
                                      <div
                                        className="bg-[#f0f1f1] hover:bg-[#dbdbdb] rounded-full p-[7px] hover:cursor-pointer"
                                        onClick={() =>
                                          handleOpenEditForm(messageDetail.uuid)
                                        }>
                                        <ImageRound
                                          name="Edit"
                                          src={'/icons/edit-chat.svg'}
                                          className="w-[14px] h-[14px] hover:cursor-pointer"
                                        />
                                      </div>
                                    </Tippy>
                                  )}
                                {session?.user.permissions &&
                                  hasPermissionInArray(
                                    session?.user.permissions,
                                    PermissionsSystem.CHAT_DELETE,
                                  ) && (
                                    <Tippy
                                      content={'消去'}
                                      arrow={false}
                                      delay={1000}
                                      placement="top"
                                      offset={[0, 5]}>
                                      <div
                                        className="bg-[#f0f1f1] hover:bg-[#dbdbdb] rounded-full p-[7px] hover:cursor-pointer"
                                        onClick={() => {
                                          handleOpenDeleteMsgModal(
                                            messageDetail.uuid,
                                          );
                                        }}>
                                        <ImageRound
                                          name="Delete"
                                          src={'/icons/delete-chat.svg'}
                                          className="w-[15px] h-[15px] hover:cursor-pointer"
                                        />
                                      </div>
                                    </Tippy>
                                  )}
                              </>
                            )}
                        </div>
                      )}
                    </>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {chatRoomDetail?.type === ChatRoomType.SKILL && (
          <div
            className={`flex px-8 !box-border group-hover:bg-[#FFFFFF] py-3 mx-3 group-hover:rounded-md`}>
            {messageDetail.type !== MessageType.MESSAGE ? (
              <ImageRound
                className="w-10 h-10"
                src="/icons/document.svg"
                border="full"
                name="Task"
              />
            ) : (
              <ImageRound
                className="w-10 h-10"
                src="/images/avatar-default.svg"
                border="full"
                name="Avatar user"
              />
            )}
            <div className={`ml-6 !w-[100%]`}>
              <div className="flex justify-between">
                {messageDetail.type !== MessageType.MESSAGE ? (
                  <p className="font-semibold text-sm pb-2">スキルアップ</p>
                ) : (
                  <p className="font-semibold text-sm pb-2">
                    {messageDetail.sender.fullName}{' '}
                    <span className="font-normal text-[10px]">
                      {messageDetail.sender.organizations &&
                        messageDetail.sender.organizations.map(
                          (organization, index) => (
                            <span
                              key={
                                organization.id
                              }>{`${organization.name}${messageDetail.sender.organizations && messageDetail.sender.organizations.length - 1 !== index ? '、' : ''}`}</span>
                          ),
                        )}
                    </span>
                  </p>
                )}
                <p className="font-normal text-xs text-[#77858F]">
                  {messageDetail.createdAt &&
                    formatCheckDate(
                      getFormattedDateTime(
                        convertToCurrentTimezone(messageDetail.createdAt),
                      ),
                    )}
                </p>
              </div>
              <div className="relative">
                <div className={`flex items-start`}>
                  {messageDetail.isEdited && !messageDetail.deletedAt && (
                    <div className="flex items-center">
                      <ImageRound
                        name="Dot"
                        src={'/icons/dot.svg'}
                        className="w-[4px] h-[4px] hover:cursor-pointer ml-2"
                      />
                      <p className="font-normal text-xs ml-2">編集済</p>
                    </div>
                  )}
                </div>

                {messageDetail.uuid === msgIdUpdated ? (
                  <div className="!w-full">
                    <Quill
                      text={messageDetail?.message}
                      setMsgEditing={setMsgEditing}
                      msgEditing={msgEditing}
                      messageSubmitted={messageSubmitted}
                      setMessageSubmitted={setMessageSubmitted}
                      className="w-[100%]"
                    />
                    <div className="flex gap-2 mt-2">
                      <Button
                        className="w-[120px] !bg-[#EAF8FF] !text-[#0068B7]"
                        onClick={() => {
                          setMsgIdUpdated && setMsgIdUpdated(undefined);
                        }}>
                        キャンセル
                      </Button>
                      <Button
                        className="w-[100px]"
                        onClick={() =>
                          handleConfirmUpdateMsg(messageDetail.uuid)
                        }
                        disabled={
                          trimUnnecessaryLineBreaks(msgEditing as string) === ''
                        }>
                        更新
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className={`!w-[100%]`}>
                    <div className="flex flex-col">
                      {messageDetail.deletedAt ||
                      (!messageDetail.submitLevel && !messageDetail.message) ? (
                        <p
                          className={`font-normal text-sm hover:cursor-pointer -ml-1 p-1 rounded-[5px] text-gray-600 italic bg-[#f0f1f1] w-[220px]`}>
                          {messageDetail.type == MessageType.MESSAGE
                            ? MESSAGE_DELETED
                            : DELETED_SKILL_UP_MESSAGE}
                        </p>
                      ) : (
                        <div>
                          {messageDetail.type === MessageType.MESSAGE && (
                            <p
                              className={`text-chat-box font-normal text-sm hover:cursor-pointer !w-[100%] -ml-1 p-1 rounded-[5px]  `}
                              dangerouslySetInnerHTML={{
                                __html: messageDetail.message,
                              }}></p>
                          )}
                          {messageDetail.type !== MessageType.MESSAGE && (
                            <div
                              className={`w-full flex justify-start ${
                                session?.user.permissions &&
                                hasPermissionInArray(
                                  session?.user.permissions,
                                  PermissionsSystem.SKILL_MAP_VIEW,
                                ) &&
                                'hover:cursor-pointer'
                              }`}
                              onClick={() => {
                                if (
                                  session?.user.permissions &&
                                  hasPermissionInArray(
                                    session?.user.permissions,
                                    PermissionsSystem.SKILL_MAP_VIEW,
                                  )
                                ) {
                                  router.push(
                                    pageRouters.DETAIL_SKILL_MAPS.href(
                                      `${messageDetail.submitLevel?.id}`,
                                      `${messageDetail.submitLevel?.organization}`,
                                      `${messageDetail.submitLevel?.staff}`,
                                    ),
                                  );
                                }
                              }}>
                              <div
                                className={`text-xs font-normal bg-[#eaf8ff] !w-[100%] p-4 `}>
                                <div className={`flex flex-col items-start`}>
                                  <h4 className="text-sm w-fit font-medium text-black h-5">
                                    {messageDetail.sender.fullName}
                                    {SKILL_UP_MESSAGE}
                                  </h4>
                                  <h4 className="text-sm w-fit text-black h-5 truncate max-w-[500px]">
                                    申請結果:{' '}
                                    {messageDetail.submitLevel &&
                                      messageDetail.submitLevel?.status}
                                  </h4>
                                  <div>
                                    <h4 className="text-sm text-black h-5 max-w-[500px]">
                                      コメント:
                                    </h4>{' '}
                                    {messageDetail.submitLevel &&
                                      messageDetail.submitLevel?.comment &&
                                      messageDetail.submitLevel?.comment
                                        ?.split('\n')
                                        .map((comment, index) => {
                                          return <p key={index}>{comment}</p>;
                                        })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <>
                      {!messageDetail.deletedAt && (
                        <div
                          className={`bg-white group-hover:flex hidden rounded-2xl px-3 py-1.5 shadow-md absolute left-1/2 transform -translate-x-1/2 items-center gap-2`}>
                          <Tippy
                            content={'返信'}
                            arrow={false}
                            delay={1000}
                            placement="top"
                            offset={[0, 5]}>
                            <div className="bg-[#f0f1f1] hover:bg-[#dbdbdb] rounded-full p-[7px] hover:cursor-pointer">
                              <ImageRound
                                name="Reply"
                                src={'/icons/reply.svg'}
                                className="w-[17px] h-[15px] hover:cursor-pointer"
                              />
                            </div>
                          </Tippy>
                          <Tippy
                            content={'リアクション'}
                            arrow={false}
                            delay={1000}
                            placement="top"
                            offset={[0, 5]}>
                            <div className="bg-[#f0f1f1] hover:bg-[#dbdbdb] rounded-full p-[7px] hover:cursor-pointer">
                              <ImageRound
                                name="Reaction"
                                src={'/icons/reaction.svg'}
                                className="w-[15px] h-[15px] hover:cursor-pointer"
                              />
                            </div>
                          </Tippy>

                          <Tippy
                            content={'引用'}
                            arrow={false}
                            delay={1000}
                            placement="top"
                            offset={[0, 5]}>
                            <div className="bg-[#f0f1f1] hover:bg-[#dbdbdb] rounded-full px-[7px] py-[9px] hover:cursor-pointer">
                              <ImageRound
                                name="Quotation"
                                src={'/icons/quotation.svg'}
                                className="w-[15px] h-[10px] hover:cursor-pointer"
                              />
                            </div>
                          </Tippy>
                          <Tippy
                            content={'ブックマーク'}
                            arrow={false}
                            delay={1000}
                            placement="top"
                            offset={[0, 5]}>
                            <div className="bg-[#f0f1f1] hover:bg-[#dbdbdb] rounded-full px-[8px] py-[7px] hover:cursor-pointer">
                              <ImageRound
                                name="Save"
                                src={'/icons/save.svg'}
                                className="w-[12px] h-[14px] hover:cursor-pointer"
                              />
                            </div>
                          </Tippy>

                          {Number(session?.user.id) ===
                            Number(messageDetail.sender.id) &&
                            !messageDetail.deletedAt &&
                            session?.user.permissions &&
                            ((messageDetail.type == MessageType.MESSAGE &&
                              hasPermissionInArray(
                                session?.user.permissions,
                                PermissionsSystem.CHAT_UPDATE,
                              )) ||
                              hasPermissionInArray(
                                session?.user.permissions,
                                PermissionsSystem.CHAT_DELETE,
                              )) && (
                              <>
                                {messageDetail.type == MessageType.MESSAGE &&
                                  session?.user.permissions &&
                                  hasPermissionInArray(
                                    session?.user.permissions,
                                    PermissionsSystem.CHAT_UPDATE,
                                  ) && (
                                    <Tippy
                                      content={'編集'}
                                      arrow={false}
                                      delay={1000}
                                      placement="top"
                                      offset={[0, 5]}>
                                      <div
                                        className="bg-[#f0f1f1] hover:bg-[#dbdbdb] rounded-full p-[7px] hover:cursor-pointer"
                                        onClick={() =>
                                          handleOpenEditForm(messageDetail.uuid)
                                        }>
                                        <ImageRound
                                          name="Edit"
                                          src={'/icons/edit-chat.svg'}
                                          className="w-[14px] h-[14px] hover:cursor-pointer"
                                        />
                                      </div>
                                    </Tippy>
                                  )}
                                {session?.user.permissions &&
                                  hasPermissionInArray(
                                    session?.user.permissions,
                                    PermissionsSystem.CHAT_DELETE,
                                  ) && (
                                    <Tippy
                                      content={'消去'}
                                      arrow={false}
                                      delay={1000}
                                      placement="top"
                                      offset={[0, 5]}>
                                      <div
                                        className="bg-[#f0f1f1] hover:bg-[#dbdbdb] rounded-full p-[7px] hover:cursor-pointer"
                                        onClick={() => {
                                          handleOpenDeleteMsgModal(
                                            messageDetail.uuid,
                                          );
                                        }}>
                                        <ImageRound
                                          name="Delete"
                                          src={'/icons/delete-chat.svg'}
                                          className="w-[15px] h-[15px] hover:cursor-pointer"
                                        />
                                      </div>
                                    </Tippy>
                                  )}
                              </>
                            )}
                        </div>
                      )}
                    </>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Fragment>
  );
};
interface dataProps {
  clientId: string;
  lastItemId: number | null | undefined;
  hasMoreDetail: boolean;
  dashboardMemberList: Omit<Profile, 'birthday' | 'gender'>[];
  dashboardMembers: ChatDashboardMember[];
  creationDataTaskData: CreationDataTask | undefined;
  handleUpdateLocalByCode: (data: ChatRoomItem) => void;
  handleUpdateLocalByCodeMsg: (data: ChatRoomItem) => void;
  setLastItemId: React.Dispatch<
    React.SetStateAction<number | null | undefined>
  >;
  setHasMoreDetail: React.Dispatch<React.SetStateAction<boolean>>;
  setDataChatList: React.Dispatch<React.SetStateAction<ChatRoomItem[]>>;
  hasMore: boolean;
  handleRemoveChatRoomParam: () => void;
  chatRoomCode: string;
  dataChatList: ChatRoomItem[];
  searchChatMsg: string;
  setSearchChatMsg: React.Dispatch<React.SetStateAction<string>>;
  setFilteredChatList: React.Dispatch<React.SetStateAction<ChatRoomItem[]>>;
}
const ChatDetail = ({
  clientId,
  lastItemId,
  creationDataTaskData,
  hasMoreDetail,
  dashboardMemberList,
  dashboardMembers,
  setFilteredChatList,
  setHasMoreDetail,
  setLastItemId,
  handleUpdateLocalByCode,
  handleUpdateLocalByCodeMsg,
  setDataChatList,
  handleRemoveChatRoomParam,
  chatRoomCode,
  dataChatList,
  searchChatMsg,
  setSearchChatMsg,
}: dataProps) => {
  const { data: session } = useSession();
  const { ref, inView } = useInView({
    threshold: 0.2,
  });

  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams);

  const router = useRouter();
  const showErrorToast = useErrorToast();

  const [openSettingBox, setOpenSettingBox] = useState<boolean>(false);
  const [openAddMembersBox, setOpenAddMembersBox] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [messageSubmitted, setMessageSubmitted] = useState<boolean>(false);
  const [page, _setPage] = useState<number>(1);
  const [isShowModalTask, setShowModalTask] = useState<boolean>(false);
  const [actionsEventMessage, setActionsEventMessage] = useState<string>('');
  const [dataMessageDetail, setDataMessageDetail] = useState<
    ChatMessageResponse[]
  >([]);
  const [roomDetail, setRoomDetail] = useState<ChatRoomItem>();
  const {
    chatList,
    chatRoomNameEditing,
    chatRoomParticipantsEditing,
    isReload,
    chatRoomNotifications,
    setChatRoomParticipantsEditing,
    setChatRoomNameEditing,
    setChatRoomNotifications,
  } = useContext(ChatContext);
  const { setIsLoading } = useContext(LoadingContext);
  const { setTotalNotifications } = useContext(GlobalStateContext);
  const { showToast } = useToast();

  const [msgIdDeleted, setMsgIdDeleted] = useState<string>();
  const [openConfirmDeleteModal, setOpenConfirmDeleteModal] = useState(false);
  const [msgIdUpdated, setMsgIdUpdated] = useState<string>();
  const [msgEditing, setMsgEditing] = useState<string | undefined>();
  const [dataEventEdit, setDataEventEdit] = useState<EventEditFormData>();
  const [openEditEventModal, setOpenEditEventModal] = useState<boolean>(false);
  const [openConfirmEditEventModal, setOpenConfirmEditEventModal] =
    useState(false);
  const [openConfirmDeleteEventModal, setOpenConfirmDeleteEventModal] =
    useState(false);
  const [confirmEventDataToEdit, setConfirmEventDataToEdit] =
    useState<EventEditFormData>();
  const [backToEditing, setBackToEditing] = useState(false);
  const [initialLoad, setInitialLoad] = useState<boolean>(false);
  const { creationDataEventCalendar } = useCreationDataEventCalendar({});
  const { chatRoomDetail } = useChatRoomDetail({
    code: `${chatRoomCode}`,
    conditions: [isReload || !!roomDetail],
  });
  const activeRoomRef = useRef<string | null>(null);

  //Task
  const [dataTaskEdit, setDataTaskEdit] = useState<Task | null>(null);

  // Handle get list and more data message
  const handleGetDataMessages = async (pageNumber: number) => {
    if (chatRoomCode) {
      setInitialLoad(true);
      const apiUrl = `${apiRouters.CHAT_MESSAGES(`${chatRoomCode}`)}?page=${pageNumber}&page_size=${PAGINATION_PAGE_SIZE_HIGHT}${lastItemId ? `&message_id=${lastItemId}` : ''}`;
      return await api.get<BasePagination<ChatMessageResponse[]>>(apiUrl);
    }
  };

  const { mutate: getDataListMessages } = useMutation(
    'getDataListMessages',
    handleGetDataMessages,
    {
      onSuccess: (variables) => {
        if (activeRoomRef.current === chatRoomCode) {
          if (variables) {
            if (variables.data.results.length <= 0 || !variables.data.hasNext) {
              setHasMoreDetail(false);
            }
            setDataMessageDetail((prev) => {
              if (prev) {
                return [...prev, ...variables.data.results];
              } else {
                return [...variables.data.results];
              }
            });
            if (
              variables.data.results.length > 0 &&
              variables.data.results[variables.data.results.length - 1].id
            ) {
              setLastItemId &&
                setLastItemId(
                  variables.data.results[variables.data.results.length - 1].id,
                );
            } else {
              setLastItemId(null);
            }
          }
          activeRoomRef.current = null;
        }
      },
      onError: ({ response }: AxiosError) => {
        if (response?.status === ServerStatusCode.NOT_FOUND) {
          handleRemoveChatRoomParam();
        }
      },
      onSettled: () => {
        setInitialLoad(false);
      },
    },
  );

  useEffect(() => {
    if (inView && hasMoreDetail) {
      activeRoomRef.current = chatRoomCode;
      getDataListMessages(page);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, chatRoomCode, hasMoreDetail]);

  useEffect(() => {
    if (!chatRoomNotifications) {
      if (dataChatList) {
        const currentChatRoom = dataChatList.find(
          (room) => room.code == chatRoomCode,
        );
        setChatRoomNotifications({
          roomCode: chatRoomCode,
          notifications: currentChatRoom?.unreadMessages || 0,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatRoomCode, dataChatList]);

  const getChatParticipantIds = (
    participantsList: ChatParticipant[] | undefined,
  ) => {
    if (participantsList) {
      const participantIds = [] as number[];
      participantsList.map((member) => participantIds.push(member.id));
      return participantIds;
    }
  };

  useEffect(() => {
    if (chatList && chatRoomCode) {
      const initialRoomDetail = chatList.results.find(
        (room) => room.code === chatRoomCode,
      );
      if (initialRoomDetail) {
        setRoomDetail(initialRoomDetail);
        setMessageSubmitted(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatList, chatRoomCode]);

  useEffect(() => {
    if (chatRoomCode) {
      setDataMessageDetail([]);
      setLastItemId(null);
    }
  }, [chatRoomCode, setLastItemId]);
  const handleDeleteMessageLocal = useCallback(
    (data: WebSocketMessageData) => {
      setDataMessageDetail((prevDataMessageDetail) => {
        const updatedDataMessageDetail = [...prevDataMessageDetail];
        const deletedMessageItemIndex = updatedDataMessageDetail.findIndex(
          (item) => item.uuid === data.chatMessage.uuid,
        );
        if (deletedMessageItemIndex !== -1) {
          updatedDataMessageDetail[deletedMessageItemIndex] = {
            ...updatedDataMessageDetail[deletedMessageItemIndex],
            deletedAt: data.chatMessage.deletedAt,
          };
          return updatedDataMessageDetail;
        }
        return prevDataMessageDetail;
      });
    },
    [setDataMessageDetail],
  );

  const handleUpdateMessageLocal = useCallback(
    (data: WebSocketMessageData) => {
      setDataMessageDetail((prevDataMessageDetail) => {
        const updatedDataMessageDetail = [...prevDataMessageDetail];
        const updatedMessageItemIndex = updatedDataMessageDetail.findIndex(
          (item) => item.uuid === data.chatMessage.uuid,
        );
        if (updatedMessageItemIndex !== -1) {
          updatedDataMessageDetail[updatedMessageItemIndex] = {
            ...updatedDataMessageDetail[updatedMessageItemIndex],
            isEdited: true,
            message: trimUnnecessaryLineBreaks(
              `${data.chatMessage.message}`,
            ) as string,
          };
          return updatedDataMessageDetail;
        }
        return prevDataMessageDetail;
      });
    },
    [setDataMessageDetail],
  );

  const handleDeleteTaskLocal = useCallback(
    (data: ChatMessageResponse) => {
      setDataMessageDetail((prevDataMessageDetail) => {
        const updatedDataMessageDetail = [...prevDataMessageDetail];
        const updatedMessageItemIndex = updatedDataMessageDetail.findIndex(
          (item) => item.id === data.id,
        );
        if (updatedMessageItemIndex !== -1) {
          updatedDataMessageDetail[updatedMessageItemIndex] = {
            ...updatedDataMessageDetail[updatedMessageItemIndex],
            task: null,
          };
          return updatedDataMessageDetail;
        }
        return prevDataMessageDetail;
      });
    },
    [setDataMessageDetail],
  );

  const handleUpdateGroupLocal = useCallback(
    (data: WebSocketMessageData, dataChatList: ChatRoomItem[]) => {
      setChatRoomNameEditing((prevChatRoomNameEditing) => {
        const updatedChatRoomNameEditing = [...(prevChatRoomNameEditing ?? [])];
        const chatRoomNameEditingIndex = updatedChatRoomNameEditing.findIndex(
          (room) => room.roomCode === data.chatRoom.code,
        );
        if (chatRoomNameEditingIndex !== -1) {
          // Update chatRoomNameEditing item if it exists
          updatedChatRoomNameEditing[chatRoomNameEditingIndex] = {
            roomName: data.chatRoom.name,
            roomCode: data.chatRoom.code,
          };
          return updatedChatRoomNameEditing;
        } else {
          // Push new chatRoomNameEditing item if it does not exist
          return [
            ...updatedChatRoomNameEditing,
            {
              roomName: data.chatRoom.name,
              roomCode: data.chatRoom.code,
            },
          ];
        }
      });
      const list = [] as number[];
      data.chatRoom.participants.map((member) => list.push(member.id));
      setChatRoomParticipantsEditing((prevChatRoomParticipantsEditing) => {
        const updatedChatRoomParticipantsEditing = [
          ...(prevChatRoomParticipantsEditing ?? []),
        ];
        const chatRoomParticipantsEditingIndex =
          updatedChatRoomParticipantsEditing.findIndex(
            (room) => room.roomCode === data.chatRoom.code,
          );
        if (chatRoomParticipantsEditingIndex !== -1) {
          // Update chatRoomParticipantsEditing item if it exists
          updatedChatRoomParticipantsEditing[chatRoomParticipantsEditingIndex] =
            {
              participantsList: list,
              roomCode: data.chatRoom.code,
            };
          return updatedChatRoomParticipantsEditing;
        } else {
          // Push new chatRoomParticipantsEditing item if it does not exist
          return [
            ...updatedChatRoomParticipantsEditing,
            {
              participantsList: list,
              roomCode: data.chatRoom.code,
            },
          ];
        }
      });
      if (data.chatRoom.code == chatRoomCode) {
        const updatedDataChatList = [...dataChatList];
        const chatRoomIndex = updatedDataChatList.findIndex(
          (room) => room.code == chatRoomCode,
        );
        if (chatRoomIndex != -1) {
          updatedDataChatList[chatRoomIndex].unreadMessages =
            data.chatRoom.unreadMessages;
          setDataChatList(updatedDataChatList);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setChatRoomNameEditing, setChatRoomParticipantsEditing, setDataChatList],
  );

  const handleRemoveParticipantsLocal = useCallback(
    (data: WebSocketMessageData) => {
      // Update dataChatList if user is removed from participants list
      setDataChatList((prevDataChatList) => {
        let updatedDataChatList = [...prevDataChatList];
        updatedDataChatList = updatedDataChatList.filter(
          (chatRoom) => chatRoom.code !== data.chatRoom.code,
        );
        return updatedDataChatList;
      });
      if (data.chatRoom.code === chatRoomCode) {
        handleRemoveChatRoomParam();
      }
    },
    [setDataChatList, handleRemoveChatRoomParam, chatRoomCode],
  );

  // Socket
  useEffect(() => {
    // Create WebSocket
    const handleSocketMessage = (data: WebSocketMessageData) => {
      switch (data.action) {
        case SocketActions.MESSAGE:
          if (data.chatRoom.code === chatRoomCode) {
            if (data.clientId !== clientId) {
              setDataMessageDetail([data.chatMessage, ...dataMessageDetail]);
              setChatRoomNotifications({
                notifications: data.chatRoom.unreadMessages,
                roomCode: chatRoomCode,
              });
            }
          }
          handleUpdateLocalByCodeMsg(data.chatRoom);
          setMessageSubmitted(true);
          break;
        case SocketActions.CREATION_TASK:
          if (data.chatRoom.code === chatRoomCode) {
            setDataMessageDetail([data.chatMessage, ...dataMessageDetail]);
            if (data.clientId !== clientId) {
              setChatRoomNotifications({
                notifications: data.chatRoom.unreadMessages,
                roomCode: chatRoomCode,
              });
            }
          }
          handleUpdateLocalByCode(data.chatRoom);
          setMessageSubmitted(true);
          break;
        case SocketActions.DELETE_TASK:
          if (data.chatRoom.code === chatRoomCode) {
            handleDeleteTaskLocal(data.chatMessage);
          }
          break;
        case SocketActions.DELETE_MESSAGE:
          if (data.chatRoom.code === chatRoomCode) {
            handleDeleteMessageLocal(data);
            setOpenConfirmDeleteModal(false);
          }
          break;
        case SocketActions.EDIT_MESSAGE:
          if (data.chatRoom.code === chatRoomCode) {
            handleUpdateMessageLocal(data);
            setMsgIdUpdated && setMsgIdUpdated(undefined);
            setMsgEditing(undefined);
          }
          break;
        case SocketActions.UPDATE_CHAT_ROOM:
          handleUpdateGroupLocal(data, dataChatList);
          break;
        case SocketActions.REMOVE_PARTICIPANT:
          handleRemoveParticipantsLocal(data);
          break;
        default:
          break;
      }
    };
    socketEventEmitter.on('message', handleSocketMessage);

    return () => {
      socketEventEmitter.off('message', handleSocketMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    chatRoomCode,
    dataMessageDetail,
    handleUpdateLocalByCode,
    handleDeleteMessageLocal,
    handleUpdateMessageLocal,
    handleUpdateGroupLocal,
    handleRemoveParticipantsLocal,
    handleUpdateLocalByCodeMsg,
    handleDeleteTaskLocal,
    clientId,
  ]);

  // Create message
  const postSendMsg = async ({
    data,
    uuid,
  }: {
    data: string;
    uuid: string;
  }) => {
    const { data: response } = await api.post(
      apiRouters.CHAT_MESSAGES(`${chatRoomCode}`),
      {
        message: data,
        uuid: uuid,
        clientId: clientId,
      },
    );
    return response;
  };
  const { mutate: handleSendMsgChat } = useMutation(postSendMsg, {
    onSuccess: async () => {},
    onError: () => {},
  });

  const handleConfirmSendMessage = () => {
    setMessageSubmitted(true);
    const uuidMsg = uuidv4();
    const newMsg = trimUnnecessaryLineBreaks(message) as string;
    setDataMessageDetail([
      {
        uuid: uuidMsg,
        message: newMsg,
        createdAt: getCurrentTimeInJapan(),
        deletedAt: null,
        type: MessageType.MESSAGE,
        isEdited: false,
        task: null,
        sender: {
          fullName: session?.user.profile.fullName || '',
          id: session?.user.id as number,
          organizations: [],
        },
      },
      ...dataMessageDetail,
    ]);

    handleSendMsgChat({
      data: newMsg,
      uuid: uuidMsg,
    });
  };

  // Delete message
  const postDeleteMsg = async () => {
    const { data: response } = await api.delete(
      apiRouters.CHAT_MESSAGES_DETAIL(`${msgIdDeleted}`),
    );
    return response;
  };
  const { mutate: handleDeleteMsgChat } = useMutation(postDeleteMsg, {
    onSuccess: async () => {},
    onError: () => {},
  });

  const handleConfirmDeleteMessage = () => {
    handleDeleteMsgChat();
  };
  // Update message
  const postUpdateMsg = async (data: { uuid: string; message: string }) => {
    const { data: response } = await api.patch(
      apiRouters.CHAT_MESSAGES_DETAIL(data.uuid),
      data,
    );
    return response;
  };
  const { mutate: handleUpdateMsgChat } = useMutation(postUpdateMsg, {
    onSuccess: async () => {},
    onError: () => {},
  });

  const handleConfirmUpdateMsg = (uuid: string) => {
    if (uuid) {
      handleUpdateMsgChat({
        message: trimUnnecessaryLineBreaks(`${msgEditing}`) as string,
        uuid: uuid,
      });
    }
  };

  // Function create  tasks
  const handleConfirmCreateTask = (data: TaskFormData) => {
    const peopleInChargeIds =
      data.peopleInChargeIds &&
      data.peopleInChargeIds
        .filter((item) => item.value !== '')
        .map((item) => ({ peopleInChargeId: item.value }));
    const tagIds = data.tagIds
      ? data.tagIds
          .filter((item) => item.value !== '')
          .map((item) => ({ tagId: item.value }))
      : [];

    const planList = data.plans
      ? data.plans
          .filter((item) => item.planStartDate !== null)
          .map((item) => {
            return {
              scheduleId: item.scheduleId || null,
              planStartDate:
                item.planStartDate && item.planStartTime
                  ? addTimeToDate(
                      item.planStartDate as Date,
                      item.planStartTime,
                    )
                  : null,
              planEndDate:
                item.planEndDate && item.planEndTime
                  ? addTimeToDate(item.planEndDate as Date, item.planEndTime)
                  : null,
            };
          })
      : null;
    const todoListData =
      data.todoList && data.todoList.filter((item) => item.content !== '');
    const newWorkCategories = [];
    if (data.categories.LARGE?.value) {
      newWorkCategories.push({
        categoryId:
          `${data.categories.LARGE.value}` == NO_OPTION_CATEGORY
            ? null
            : `${data.categories.LARGE.value}`,
        type: EventWorkCategory.LARGE,
      });
    }
    if (data.categories.MEDIUM.value) {
      newWorkCategories.push({
        categoryId:
          `${data.categories.MEDIUM.value}` == NO_OPTION_CATEGORY
            ? null
            : `${data.categories.MEDIUM.value}`,
        type: EventWorkCategory.MEDIUM,
      });
    }
    if (data.categories.SMALL.value) {
      newWorkCategories.push({
        categoryId:
          `${data.categories.SMALL.value}` == NO_OPTION_CATEGORY
            ? null
            : `${data.categories.SMALL.value}`,
        type: EventWorkCategory.SMALL,
      });
    }

    createTask({
      title: data.title || '',
      type: data.type ? data.type.value.toString() : '',
      statusId: data.statusId ? (data.statusId.value as number) : null,
      priority: data.priority ? data.priority.value.toString() : '',
      deadline:
        data.deadlineDate && data.deadlineTime
          ? addTimeToDate(data.deadlineDate as Date, data.deadlineTime)
          : null,
      description: data.description || '',
      tagIds: tagIds,
      peopleInChargeIds: peopleInChargeIds,
      isImportant: data.isImportant,
      todoList: todoListData,
      taskSchedules: planList && planList.length ? planList : null,
      chatRoomCode: chatRoomCode,
      sendToChat: true,
      categoryIds: newWorkCategories,
      organizationId: data.organization
        ? Number(data.organization.value)
        : null,
    });
  };
  //  Handle call api create task
  const handleCreateTask = async (data: TaskRequest) => {
    setIsLoading(true);
    return await api.post(apiRouters.CREATE_TASK, data);
  };
  // Handle create task and response
  const { mutate: createTask } = useMutation(
    'postCreateTask',
    handleCreateTask,
    {
      onSuccess: async () => {
        setShowModalTask(false);
      },
      onError: (error: AxiosError<any>) => {
        showErrorToast(error, ERROR_CREATE_MESSAGE);
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

  const handleConfirmEditEventCalendar = (
    data: EventEditFormData,
    sendToChat: boolean,
  ) => {
    const newWorkCategories = [];
    const newTagIds: number[] = [];
    let newType = '';
    let newStartDate = null;
    let newEndDate = null;

    if (data.tagIds) {
      data.tagIds
        .filter((item) => `${item.value}` !== '')
        .map((item) => newTagIds.push(item.value as number));
    }
    if (data.largeCategory && data.largeCategory?.value !== 'undefined') {
      newWorkCategories.push({
        categoryId:
          `${data.largeCategory.value}` == NO_OPTION_CATEGORY
            ? null
            : `${data.largeCategory.value}`,
        type: EventWorkCategory.LARGE,
      });
    }
    if (data.mediumCategory && data.mediumCategory?.value !== 'undefined') {
      newWorkCategories.push({
        categoryId:
          `${data.mediumCategory.value}` == NO_OPTION_CATEGORY
            ? null
            : `${data.mediumCategory.value}`,
        type: EventWorkCategory.MEDIUM,
      });
    }
    if (data.smallCategory && data.smallCategory?.value !== 'undefined') {
      newWorkCategories.push({
        categoryId:
          `${data.smallCategory.value}` == NO_OPTION_CATEGORY
            ? null
            : `${data.smallCategory.value}`,
        type: EventWorkCategory.SMALL,
      });
    }
    if (data.type) {
      newType = (data.type as OptionDropdownType).value as string;
    }
    if (data.startDate) {
      if (data.isAllDay) {
        newStartDate = addTimeToDate(
          data.startDate as Date,
          DEFAULT_START_TIME,
        );
      } else {
        if (data.startTime) {
          newStartDate = addTimeToDate(data.startDate as Date, data.startTime);
        }
      }
    }
    if (data.endDate) {
      if (data.isAllDay) {
        newEndDate = addTimeToDate(data.endDate as Date, DEFAULT_END_TIME);
      } else {
        if (data.endTime) {
          newEndDate = addTimeToDate(data.endDate as Date, data.endTime);
        }
      }
    }
    editEventCalendar({
      id: data.id,
      title: data.title || '',
      startDate: newStartDate,
      endDate: newEndDate,
      isAllDay: data.isAllDay || false,
      tagIds: newTagIds,
      participantIds: data.participantIds || [],
      address: data.address || '',
      memo: data.memo || '',
      type: newType,
      sendToChat,
      message: actionsEventMessage,
      categoryIds: newWorkCategories,
      organizationId: data.organization
        ? Number((data.organization as OptionDropdownType).value)
        : null,
    });
  };

  const handleEditEventCalendar = async (data: EventRequest) => {
    return await api.patch(apiRouters.SCHEDULE_DETAIL(`${data.id}`), data);
  };

  const { mutate: editEventCalendar } = useMutation(
    'editEventCalendar',
    handleEditEventCalendar,
    {
      onSuccess: async () => {
        setOpenConfirmEditEventModal(false);
        setBackToEditing(false);
        setConfirmEventDataToEdit(undefined);
        setActionsEventMessage('');
        showToast({
          description: SUCCESS_UPDATE_MESSAGE,
        });
      },
      onError: (error: AxiosError<any>) => {
        showErrorToast(error, ERROR_UPDATE_MESSAGE);
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

  const handleGetDataDetailEvent = async (id: string) => {
    setIsLoading(true);
    const { data: response } = await api.get(apiRouters.SCHEDULE_DETAIL(id));
    return response;
  };

  const { mutate: getDataDetailEvent } = useMutation(
    'getDetailEventCalendar',
    handleGetDataDetailEvent,
    {
      onSuccess: async (data) => {
        setOpenEditEventModal(true);
        setDataEventEdit(data);
      },
      onError: (error: AxiosError) => {
        if (error.response?.status === ServerStatusCode.NOT_FOUND) {
          showToast({
            variant: 'error',
            description: ERROR_NOT_FOUND_EVENT,
          });
        }
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

  const handleConfirmGetDataDetailEvent = (id: string) => {
    getDataDetailEvent(id);
  };

  const handleConfirmDeleteEventCalendar = (sendToChat: boolean) => {
    if (dataEventEdit) {
      deleteEventCalendar({ id: `${dataEventEdit.id}`, sendToChat });
      return;
    }
  };

  const handleDeleteEventCalendar = async (data: {
    id: string;
    sendToChat: boolean;
  }) => {
    return await api.delete(
      `${apiRouters.SCHEDULE_DETAIL(data.id)}?message=${encodeURIComponent(actionsEventMessage)}${data.sendToChat ? '&send_to_chat=true' : ''}`,
    );
  };

  const { mutate: deleteEventCalendar } = useMutation(
    'deleteEventCalendar',
    handleDeleteEventCalendar,
    {
      onSuccess: () => {
        setOpenConfirmDeleteEventModal(false);
        setConfirmEventDataToEdit(undefined);
        setBackToEditing(false);
        setActionsEventMessage('');
        showToast({
          description: SUCCESS_DELETE_MESSAGE,
        });
      },
      onError: (error: AxiosError<any>) => {
        showErrorToast(error, ERROR_DELETE_MESSAGE);
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

  const handleGetChatRoomDetail = async (params: {
    code: string;
    isRead: boolean;
  }) => {
    if (params.code !== 'null') {
      const apiUrl = params.isRead
        ? `${apiRouters.CHAT_DETAIL(params.code)}?is_read=${params.isRead}`
        : `${apiRouters.CHAT_DETAIL(params.code)}`;
      const { data: response } = await api.get(apiUrl);
      return response;
    }
  };

  const { mutate: getChatRoomDetail } = useMutation(
    'postGetChatRoomDetail',
    handleGetChatRoomDetail,
    {
      onSuccess: () => {},
    },
  );

  const handleSetParam = ({
    id,
    action,
  }: {
    id: string | null;
    action: string;
  }) => {
    if (id) {
      params.set('task', id);
    }
    params.set('action', action);
    router.push(`?${params.toString()}`);
    setShowModalTask(true);
  };

  const handleRemoveParam = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('task');
    params.delete('action');
    params.delete('type');

    router.replace(`?${params.toString()}`);
    setShowModalTask(false);
  };

  const renderImageRound = (type = '') => {
    if (type === ChatRoomType.GROUP) {
      return (
        <div className="rounded-full w-[58px] h-[58px] border-[2px] border-white flex items-center justify-center overflow-hidden">
          <ImageRound
            className="w-14 h-14 rounded-full"
            src="/icons/multi-users.svg"
            border="full"
            name="Multi users"
          />
        </div>
      );
    }
    if (type === ChatRoomType.TASK) {
      return (
        <div className="rounded-full w-[58px] h-[58px] border-[2px] border-white flex items-center justify-center overflow-hidden">
          <ImageRound
            className="w-14 h-14"
            src="/icons/document.svg"
            border="full"
            name="Task"
          />
        </div>
      );
    }
    if (type === ChatRoomType.SKILL) {
      return (
        <div className="rounded-full w-[58px] h-[58px] border-[2px] border-white flex items-center justify-center overflow-hidden">
          <ImageRound
            className="w-14 h-14"
            src="/icons/skill-room.svg"
            border="full"
            name="Task"
          />
        </div>
      );
    }
    return (
      <div className="rounded-full w-[58px] h-[58px] border-[2px] border-white flex items-center justify-center overflow-hidden">
        <ImageRound
          className="w-14 h-14"
          src="/images/avatar-default.svg"
          border="full"
          name="Avatar user"
        />
      </div>
    );
  };

  const getParticipantAvatars = (participants: any, isEditing: boolean) => {
    const slicedParticipants = participants.slice(0, 3);
    const remainingCount =
      participants.length > 3 ? participants.length - 3 : 0;

    return (
      <>
        {slicedParticipants.map((participant: any, index: number) => {
          const participantId = isEditing ? participant : participant.id;
          const avatarColor =
            dashboardMembers.find((member) => member.id == participantId)
              ?.avatarColor || '';
          return (
            <div className="h-6 ml-[-10px]" key={index}>
              {AvatarIconWithDynamicColor({ color: avatarColor, size: 33 })}
            </div>
          );
        })}
        {remainingCount > 0 && (
          <div className="ml-[-10px] flex items-center justify-center bg-[#97A9B2] rounded-full text-sm text-white w-[30px] h-[30px] mt-[2px]">
            +{remainingCount}
          </div>
        )}
      </>
    );
  };

  return (
    <Fragment>
      {chatRoomCode && (
        <div
          className="flex flex-col flex-grow w-[calc(100vw_-_600px)] !bg-[#F8FAFC] !h-[100vh]"
          onClick={() => {
            if (
              chatRoomNotifications &&
              chatRoomNotifications?.notifications > 0
            ) {
              getChatRoomDetail({ code: chatRoomCode, isRead: true });
            }
            setTotalNotifications((prevTotalNotifications) => {
              const chatRoomIndex = dataChatList.findIndex(
                (room) => room.code == chatRoomCode,
              );
              if (
                dataChatList &&
                chatRoomIndex != -1 &&
                dataChatList[chatRoomIndex] &&
                dataChatList[chatRoomIndex].unreadMessages
              ) {
                return (
                  prevTotalNotifications -
                  dataChatList[chatRoomIndex].unreadMessages
                );
              }
              return prevTotalNotifications;
            });
            setDataChatList((prevDataChatList) => {
              const newDataChatList = [...prevDataChatList];
              const chatRoomIndex = newDataChatList.findIndex(
                (room) => room.code == chatRoomCode,
              );
              if (
                newDataChatList &&
                chatRoomIndex != -1 &&
                newDataChatList[chatRoomIndex] &&
                newDataChatList[chatRoomIndex].unreadMessages
              ) {
                newDataChatList[chatRoomIndex].unreadMessages = 0;
              }
              return newDataChatList;
            });
            setFilteredChatList((prevFilterChatList) => {
              const newFilterChatList = [...prevFilterChatList];
              const chatRoomIndex = newFilterChatList.findIndex(
                (room) => room.code == chatRoomCode,
              );
              if (
                newFilterChatList &&
                chatRoomIndex != -1 &&
                newFilterChatList[chatRoomIndex] &&
                newFilterChatList[chatRoomIndex].unreadMessages
              ) {
                newFilterChatList[chatRoomIndex].unreadMessages = 0;
              }
              return newFilterChatList;
            });
            setChatRoomNotifications({
              notifications: 0,
              roomCode: chatRoomCode,
            });
          }}>
          <div
            className="flex justify-between items-center px-4 py-3 !w-full border-b-[2px] text-white"
            style={{
              background: showModalHeaderBackgroundColorByTime(),
            }}>
            <div className="flex items-center w-[60%]">
              {renderImageRound(chatRoomDetail?.type || roomDetail?.type)}
              <p className="text-[20px] font-bold truncate max-w-[calc(100%_-_370px)] ml-3">
                {chatRoomDetail
                  ? chatRoomCode &&
                    chatRoomNameEditing.find(
                      (room) => room.roomCode === chatRoomCode,
                    )
                    ? chatRoomNameEditing.find(
                        (room) => room.roomCode === chatRoomCode,
                      )?.roomName
                    : chatRoomDetail?.name
                  : chatRoomCode &&
                      chatRoomNameEditing.find(
                        (room) => room.roomCode === chatRoomCode,
                      )
                    ? chatRoomNameEditing.find(
                        (room) => room.roomCode === chatRoomCode,
                      )?.roomName
                    : roomDetail?.name}
              </p>
              <div className="max-w-[280px] w-[280px] ml-3">
                {!chatRoomDetail
                  ? roomDetail &&
                    roomDetail.type === ChatRoomType.GROUP && (
                      <div className="flex gap-2 items-center mt-1">
                        <p className="text-[13px] text-[#FFFFFFB2]">
                          メンバー
                          {roomDetail &&
                          chatRoomParticipantsEditing.find(
                            (room) => room.roomCode === roomDetail.code,
                          )
                            ? chatRoomParticipantsEditing.find(
                                (room) => room.roomCode === roomDetail.code,
                              )?.participantsList.length
                            : roomDetail?.participants?.length}
                          人
                        </p>
                        <div className="flex mt-[-3px]">
                          {roomDetail &&
                          chatRoomParticipantsEditing.find(
                            (room) => room.roomCode === roomDetail.code,
                          )
                            ? getParticipantAvatars(
                                chatRoomParticipantsEditing.find(
                                  (room) => room.roomCode === roomDetail.code,
                                )?.participantsList || [],
                                true,
                              )
                            : getParticipantAvatars(
                                roomDetail?.participants || [],
                                false,
                              )}
                        </div>
                        <Button
                          sz="sm"
                          className="w-fit text-xs min-w-[80px] !px-[10px] !py-[8px] !bg-[#FFFFFF4D] !border-none"
                          onClick={() => setOpenAddMembersBox(true)}
                          type="button">
                          招待する
                        </Button>
                      </div>
                    )
                  : chatRoomDetail &&
                    chatRoomDetail.type === ChatRoomType.GROUP && (
                      <div className="flex gap-2 items-center">
                        <p className="text-[13px] mr-3 text-[#FFFFFFB2]">
                          メンバー
                          {chatRoomDetail &&
                          chatRoomParticipantsEditing.find(
                            (room) => room.roomCode === chatRoomDetail.code,
                          )
                            ? chatRoomParticipantsEditing.find(
                                (room) => room.roomCode === chatRoomDetail.code,
                              )?.participantsList.length
                            : chatRoomDetail?.participants?.length}
                          人
                        </p>
                        <div className="flex mt-[-3px]">
                          {chatRoomDetail &&
                          chatRoomParticipantsEditing.find(
                            (room) => room.roomCode === chatRoomDetail.code,
                          )
                            ? getParticipantAvatars(
                                chatRoomParticipantsEditing.find(
                                  (room) =>
                                    room.roomCode === chatRoomDetail.code,
                                )?.participantsList || [],
                                true,
                              )
                            : getParticipantAvatars(
                                chatRoomDetail?.participants || [],
                                false,
                              )}
                        </div>
                        <Button
                          sz="sm"
                          className="w-fit min-w-[80px] text-xs !px-[10px] !py-[8px] !bg-[#FFFFFF4D] !border-none"
                          onClick={() => setOpenAddMembersBox(true)}
                          type="button">
                          招待する
                        </Button>
                      </div>
                    )}
              </div>
            </div>

            <div className="flex gap-2 items-center">
              <InputSearch
                placeholder="チャットルーム内のキーワードを検索"
                customSearchIconUrl="/icons/search-white.svg"
                inputClassName="!w-[290px] !py-2 rounded-[20px] text-sm !bg-[#F6F9FA4D] border-none placeholder-white"
                value={searchChatMsg}
                onChange={(e) => setSearchChatMsg(e.target.value)}
              />
              {session?.user.permissions &&
                hasPermissionInArray(
                  session?.user.permissions,
                  PermissionsSystem.CHAT_UPDATE,
                ) && (
                  <>
                    {[
                      ChatRoomType.GROUP,
                      ChatRoomType.TASK,
                      ChatRoomType.SKILL,
                    ].map(
                      (type) =>
                        ((chatRoomDetail?.code == chatRoomCode &&
                          chatRoomDetail?.type == type) ||
                          (roomDetail?.code == chatRoomCode &&
                            roomDetail?.type == type)) && (
                          <Tippy
                            content={'設定'}
                            arrow={false}
                            delay={1000}
                            key={type}
                            placement="top"
                            offset={[0, 5]}>
                            <div>
                              <ImageRound
                                className="w-10 h-10 hover:cursor-pointer"
                                src="/icons/setting-chat.svg"
                                border="full"
                                name="Setting icon"
                                onClick={() => setOpenSettingBox(true)}
                              />
                            </div>
                          </Tippy>
                        ),
                    )}
                  </>
                )}
            </div>
          </div>
          <div
            className={`${chatRoomDetail?.type == ChatRoomType.TASK || chatRoomDetail?.type == ChatRoomType.SKILL || roomDetail?.type == ChatRoomType.TASK || roomDetail?.type == ChatRoomType.SKILL ? 'h-[calc(100vh_-_200px)]' : 'h-[calc(100vh_-_450px)]'} pb-3 ${dataMessageDetail.length > 0 && !initialLoad ? 'overflow-y-auto' : 'overflow-y-hidden'}  overflow-x-hidden scrollbar-gutter-stable flex flex-col-reverse scroll-smooth`}>
            {dataMessageDetail &&
              chatRoomNotifications &&
              dataMessageDetail
                .slice(0, chatRoomNotifications.notifications)
                .map((item) => (
                  <div key={item.id}>
                    <MessageDetail
                      chatRoomDetail={chatRoomDetail}
                      messageDetail={item}
                      messageSubmitted={messageSubmitted}
                      msgIdUpdated={msgIdUpdated}
                      msgEditing={msgEditing}
                      roomDetail={roomDetail}
                      setMsgEditing={setMsgEditing}
                      setMessageSubmitted={setMessageSubmitted}
                      setMsgIdDeleted={setMsgIdDeleted}
                      setOpenConfirmDeleteModal={setOpenConfirmDeleteModal}
                      setMsgIdUpdated={setMsgIdUpdated}
                      handleConfirmUpdateMsg={handleConfirmUpdateMsg}
                      handleConfirmGetDataDetailEvent={
                        handleConfirmGetDataDetailEvent
                      }
                    />
                  </div>
                ))}
            {dataMessageDetail?.length > 0 &&
            chatRoomNotifications &&
            chatRoomNotifications.notifications > 0 ? (
              <div className="flex items-center gap-5 justify-center">
                <div className="wavy-line"></div>
                <p className="text-[13px] text-[#0068B6]">未読のメッセージ</p>
                <div className="wavy-line"></div>
              </div>
            ) : null}
            {dataMessageDetail &&
              chatRoomNotifications &&
              dataMessageDetail
                .slice(
                  chatRoomNotifications.notifications,
                  dataMessageDetail.length,
                )
                .map((item) => (
                  <div key={item.id}>
                    <MessageDetail
                      chatRoomDetail={chatRoomDetail}
                      messageDetail={item}
                      messageSubmitted={messageSubmitted}
                      msgIdUpdated={msgIdUpdated}
                      msgEditing={msgEditing}
                      roomDetail={roomDetail}
                      setMsgEditing={setMsgEditing}
                      setMessageSubmitted={setMessageSubmitted}
                      setMsgIdDeleted={setMsgIdDeleted}
                      setOpenConfirmDeleteModal={setOpenConfirmDeleteModal}
                      setMsgIdUpdated={setMsgIdUpdated}
                      handleConfirmUpdateMsg={handleConfirmUpdateMsg}
                      handleConfirmGetDataDetailEvent={
                        handleConfirmGetDataDetailEvent
                      }
                    />
                  </div>
                ))}
            <div
              ref={ref}
              className="h-[calc(100vh_-_450px)] mt-3 w-full bg-[rgb(229, 231, 235)] relative">
              <div>
                {initialLoad ? (
                  <div className="flex flex-col items-end">
                    <RowSkeleton className="!h-[100px] w-[300px] mb-2" />
                    <RowSkeleton className="!h-[200px] w-[400px] mb-2" />
                    <RowSkeleton
                      numberOfRows={2}
                      className="!h-[50px] w-[500px]"
                    />
                  </div>
                ) : (
                  <div className="w-full h-6"></div>
                )}
              </div>
            </div>
          </div>
          {[ChatRoomType.GROUP, ChatRoomType.PRIVATE, ChatRoomType.SELF].map(
            (type) =>
              (chatRoomDetail?.type == type || roomDetail?.type == type) && (
                <div
                  key={type}
                  className="px-8 py-3 !box-border max-w-[100%] border-t-[#D2DBE1] border-t-[1px]">
                  <div className="flex justify-between items-center">
                    <div className="flex gap-1 items-center">
                      <Tippy
                        content={'メンション'}
                        arrow={false}
                        delay={1000}
                        placement="top"
                        offset={[0, 8]}>
                        <div className="hover:bg-[#77858F26] rounded-full p-[7px] hover:cursor-pointer">
                          <ImageRound
                            name="Mention"
                            src="/icons/mention.svg"
                            className="w-[16px] h-[16px]"
                          />
                        </div>
                      </Tippy>
                      <Tippy
                        content={'リアクション'}
                        arrow={false}
                        delay={1000}
                        placement="top"
                        offset={[0, 8]}>
                        <div className="hover:bg-[#77858F26] rounded-full p-[7px] hover:cursor-pointer">
                          <ImageRound
                            name="Smile"
                            src="/icons/smile.svg"
                            className="w-[16px] h-[16px]"
                          />
                        </div>
                      </Tippy>
                      <Tippy
                        content={'ファイルを送信'}
                        arrow={false}
                        delay={1000}
                        placement="top"
                        offset={[0, 8]}>
                        <div className="hover:bg-[#77858F26] rounded-full p-[7px] hover:cursor-pointer">
                          <ImageRound
                            name="Add file"
                            src="/icons/add-file.svg"
                            className="w-[16px] h-[16px]"
                          />
                        </div>
                      </Tippy>

                      {session?.user.permissions &&
                        hasPermissionInArray(
                          session?.user.permissions,
                          PermissionsSystem.MY_TASK_ADD,
                        ) && (
                          <Tippy
                            content={'タスクを引用'}
                            arrow={false}
                            delay={1000}
                            placement="top"
                            offset={[0, 8]}>
                            <div className="hover:bg-[#77858F26] rounded-full p-[7px] hover:cursor-pointer">
                              <ImageRound
                                name="Quote checker"
                                src="/icons/quote-checker.svg"
                                className="w-[18px] h-[18px]"
                                onClick={() => {
                                  handleSetParam({
                                    id: null,
                                    action: ActionTask.CREATE,
                                  });
                                }}
                              />
                            </div>
                          </Tippy>
                        )}
                      <Tippy
                        content={'書式設定'}
                        arrow={false}
                        delay={1000}
                        placement="top"
                        offset={[0, 8]}>
                        <p className="!font-thin text-[#77858F] hover:bg-[#77858F26] rounded-full p-[3px] hover:cursor-pointer flex justify-between items-center w-8 h-8">
                          <span className="w-[20px] ml-1 mt-[-3px]">Aa</span>
                        </p>
                      </Tippy>
                    </div>

                    <div className="flex items-center">
                      {session?.user.permissions &&
                        hasPermissionInArray(
                          session?.user.permissions,
                          PermissionsSystem.CHAT_ADD,
                        ) && (
                          <Button
                            className="w-[100px]"
                            type="submit"
                            onClick={handleConfirmSendMessage}
                            disabled={
                              trimUnnecessaryLineBreaks(message as string) ===
                              ''
                            }>
                            送信
                          </Button>
                        )}
                    </div>
                  </div>
                  <Quill
                    text={message}
                    setText={setMessage}
                    messageSubmitted={messageSubmitted}
                    setMessageSubmitted={setMessageSubmitted}
                    placeholder="メッセージを入力"
                  />
                </div>
              ),
          )}
        </div>
      )}
      {openSettingBox && (
        <ChatSettingModal
          open={true}
          onClose={() => setOpenSettingBox(false)}
          code={`${chatRoomCode}`}
        />
      )}
      {openAddMembersBox && (
        <ActionsChatMembersModal
          open={true}
          onClose={() => setOpenAddMembersBox(false)}
          participantsList={
            chatRoomCode &&
            chatRoomParticipantsEditing.find(
              (room) => room.roomCode === chatRoomCode,
            )
              ? chatRoomParticipantsEditing.find(
                  (room) => room.roomCode === chatRoomCode,
                )?.participantsList
              : getChatParticipantIds(
                  chatRoomDetail
                    ? chatRoomDetail.participants
                    : roomDetail?.participants,
                )
          }
          code={`${chatRoomCode}`}
        />
      )}
      {openConfirmDeleteModal && (
        <ConfirmDeleteModal
          open={openConfirmDeleteModal}
          type="メッセージ"
          onConfirm={handleConfirmDeleteMessage}
          onClose={() => setOpenConfirmDeleteModal(false)}
        />
      )}
      {openEditEventModal && (
        <ActionsEventModal
          open={openEditEventModal}
          dataEvent={dataEventEdit}
          action={ActionsEvent.EDIT}
          onClose={() => {
            setDataEventEdit(undefined);
            setOpenEditEventModal(false);
            setBackToEditing(false);
          }}
          onEdit={(data) => {
            setConfirmEventDataToEdit(data);
            setOpenEditEventModal(false);
            setOpenConfirmEditEventModal(true);
          }}
          onDelete={(data) => {
            setConfirmEventDataToEdit(data);
            setOpenEditEventModal(false);
            setOpenConfirmDeleteEventModal(true);
          }}
          creationDataEventCalendar={creationDataEventCalendar}
          backToEditing={backToEditing}
        />
      )}
      {openConfirmEditEventModal && (
        <ConfirmActionsEventModal
          open={openConfirmEditEventModal}
          type={ActionsEvent.EDIT}
          setActionsEventMessage={setActionsEventMessage}
          onSend={() => {
            setIsLoading(true);
            handleConfirmEditEventCalendar(
              confirmEventDataToEdit as EventEditFormData,
              true,
            );
          }}
          onRejectSend={() => {
            setIsLoading(true);
            handleConfirmEditEventCalendar(
              confirmEventDataToEdit as EventEditFormData,
              false,
            );
          }}
          onClose={() => {
            setDataEventEdit(undefined);
            setConfirmEventDataToEdit(undefined);
            setOpenConfirmEditEventModal(false);
            setBackToEditing(false);
            setActionsEventMessage('');
          }}
          onBackToEditModal={() => {
            setOpenEditEventModal(true);
            setOpenConfirmEditEventModal(false);
            setDataEventEdit(confirmEventDataToEdit);
            setBackToEditing(true);
            setActionsEventMessage('');
          }}
        />
      )}
      {openConfirmDeleteEventModal && (
        <ConfirmActionsEventModal
          open={openConfirmDeleteEventModal}
          type={ActionsEvent.DELETE}
          setActionsEventMessage={setActionsEventMessage}
          onSend={() => {
            setIsLoading(true);
            handleConfirmDeleteEventCalendar(true);
          }}
          onRejectSend={() => {
            setIsLoading(true);
            handleConfirmDeleteEventCalendar(false);
          }}
          onClose={() => {
            setDataEventEdit(undefined);
            setConfirmEventDataToEdit(undefined);
            setOpenConfirmDeleteEventModal(false);
            setBackToEditing(false);
            setActionsEventMessage('');
          }}
          onBackToEditModal={() => {
            setOpenEditEventModal(true);
            setOpenConfirmDeleteEventModal(false);
            setDataEventEdit(confirmEventDataToEdit);
            setBackToEditing(true);
            setActionsEventMessage('');
          }}
        />
      )}
      {isShowModalTask && (
        <ActionsTaskModal
          open={isShowModalTask}
          columnId={`${StatusValueTask.NOT_STARTED}`}
          action={ActionTask.CREATE}
          dataTask={dataTaskEdit}
          peopleDefaultId={`${session?.user.id}`}
          disableDeleteAction={true}
          onClose={() => {
            setDataTaskEdit(null);
            handleRemoveParam();
          }}
          onSubmit={handleConfirmCreateTask}
          dashboardMemberList={dashboardMemberList}
          creationDataTaskData={creationDataTaskData}
        />
      )}
    </Fragment>
  );
};

export default ChatDetail;
