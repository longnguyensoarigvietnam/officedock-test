import { format } from 'date-fns';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Dispatch, Fragment, SetStateAction } from 'react';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';

import AvatarIconWithDynamicColor from '@components/common/AvatarIcon';
import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';
import Quill from '@components/common/Quill';

import {
  ADD_MEMBER_TASK_MESSAGE,
  CREATION_TASK_MESSAGE,
  DATE_FORMAT,
  DELETED_SKILL_UP_MESSAGE,
  EVENT_BEFORE_EDITED,
  EVENT_CREATED,
  EVENT_DELETED,
  EVENT_EDITED,
  MESSAGE_DELETED,
  NO_SETTING,
  REMOVE_MEMBER_TASK_MESSAGE,
  SKILL_UP_MESSAGE,
  TASK_DELETED,
} from '@constants';
import { ChatRoomType, MessageType, PermissionsSystem } from '@constants/enums';
import { pageRouters } from '@constants/routers';

import {
  ChatDashboardMember,
  ChatMessageResponse,
  ChatRoomDetail,
} from '@interfaces/chat';

import { formatWithParagraphTags, hasPermissionInArray, trimUnnecessaryLineBreaks } from '@utils';
import {
  convertToCurrentTimezone,
  convertToTimeString,
  formatCheckDate,
  getFormattedDateTime,
  getJapaneseDayName,
} from '@utils/date';

export type MessageDetailProps = {
  chatRoomDetail: ChatRoomDetail | undefined;
  messageDetail: ChatMessageResponse;
  messageSubmitted?: boolean;
  msgIdUpdated?: string;
  msgEditing?: string;
  dashboardMembers: ChatDashboardMember[];
  setMsgIdUpdated?: Dispatch<SetStateAction<string | undefined>>;
  setMessageSubmitted?: Dispatch<SetStateAction<boolean>>;
  setOpenConfirmDeleteModal: Dispatch<SetStateAction<boolean>>;
  setMsgIdDeleted?: Dispatch<SetStateAction<string | undefined>>;
  setMsgEditing?: Dispatch<SetStateAction<string | undefined>>;
  handleConfirmUpdateMsg: (uuid: string) => void;
  handleConfirmGetDataDetailEvent: (id: string) => void;
};

export const MessageDetail = ({
  chatRoomDetail,
  messageDetail,
  messageSubmitted,
  msgIdUpdated,
  msgEditing,
  dashboardMembers,
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

  const renderAvatar = (senderId: number) => {
    const avatarColor =
      dashboardMembers.find((member) => member.id === senderId)?.avatarColor ||
      '';

    return (
      <div className="h-6">
        {AvatarIconWithDynamicColor({
          color: avatarColor,
          size: 36,
        })}
      </div>
    );
  };

  return (
    <Fragment>
      <div className="group my-6">
        {(chatRoomDetail?.type === ChatRoomType.PRIVATE ||
          chatRoomDetail?.type === ChatRoomType.GROUP ||
          chatRoomDetail?.type === ChatRoomType.SELF) && (
          <div
            className={`flex !box-border group-hover:bg-[#FFFFFF] py-1 ml-5 mr-3 group-hover:rounded-md`}>
            {renderAvatar(messageDetail.sender.id)}
            <div className={`ml-3 w-full pr-5`}>
              <div className="flex justify-between items-center">
                <div className="flex gap-2 font-semibold text-sm pb-2">
                  <p>{messageDetail.sender.fullName} </p>
                  <p className="font-normal text-[10px] truncate max-w-[400px]">
                    {messageDetail.sender.organizations &&
                      messageDetail.sender.organizations.map(
                        (organization, index) => (
                          <span
                            key={
                              organization.id
                            }>{`${organization.name}${messageDetail.sender.organizations && messageDetail.sender.organizations.length - 1 !== index ? '、' : ''}`}</span>
                        ),
                      )}
                  </p>
                </div>
                <div className={`flex items-start`}>
                  <p className="font-medium text-xs text-[#77858F]">
                    {messageDetail.createdAt &&
                      formatCheckDate(
                        getFormattedDateTime(
                          convertToCurrentTimezone(messageDetail.createdAt),
                        ),
                      )}
                  </p>
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
              </div>
              <div className="relative">
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
                          className={`bg-white group-hover:flex hidden rounded-3xl px-3 py-1.5 shadow-md absolute left-1/2 transform -translate-x-1/2 items-center gap-2`}>
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
                                      content={'削除'}
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
            className={`flex !box-border group-hover:bg-[#FFFFFF] py-3 ml-5 mr-3 group-hover:rounded-md`}>
            {messageDetail.type !== MessageType.MESSAGE ? (
              <ImageRound
                className="w-10 h-10"
                src="/icons/document.svg"
                border="full"
                name="Task"
              />
            ) : (
              <div>{renderAvatar(messageDetail.sender.id)}</div>
            )}
            <div className={`ml-3 w-full pr-5`}>
              <div className="flex justify-between items-center">
                {messageDetail.type !== MessageType.MESSAGE ? (
                  <p className="font-semibold text-sm pb-2">タスクカード</p>
                ) : (
                  <div className="flex gap-2 font-semibold text-sm pb-2">
                    <p>{messageDetail.sender.fullName} </p>
                    <p className="font-normal text-[10px] truncate max-w-[400px]">
                      {messageDetail.sender.organizations &&
                        messageDetail.sender.organizations.map(
                          (organization, index) => (
                            <span
                              key={
                                organization.id
                              }>{`${organization.name}${messageDetail.sender.organizations && messageDetail.sender.organizations.length - 1 !== index ? '、' : ''}`}</span>
                          ),
                        )}
                    </p>
                  </div>
                )}
                <div className={`flex items-start`}>
                  <p className="font-medium text-xs text-[#77858F]">
                    {messageDetail.createdAt &&
                      formatCheckDate(
                        getFormattedDateTime(
                          convertToCurrentTimezone(messageDetail.createdAt),
                        ),
                      )}
                  </p>
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
              </div>
              <div className="relative">
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
                          className={`bg-white group-hover:flex hidden rounded-3xl px-3 py-1.5 shadow-md absolute left-1/2 transform -translate-x-1/2 items-center gap-2`}>
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
                                      content={'削除'}
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
            className={`flex !box-border group-hover:bg-[#FFFFFF] py-1 ml-5 mr-3 group-hover:rounded-md`}>
            {messageDetail.type !== MessageType.MESSAGE ? (
              <ImageRound
                className="w-10 h-10"
                src="/icons/skill-room.svg"
                border="full"
                name="Skill"
              />
            ) : (
              <div>{renderAvatar(messageDetail.sender.id)}</div>
            )}
            <div className={`ml-3 w-full pr-5`}>
              <div className="flex justify-between items-center">
                {messageDetail.type !== MessageType.MESSAGE ? (
                  <p className="font-semibold text-sm pb-2">スキルアップ</p>
                ) : (
                  <div className="flex gap-2 font-semibold text-sm pb-2">
                    <p>{messageDetail.sender.fullName} </p>
                    <p className="font-normal text-[10px] truncate max-w-[400px]">
                      {messageDetail.sender.organizations &&
                        messageDetail.sender.organizations.map(
                          (organization, index) => (
                            <span
                              key={
                                organization.id
                              }>{`${organization.name}${messageDetail.sender.organizations && messageDetail.sender.organizations.length - 1 !== index ? '、' : ''}`}</span>
                          ),
                        )}
                    </p>
                  </div>
                )}
                <div className={`flex items-start`}>
                  <p className="font-medium text-xs text-[#77858F]">
                    {messageDetail.createdAt &&
                      formatCheckDate(
                        getFormattedDateTime(
                          convertToCurrentTimezone(messageDetail.createdAt),
                        ),
                      )}
                  </p>
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
              </div>
              <div className="relative">
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
                          className={`bg-white group-hover:flex hidden rounded-3xl px-3 py-1.5 shadow-md absolute left-1/2 transform -translate-x-1/2 items-center gap-2`}>
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
                                      content={'削除'}
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
