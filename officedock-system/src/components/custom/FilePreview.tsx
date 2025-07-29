import React, { useEffect, useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

import Heading from '@components/common/Heading';
import Modal from '@components/common/Modal';
import ImageRound from '@components/common/ImageRound';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import { SkeletonElement } from '@components/common/SkeletonLoading';

import useFileDetail from '@hooks/useDetailFile';

import { ChatDashboardMember, ChatFileResponse } from '@interfaces/chat';
import { formatJapaneseDatetime, getFileURL, handleDownloadFile } from '@utils';
import { DynamicTooltip } from '@components/tooltip/DynamicTooltip';

interface filePreviewProp {
  open: boolean;
  file: ChatFileResponse;
  user: ChatDashboardMember;
  msgId: string;
  createAt: string;
  onClose: () => void;
  onGotoMessage: (data: { messageId: string | number }) => void;
}

const FilePreview = ({
  open,
  file,
  user,
  msgId,
  onClose,
  onGotoMessage,
}: filePreviewProp) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileUuid, setFileUuid] = useState<string>('');
  useEffect(() => {
    if (file) {
      setFileUuid(file.uuid);
    }
  }, [file]);

  const { fileDetail, isFetchingFileDetail } = useFileDetail({
    fileUuid: fileUuid,
    onSuccess: (data) => {
      setPreviewUrl(data.originalFile);
    },
  });
  const handleNextFile = () => {
    if (fileDetail && fileDetail.files.nextFile) {
      setFileUuid(fileDetail?.files.nextFile?.uuid);
    }
  };
  const handlePrevFile = () => {
    if (fileDetail && fileDetail.files.previousFile) {
      setFileUuid(fileDetail?.files.previousFile?.uuid);
    }
  };

  return (
    <Modal
      open={open}
      className="font-primary bg-white !w-[1000px] !rounded-[20px] !pt-0 !px-0 !pb-10"
      contentClass="!bg-transparent !w-[1000px]"
      isOutSideAction
      onClose={onClose}>
      <header className="flex px-4 h-[50px]  rounded-tl-[20px] rounded-tr-[20px]  bg-[#EBF1F7] border-solid border-gray-100 justify-between items-center">
        <Heading
          className="leading-10  text-sm font-medium !text-[#5B6770]"
          as="h1">
          {file.fileName}
        </Heading>
        <div
          className={` w-[30px] h-[30px] flex items-center justify-center rounded-full bg-white`}>
          <ImageRound
            className={` w-4 h-4 hover:cursor-pointer `}
            src="/icons/close.svg"
            name="Close modal"
            onClick={onClose}
          />
        </div>
      </header>
      <div className="bg-white pt-5 px-[46px] text-[#77858F] text-[13px] min-h-[500px] font-medium relative">
        {fileDetail && fileDetail.files.previousFile && (
          <div className="absolute top-1/2 left-5 transform -translate-y-1/2">
            <DynamicTooltip content={'前のファイルへ'} placement="top">
              <ImageRound
                className={` w-fit h-fit hover:cursor-pointer `}
                src="/icons/chevron-left-pagination.svg"
                name="Prev icon"
                onClick={handlePrevFile}
              />
            </DynamicTooltip>
          </div>
        )}
        {fileDetail && fileDetail.files.nextFile && (
          <div className="absolute top-1/2 right-5 transform -translate-y-1/2">
            <DynamicTooltip content={'次のファイルへ'} placement="top">
              <ImageRound
                className={` w-fit h-fit hover:cursor-pointer `}
                src="/icons/chevron-right-pagination.svg"
                name="Next icon"
                onClick={handleNextFile}
              />
            </DynamicTooltip>
          </div>
        )}
        {!isFetchingFileDetail && previewUrl ? (
          <div className="preview-container">
            {/* Preview Image with Zoom */}
            {file.fileType.startsWith('image/') && (
              <div className="w-full max-w-full mx-auto  ">
                <TransformWrapper
                  wheel={{
                    disabled: true,
                  }}
                  initialScale={1}
                  minScale={0.5}
                  maxScale={4}>
                  {({ zoomIn, zoomOut }) => (
                    <>
                      {/* Zoom Buttons */}
                      <div className="flex items-center w-full justify-between">
                        <div className="flex items-center gap-[14px] mb-5">
                          <div className="flex items-center gap-2 h-6">
                            <CustomUserAvatar
                              avatarUrl={user?.avatarUrl || ''}
                              avatarColor={user?.avatarColor || ''}
                              size={36}
                            />
                            <p className="max-w-20 line-clamp-2">
                              {user.fullName}
                            </p>
                          </div>
                          <div className="h-full  border-r border-l px-[14px] border-[#D2DBE1]">
                            アップロード日 ：{' '}
                            {fileDetail?.createdAt &&
                              formatJapaneseDatetime(fileDetail.createdAt)}
                          </div>
                          <div>
                            サイズ： {fileDetail?.fileSize.toFixed(2)}MB
                          </div>
                        </div>
                        <div className="flex  items-center gap-3">
                          <DynamicTooltip content={'縮小'} placement="top">
                            <ImageRound
                              className={` w-fit h-fit hover:cursor-pointer `}
                              src="/icons/zoom-out.svg"
                              name="zoom out icon"
                              onClick={() => zoomOut()}
                            />
                          </DynamicTooltip>
                          <DynamicTooltip content={'拡大'} placement="top">
                            <ImageRound
                              className={` w-fit h-fit hover:cursor-pointer `}
                              src="/icons/zoom-in.svg"
                              name="zoom in icon"
                              onClick={() => zoomIn()}
                            />
                          </DynamicTooltip>
                          <DynamicTooltip
                            content={'メッセージに移動'}
                            placement="top">
                            <ImageRound
                              src="/icons/go-file-gray.svg"
                              className="w-fit h-fit object-cover cursor-pointer hover:opacity-75 ml-5"
                              name="go file  icon"
                              onClick={() =>
                                onGotoMessage({
                                  messageId: msgId,
                                })
                              }
                            />
                          </DynamicTooltip>
                          <DynamicTooltip
                            content={'ダウンロード'}
                            placement="top">
                            <ImageRound
                              src="/icons/download-gray.svg"
                              className="w-fit h-fit object-cover cursor-pointer hover:opacity-75 ml-5"
                              name={'download icon'}
                              onClick={() =>
                                handleDownloadFile(
                                  fileDetail?.originalFile || '',
                                  fileDetail?.fileName || '',
                                )
                              }
                            />
                          </DynamicTooltip>
                        </div>
                      </div>

                      {/* Image preview with zoom */}
                      <TransformComponent contentClass="w-full">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={previewUrl ? getFileURL(previewUrl) : ''}
                          alt="preview"
                          className="max-w-full h-auto mx-auto"
                        />
                      </TransformComponent>
                    </>
                  )}
                </TransformWrapper>
              </div>
            )}

            {/* PDF preview */}
            {file.fileType === 'application/pdf' && (
              <div>
                {/* Zoom Buttons */}
                <div className="flex items-center w-full justify-between">
                  <div className="flex items-center gap-[14px] mb-5">
                    <div className="flex items-center gap-2 h-6">
                      <CustomUserAvatar
                        avatarUrl={user?.avatarUrl || ''}
                        avatarColor={user?.avatarColor || ''}
                        size={36}
                      />
                      <p className="max-w-20 line-clamp-2">{user.fullName}</p>
                    </div>
                    <div className="h-full  border-r border-l px-[14px] border-[#D2DBE1]">
                      アップロード日 ：{' '}
                      {fileDetail?.createdAt &&
                        formatJapaneseDatetime(fileDetail.createdAt)}
                    </div>
                    <div>サイズ： {fileDetail?.fileSize.toFixed(2)}MB</div>
                  </div>
                </div>
                <iframe
                  src={previewUrl ? getFileURL(previewUrl) : ''}
                  title="PDF Preview"
                  width="100%"
                  height="600px"
                  className="border rounded"
                />
              </div>
            )}
          </div>
        ) : (
          <SkeletonElement className="min-h-[500px]" />
        )}
      </div>
    </Modal>
  );
};

export default FilePreview;
