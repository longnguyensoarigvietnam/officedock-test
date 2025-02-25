'use client';
import {
  ChangeEvent,
  Dispatch,
  memo,
  SetStateAction,
  useRef,
  useState,
} from 'react';
import { Editor, EditorContent, useEditor } from '@tiptap/react';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Document } from '@tiptap/extension-document';
import { Text } from '@tiptap/extension-text';
import { Mention } from '@tiptap/extension-mention';
import { Placeholder } from '@tiptap/extension-placeholder';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';

import Modal from '../common/Modal';
import ImageRound from '@components/common/ImageRound';
import Button from '@components/common/Button';

import { ChatRoomType } from '@constants/enums';
import {
  ChatDashboardMember,
  ChatParticipant,
  ChatRoomDetail,
} from '@interfaces/chat';

import { ChatMentionMembersModal } from './ChatMentionMembersModal';
import { trimUnnecessaryLineBreaks } from '@utils';

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
  mentionMemberModalPosition: {
    left: number;
    top?: number;
    bottom?: number;
  };
  mentionMemberOptions: (
    | ChatParticipant
    | {
        id: number;
        fullName: string;
      }
  )[];
  searchMentionMembers: string;
  mentionMembers: ChatParticipant[];
  dashboardMembers: ChatDashboardMember[];
  setMentionMembers: Dispatch<SetStateAction<ChatParticipant[]>>;
  handleCheckboxClick: (
    editor: Editor,
    member: ChatParticipant,
    type: string,
  ) => void;
  setSearchMentionMembers: Dispatch<SetStateAction<string>>;
  setMentionMemberModalPosition: Dispatch<
    SetStateAction<{
      left: number;
      top?: number;
      bottom?: number;
    }>
  >;
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
    mentionMemberModalPosition,
    mentionMemberOptions,
    searchMentionMembers,
    mentionMembers,
    dashboardMembers,
    setMentionMembers,
    handleCheckboxClick,
    setSearchMentionMembers,
    setMentionMemberModalPosition,
    setPreserveFiles,
    setMessage,
    setUploadFiles,
    handleFileChange,
    open,
    onClose,
    onSubmit,
  }: ChatUploadingFilesModalProps) => {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [openMentionMembersModal, setOpenMentionMembersModal] =
      useState<boolean>(false);

    const editor = useEditor({
      extensions: [
        Document,
        Paragraph,
        Text,
        Mention.configure({
          HTMLAttributes: {
            class: 'mention text-[#0068B6]',
          },
        }),
        Placeholder.configure({
          placeholder: 'メッセージを入力',
        }),
      ],
      content: message,
      onUpdate: ({ editor }: { editor: Editor }) => {
        setMessage(editor.getHTML());
      },
    });

    return (
      <Modal
        open={open}
        isOutSideAction={false}
        className="font-primary !rounded-xl text-gray-700 !p-0 w-[600px] "
        titleClassName="!text-[14px] !text-[#5B6770] !font-medium"
        headerClassName="bg-[#EBF1F7] !rounded-t-xl !rounded-b-none px-6 py-4"
        closeIconClassName="!bg-white !rounded-full !p-2 !hover:cursor-pointer !shadow-sm"
        closeClassName="!mt-0 opacity-70 !w-4 !h-4 !hover:cursor-pointer"
        contentClass="!w-[600px]"
        onClose={() => {
          onClose();
        }}
        title="ファイルの送信">
        <div className="mx-5">
          <div className="flex gap-1 mb-4">
            {chatRoomDetail?.type == ChatRoomType.GROUP && (
              <>
                <Tippy
                  content={'メンション'}
                  arrow={false}
                  delay={1000}
                  placement="top"
                  offset={[0, 8]}>
                  <div
                    className="hover:bg-[#77858F26] rounded-full p-[7px] flex items-center justify-center hover:cursor-pointer"
                    onClick={() => {
                      setMentionMemberModalPosition({
                        left: 20,
                        top: 125,
                      });
                      setOpenMentionMembersModal(true);
                    }}>
                    <ImageRound
                      name="Mention"
                      src="/icons/mention.svg"
                      className="w-[16px] h-[16px]"
                    />
                  </div>
                </Tippy>
              </>
            )}
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
          <div className="mb-3">
            <EditorContent editor={editor} />
          </div>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="max-h-[200px] overflow-y-auto">
            {[...uploadFiles, ...preserveFiles].map((uploadFile, index) => {
              return (
                <div
                  key={index}
                  className="bg-[#EBF1F7] p-[14px] !w-full mb-2 flex justify-between items-center">
                  <p className="text-black text-sm font-normal max-w-[500px] truncate">
                    {uploadFile.file.name}
                  </p>
                  <Tippy
                    content={'取り消し'}
                    arrow={false}
                    delay={1000}
                    placement="top"
                    offset={[0, 3]}>
                    <div>
                      <ImageRound
                        className={`mt-1 w-5 h-5 hover:cursor-pointer`}
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
                  </Tippy>
                </div>
              );
            })}
          </div>

          <div
            className="flex gap-2 justify-center items-center hover:cursor-pointer"
            onClick={() => {
              fileInputRef.current?.click();
            }}>
            <ImageRound
              src="/icons/add-chat.svg"
              name="Add icon"
              className="!w-[17px] !h-[17px] text-gray-400 hover:cursor-pointer cursor-pointer"
            />
            <p className="text-[#77858F] text-[14px] font-medium">
              ファイルを追加
            </p>
          </div>
          <div className="flex justify-center gap-3 my-7 items-center">
            <Button
              variant="primary"
              className="w-[110px]"
              onClick={onSubmit}
              disabled={
                trimUnnecessaryLineBreaks(message as string) === '' &&
                [...uploadFiles, ...preserveFiles].length == 0
              }>
              送信
            </Button>
            <Button variant="outline" onClick={onClose} className="w-[110px]">
              キャンセル
            </Button>
          </div>
        </div>
        {openMentionMembersModal && (
          <ChatMentionMembersModal
            editor={editor}
            mentionMemberModalPosition={mentionMemberModalPosition}
            mentionMemberOptions={mentionMemberOptions}
            searchMentionMembers={searchMentionMembers}
            mentionMembers={mentionMembers}
            dashboardMembers={dashboardMembers}
            setMentionMembers={setMentionMembers}
            handleCheckboxClick={handleCheckboxClick}
            setSearchMentionMembers={setSearchMentionMembers}
            onClose={() => {
              setOpenMentionMembersModal(false);
              setSearchMentionMembers('');
            }}
          />
        )}
      </Modal>
    );
  },
);

export default ChatUploadingFilesModal;
