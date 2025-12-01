'use client';
import {
  ChangeEvent,
  Dispatch,
  memo,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Editor, EditorContent, useEditor } from '@tiptap/react';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Document } from '@tiptap/extension-document';
import { Text } from '@tiptap/extension-text';
import { Mention } from '@tiptap/extension-mention';
import { Placeholder } from '@tiptap/extension-placeholder';

import ImageRound from '@components/common/ImageRound';
import Button from '@components/common/Button';
import { DynamicTooltip } from '@components/tooltip/DynamicTooltip';
import { CustomReaction } from '@components/chat/CustomIcon';
import { ChatMentionMembersList } from './ChatMentionMembersModal';
import Modal from '../common/Modal';

import { ChatRoomType, ReactionIconValue } from '@constants/enums';
import { REACTION_LIST } from '@constants';

import { ChatParticipant, ChatRoomDetail } from '@interfaces/chat';
import { Profile } from '@interfaces/user';

import { trimUnnecessaryLineBreaks } from '@utils';
import { TaskQuote } from '@components/chat/CustomTaskQuote';
import { MsgQuote } from '@components/chat/CustomMsgQuote';
import { MsgQuoteText } from '@components/chat/CustomMsgQuoteText';
import { MsgReply } from '@components/chat/CustomMsgReply';

export type ChatUploadingFilesModalProps = {
  message: string;
  uploadFiles: {
    uuid: string;
    file: File;
  }[];
  chatRoomDetail: ChatRoomDetail | undefined;
  preserveFiles: {
    uuid: string;
    file: {
      name: string;
    };
  }[];
  mentionMemberOptions: (
    | ChatParticipant
    | {
        id: number;
        fullName: string;
      }
  )[];
  searchMentionMembers: string;
  mentionMembers: ChatParticipant[];
  dashboardMemberList: Omit<Profile, 'birthday' | 'gender'>[];
  setMentionMembers: Dispatch<SetStateAction<ChatParticipant[]>>;
  handleCheckboxClick: (
    editor: Editor,
    member: ChatParticipant,
    type: string,
  ) => void;
  setSearchMentionMembers: Dispatch<SetStateAction<string>>;
  setPreserveFiles: Dispatch<
    SetStateAction<
      {
        uuid: string;
        file: {
          name: string;
        };
      }[]
    >
  >;
  setMessage: Dispatch<SetStateAction<string>>;
  setUploadFiles: Dispatch<
    SetStateAction<
      {
        uuid: string;
        file: File;
      }[]
    >
  >;
  handleFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
};

const ChatUploadingFilesModal = memo(
  ({
    message,
    uploadFiles,
    preserveFiles,
    chatRoomDetail,
    mentionMemberOptions,
    searchMentionMembers,
    mentionMembers,
    dashboardMemberList,
    setMentionMembers,
    handleCheckboxClick,
    setSearchMentionMembers,
    setPreserveFiles,
    setMessage,
    setUploadFiles,
    handleFileChange,
    open,
    onClose,
    onSubmit,
  }: ChatUploadingFilesModalProps) => {
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // Icon
    const [isShowListIcon, setIsShowListIcon] = useState(false);
    const optionIconRef = useRef<HTMLDivElement | null>(null);

    const editor = useEditor({
      extensions: [
        Document,
        Paragraph,
        Text,
        TaskQuote,
        MsgQuote,
        MsgQuoteText,
        MsgReply,
        Mention.configure({
          HTMLAttributes: {
            class: 'mention text-primary',
          },
        }),
        Placeholder.configure({
          placeholder: 'メッセージを入力',
        }),
        CustomReaction,
      ],
      content: message,
      onUpdate: ({ editor }: { editor: Editor }) => {
        setMessage(editor.getHTML());
      },
      immediatelyRender: false,
    });

    // Function to insert reaction into editor
    const insertReaction = (reaction: {
      name: string;
      src: string;
      value: ReactionIconValue;
    }) => {
      editor
        ?.chain()
        .focus()
        .insertContent({
          type: 'customReaction',
          attrs: {
            src: reaction.src,
            name: reaction.name,
          },
        })
        .run();
    };

    useEffect(() => {
      const handleClickOutside = (event: any) => {
        if (
          optionIconRef.current &&
          !optionIconRef.current.contains(event.target)
        ) {
          setIsShowListIcon(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, []);

    return (
      <Modal
        open={open}
        isOutSideAction={false}
        className="font-primary  text-gray-700 !p-0 w-[600px]"
        titleClassName="!text-[14px] !text-[#5B6770] !font-medium"
        headerClassName="bg-[#EBF1F7] !rounded-t-[20px]  !rounded-b-none px-5 !py-[10px]"
        closeIconClassName="!bg-white !rounded-full !p-[7px] !hover:cursor-pointer !shadow-sm"
        closeClassName="!mt-0 !w-4 !h-4 !hover:cursor-pointer"
        contentClass="!w-[600px] !rounded-[20px] "
        overlayClassName="!bg-transparent "
        onClose={() => {
          onClose();
        }}
        title="ファイルの送信">
        <div className="mx-5">
          <div className="flex gap-1 mb-4">
            {chatRoomDetail?.type == ChatRoomType.GROUP && (
              <>
                <ChatMentionMembersList
                  editor={editor}
                  mentionMemberOptions={mentionMemberOptions}
                  searchMentionMembers={searchMentionMembers}
                  mentionMembers={mentionMembers}
                  dashboardMemberList={dashboardMemberList}
                  customModalPosition={'left-[-110px] top-[35px]'}
                  customArrowPosition={'after:bottom-full after:border-b-white'}
                  setMentionMembers={setMentionMembers}
                  handleCheckboxClick={handleCheckboxClick}
                  setSearchMentionMembers={setSearchMentionMembers}
                />
              </>
            )}
            <div
              onClick={() => setIsShowListIcon(!isShowListIcon)}
              className="relative">
              <DynamicTooltip content={'リアクション'} placement="top">
                <div className="hover:bg-[#77858F26] rounded-full p-[7px] hover:cursor-pointer">
                  <ImageRound
                    name="Smile"
                    src="/icons/smile.svg"
                    className="w-[16px] h-[16px]"
                  />
                </div>
              </DynamicTooltip>
              {isShowListIcon && (
                <div
                  style={{
                    boxShadow: '0px 4px 8px 0px #0000000F',
                  }}
                  ref={optionIconRef}
                  className="w-[190px] h-[44px] absolute after:content-[''] after:absolute  after:top-full after:left-1/2 after:-translate-x-1/2 after:border-8 after:border-transparent after:border-t-white rounded-lg top-[-54px] bg-white flex items-center gap-3 justify-center left-[-81px]">
                  {REACTION_LIST.map((icon) => {
                    return (
                      <DynamicTooltip
                        content={icon.tooltipContent}
                        key={icon.name}
                        placement="top">
                        <div
                          onClick={() => insertReaction(icon)}
                          className={` rounded-ful`}>
                          <ImageRound
                            name={icon.name}
                            src={icon.src}
                            className="w-fit h-fit hover:cursor-pointer hover:opacity-60"
                          />
                        </div>
                      </DynamicTooltip>
                    );
                  })}
                </div>
              )}
            </div>
            {/* TODO: Implement Aa chat */}
            {/* <DynamicTooltip content={'書式設定'} placement="top">
              <p className="!font-thin text-[#77858F] hover:bg-[#77858F26] rounded-full p-[3px] hover:cursor-pointer flex justify-between items-center w-8 h-8">
                <span className="w-[20px] ml-1 mt-[-3px]">Aa</span>
              </p>
            </DynamicTooltip> */}
          </div>
          <div className="mb-3">
            <EditorContent
              editor={editor}
              className="w-full break-all whitespace-pre-wrap chat"
            />
          </div>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="max-h-[200px] mb-3 overflow-y-auto flex flex-col gap-[6px]">
            {[...uploadFiles, ...preserveFiles].map((uploadFile, index) => {
              return (
                <div
                  key={index}
                  className="bg-[#EBF1F7] px-[14px] h-[38px] !w-full rounded-[4px] flex justify-between items-center">
                  <p className="text-black text-sm font-normal max-w-[500px] truncate">
                    {uploadFile.file.name}
                  </p>
                  <DynamicTooltip content={'取り消し'} placement="top">
                    <div>
                      <ImageRound
                        className={`w-5 h-5 hover:cursor-pointer`}
                        src="/icons/close.svg"
                        name="Close modal"
                        onClick={() => {
                          setPreserveFiles((prev) => {
                            const updatedPreserveFiles = [...prev];
                            return updatedPreserveFiles.filter(
                              (file) => file.uuid != uploadFile.uuid,
                            );
                          });
                          setUploadFiles((prev) => {
                            const updatedPreserveFiles = [...prev];
                            return updatedPreserveFiles.filter(
                              (file) => file.uuid != uploadFile.uuid,
                            );
                          });
                        }}
                      />
                    </div>
                  </DynamicTooltip>
                </div>
              );
            })}
          </div>

          <div
            className="flex gap-[6px] justify-center items-center hover:cursor-pointer"
            onClick={() => {
              fileInputRef.current?.click();
            }}>
            <ImageRound
              src="/icons/add-chat.svg"
              name="Add icon"
              className="!w-[18px] !h-[18px] text-gray-400 hover:cursor-pointer cursor-pointer"
            />
            <p className="text-[#77858F] text-[14px] font-medium">
              ファイルを追加
            </p>
          </div>
          <div className="flex justify-center gap-[10px] my-[30px] items-center">
            <Button
              variant="primary"
              className="w-[100px] !h-[36px] !p-0"
              onClick={onSubmit}
              disabled={
                trimUnnecessaryLineBreaks(message as string) === '' &&
                [...uploadFiles, ...preserveFiles].length == 0
              }>
              送信
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="w-[100px] !h-[36px] !p-0">
              キャンセル
            </Button>
          </div>
        </div>
      </Modal>
    );
  },
);

export default ChatUploadingFilesModal;
