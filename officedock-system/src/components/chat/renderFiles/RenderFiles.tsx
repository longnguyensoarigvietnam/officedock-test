'use client';
import React, { Dispatch, SetStateAction } from 'react';
import Image from 'next/image';
import { UseMutateFunction } from 'react-query';

import Button from '@components/common/Button';
import { getFileURL } from '@utils';

import {
  ChatDashboardMember,
  ChatFileDetailResponse,
  ChatFileResponse,
  ChatMessageResponse,
} from '@interfaces/chat';
import { Profile } from '@interfaces/user';

type Props = {
  uuidList: ChatFileResponse[];
  uuidMain?: any[];
  messageDetail: ChatMessageResponse;
  dashboardMemberList: Omit<Profile, 'birthday' | 'gender'>[];
  downloadFileName?: UseMutateFunction<
    ChatFileDetailResponse,
    unknown,
    string,
    unknown
  >;
  setDataPreviewFile: Dispatch<
    SetStateAction<{
      msgId: string;
      file: ChatFileResponse;
      user: ChatDashboardMember;
      createAt: string;
    } | null>
  >;
};

const RenderFiles = ({
  uuidList,
  uuidMain,
  messageDetail,
  dashboardMemberList,
  downloadFileName,
  setDataPreviewFile,
}: Props) => {
  return (
    <div className="flex flex-col gap-2 !w-[100%]">
      {messageDetail?.chatFiles &&
        messageDetail?.chatFiles.length > 0 &&
        messageDetail?.chatFiles.map((file) => {
          const uuidArray = uuidList.map((item) => item.uuid);

          if (uuidArray.includes(file.uuid)) {
            const newFile = uuidList.find((data) => data.uuid === file.uuid);

            if (!newFile) return null;
            return (
              <div
                key={newFile.uuid}
                className="flex justify-between items-center !w-[100%]">
                <div className="bg-white border-[#D2DBE1] border-[1px] rounded-[6px] p-[14px] flex gap-2 items-center !w-[calc(100%_-_100px)]">
                  {newFile.fileType.includes('image') && (
                    <div>
                      <Image
                        src={getFileURL(newFile?.compressedFile || '')}
                        alt="Image"
                        unoptimized={true}
                        width={150}
                        height={100}
                      />
                    </div>
                  )}
                  <p
                    onClick={() =>
                      downloadFileName && downloadFileName(newFile.uuid)
                    }
                    data-id={messageDetail.uuid}
                    className={`text-primary cursor-pointer font-medium text-[14px] break-all max-w-full ${
                      newFile.fileType.includes('image')
                        ? 'max-w-[calc(100%_-_200px)]'
                        : 'max-w-[calc(100%)]'
                    }`}>
                    {newFile.fileName}222
                  </p>
                </div>
                {(newFile.fileType.includes('image') ||
                  newFile.fileType.includes('pdf')) && (
                  <Button
                    onClick={() => {
                      const memberInfo = dashboardMemberList.find(
                        (member) => member.id === messageDetail.sender.id,
                      );
                      setDataPreviewFile({
                        msgId: String(messageDetail.id) || '',
                        createAt: String(messageDetail.createdAt),
                        user: {
                          id: messageDetail.sender?.id,
                          avatarColor: memberInfo?.avatarColor || '',
                          avatarUrl: memberInfo?.avatar || '',
                          fullName: messageDetail.sender?.fullName,
                        },
                        file: newFile,
                      });
                    }}
                    className="font-medium w-[84px] h-[30px] !rounded-[6px] text-xs !px-0"
                    variant="outline">
                    プレビュー
                  </Button>
                )}
              </div>
            );
          }
          if (uuidMain && uuidMain.includes(file.uuid)) {
            return (
              <div
                key={file.uuid}
                className="flex justify-between items-center !w-[100%]">
                <div className="bg-white border-[#D2DBE1] border-[1px] rounded-[6px] p-[14px] flex gap-2 items-center !w-[calc(100%_-_100px)]">
                  {file.fileType.includes('image') && (
                    <div>
                      <Image
                        src={getFileURL(file?.compressedFile || '')}
                        alt="Image"
                        unoptimized={true}
                        width={150}
                        height={100}
                      />
                    </div>
                  )}
                  <p
                    onClick={() =>
                      downloadFileName && downloadFileName(file.uuid)
                    }
                    data-id={messageDetail.uuid}
                    className={`text-primary cursor-pointer font-medium text-[14px] break-all max-w-full ${
                      file.fileType.includes('image')
                        ? 'max-w-[calc(100%_-_200px)]'
                        : 'max-w-[calc(100%)]'
                    }`}>
                    {file.fileName}
                  </p>
                </div>
                {(file.fileType.includes('image') ||
                  file.fileType.includes('pdf')) && (
                  <Button
                    onClick={() => {
                      const memberInfo = dashboardMemberList.find(
                        (member) => member.id === messageDetail.sender.id,
                      );
                      setDataPreviewFile({
                        msgId: String(messageDetail.id) || '',
                        createAt: String(messageDetail.createdAt),
                        user: {
                          id: messageDetail.sender?.id,
                          avatarColor: memberInfo?.avatarColor || '',
                          avatarUrl: memberInfo?.avatar || '',
                          fullName: messageDetail.sender?.fullName,
                        },
                        file: file,
                      });
                    }}
                    className="font-medium w-[84px] h-[30px] !rounded-[6px] text-xs !px-0"
                    variant="outline">
                    プレビュー
                  </Button>
                )}
              </div>
            );
          }
          return null;
        })}
    </div>
  );
};

export default RenderFiles;
