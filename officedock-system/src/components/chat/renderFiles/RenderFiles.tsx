'use client';
import React, { Dispatch, SetStateAction } from 'react';
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
import SafeImage from './SafeImage';

type Props = {
  uuidList: ChatFileResponse[];
  uuidMain?: any[];
  isSearchRoom?: boolean;
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
  isSearchRoom = false,
  messageDetail,
  dashboardMemberList,
  downloadFileName,
  setDataPreviewFile,
}: Props) => {
  const filteredFiles = messageDetail?.chatFiles.filter((file) =>
    uuidMain?.includes(file.uuid),
  );
  return (
    <div className="flex flex-col gap-2 !w-[100%]">
      {filteredFiles?.length > 0 &&
        filteredFiles.map((file) => {
          const newFile = uuidList.find((item) => item.uuid === file.uuid);
          if (!newFile) return null;

          return (
            <div
              key={newFile.uuid}
              className="flex justify-between items-center !w-[100%]">
              <div className="bg-white border-[#D2DBE1] border-[1px] rounded-[6px] p-[14px] flex gap-2 items-center !w-[calc(100%_-_100px)]">
                {newFile.fileType.includes('image') && (
                  <SafeImage
                    src={getFileURL(newFile.compressedFile || '')}
                    alt="Image"
                    width={150}
                    height={100}
                    unoptimized
                  />
                )}

                <p
                  onClick={() =>
                    downloadFileName && downloadFileName(newFile.uuid)
                  }
                  data-id={messageDetail.uuid}
                  className={`text-primary cursor-pointer font-medium text-[14px] break-all max-w-full ${
                    newFile.fileType.includes('image')
                      ? 'max-w-[calc(100%_-_200px)]'
                      : 'max-w-[100%]'
                  }`}>
                  {newFile.fileName}
                </p>
              </div>

              {(newFile.fileType.includes('image') ||
                newFile.fileType.includes('pdf')) &&
                !isSearchRoom && (
                  <Button
                    onClick={() => {
                      const memberInfo = dashboardMemberList.find(
                        (member) => member.id === messageDetail.sender.id,
                      );

                      setDataPreviewFile({
                        msgId: String(messageDetail.id),
                        createAt: String(messageDetail.createdAt),
                        user: {
                          id: messageDetail.sender.id,
                          avatarColor: memberInfo?.avatarColor || '',
                          avatarUrl: memberInfo?.avatar || '',
                          fullName: messageDetail.sender.fullName,
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
        })}
    </div>
  );
};

export default RenderFiles;
