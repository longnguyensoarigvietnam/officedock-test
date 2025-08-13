import React, {
  Dispatch,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useMutation } from 'react-query';

import ImageRound from '@components/common/ImageRound';
import RowSkeleton from '@components/skeleton/RowSkeleton';

import { PAGINATION_PAGE_SIZE_HIGHT } from '@constants';
import { apiRouters } from '@constants/routers';

import useChatFileMemoChat from '@hooks/useChatFileMemoChat';

import { getTruncatedFileName, handleDownloadFile } from '@utils';
import { ChatMessageResponse, DataChatFileMemo } from '@interfaces/chat';
import api from '@base/api';
import { DynamicTooltip } from '@components/tooltip/DynamicTooltip';
import ConfirmDeleteModal from '@components/modals/ConfirmDeleteModal';

type Props = {
  initialLoad: boolean;
  chatRoomCode: string;
  dataFileAddList: DataChatFileMemo[];
  onGotoMessage: (data: { messageId: string | number }) => void;
  setDataMessageDetail: Dispatch<SetStateAction<ChatMessageResponse[]>>;
  setDataFileAddList: React.Dispatch<React.SetStateAction<DataChatFileMemo[]>>;
};

const TabFileChat = ({
  initialLoad,
  chatRoomCode,
  dataFileAddList,
  setDataMessageDetail,
  onGotoMessage,
  setDataFileAddList,
}: Props) => {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [openConfirmDeleteModal, setOpenConfirmDeleteModal] = useState(false);
  const [dataDelete, setDataDelete] = useState<{
    uuid: string;
    msgUuid: string;
  }>();

  const [dataFiles, setDataFiles] = useState<DataChatFileMemo[]>([]);
  const { isFetchingFileMemoChat } = useChatFileMemoChat({
    roomCode: chatRoomCode,
    pagination: {
      page: page,
      pageSize: PAGINATION_PAGE_SIZE_HIGHT,
    },
    onSuccess: (data) => {
      setDataFiles((prev) => [...prev, ...data.results]);
      setHasNext(data.hasNext ?? false);
    },
  });

  useEffect(() => {
    setDataFiles([]);
  }, [chatRoomCode]);

  useEffect(() => {
    if (!hasNext) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPage((prev) => prev + 1);
        }
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: 1.0,
      },
    );

    if (bottomRef.current) observer.observe(bottomRef.current);

    return () => {
      if (bottomRef.current) observer.unobserve(bottomRef.current);
    };
  }, [hasNext]);

  useEffect(() => {
    if (dataFileAddList && dataFileAddList.length > 0) {
      setDataFiles((prev) => {
        const seen = new Set(prev.map((item) => item.uuid));
        const newItems = dataFileAddList.filter((item) => !seen.has(item.uuid));
        return [...newItems, ...prev];
      });
      setDataFileAddList([]);
    }
  }, [dataFileAddList, setDataFileAddList]);

  // Handle delete task
  const handleDeleteFileChat = async (id: string) => {
    const { data: response } = await api.delete(apiRouters.FILE_DETAIL(id));
    return response;
  };

  const { mutate: deleteFileChat } = useMutation(
    'deleteFileChat',
    handleDeleteFileChat,
    {
      onSuccess: async () => {},
      onError: () => {},
      onSettled: () => {
        setOpenConfirmDeleteModal(false);
      },
    },
  );
  const handleDeleteFileChart = (uuid: string, msgUuid: string) => {
    setOpenConfirmDeleteModal(true);
    setDataDelete({
      msgUuid,
      uuid,
    });
  };
  const handleConfirmDeleteFile = () => {
    setDataFiles(dataFiles.filter((file) => file.uuid !== dataDelete?.uuid));

    setDataMessageDetail((prev) => {
      return prev.map((item) => {
        if (item.uuid === dataDelete?.msgUuid) {
          return {
            ...item,
            chatFiles: item.chatFiles.filter(
              (file) => file.uuid !== dataDelete?.uuid,
            ),
          };
        }
        return item;
      });
    });
    deleteFileChat(dataDelete?.uuid || '');
  };

  return (
    <>
      {isFetchingFileMemoChat && dataFiles.length == 0 ? (
        <div>
          <RowSkeleton numberOfRows={10} className="!h-[50px]" />
        </div>
      ) : (
        <div className="overflow-y-auto max-h-[calc(100vh_-_286px)] ">
          {dataFiles.map((file) => {
            const { id, fileName, originalFile, fileType } = file;

            const isImage = fileType.startsWith('image/');
            const isPDF = fileType === 'application/pdf';

            return (
              <div
                key={id}
                className={`flex gap-[10px] w-full relative group items-center border-b py-[10px] border-[#CED8DE]`}>
                {isImage ? (
                  <ImageRound
                    src={originalFile}
                    className="w-10 h-10 object-cover rounded border"
                    name={fileName}
                  />
                ) : isPDF ? (
                  <ImageRound
                    src={'/icons/pdf_default.svg'}
                    className="w-10 h-10 object-cover rounded border"
                    name={fileName}
                  />
                ) : (
                  <div className="w-10 h-10 flex items-center justify-center border rounded bg-gray-50 text-gray-400 text-sm">
                    FILE
                  </div>
                )}
                <div
                  className="max-w-[210px] text-sm break-all"
                  title={fileName}>
                  {getTruncatedFileName(fileName)}
                </div>

                <div className="w-20 h-7 hidden group-hover:flex absolute right-0 top-1/2 transform -translate-y-1/2   rounded-[3px] bg-[#5B6770] gap-x-3  items-center justify-center">
                  <DynamicTooltip content={'メッセージに移動'} placement="top">
                    <ImageRound
                      src="/icons/go-file.svg"
                      className="w-fit h-fit object-cover cursor-pointer hover:opacity-75"
                      name={fileName}
                      onClick={() => {
                        if (initialLoad) return;
                        onGotoMessage({
                          messageId: file.chatMessageId,
                        });
                      }}
                    />
                  </DynamicTooltip>
                  <DynamicTooltip content={'ダウンロード'} placement="top">
                    <ImageRound
                      src="/icons/download.svg"
                      className="w-fit h-fit object-cover cursor-pointer hover:opacity-75"
                      name={fileName}
                      onClick={() =>
                        handleDownloadFile(file.originalFile, file.fileName)
                      }
                    />
                  </DynamicTooltip>
                  <DynamicTooltip content={'削除'} placement="top">
                    <ImageRound
                      src="/icons/delete-event.svg"
                      className="w-fit h-fit object-cover cursor-pointer hover:opacity-75"
                      name={fileName}
                      onClick={() =>
                        handleDeleteFileChart(
                          String(file.uuid),
                          file.chatMessageUuid,
                        )
                      }
                    />
                  </DynamicTooltip>
                </div>
              </div>
            );
          })}
          {hasNext && (
            <div ref={bottomRef}>
              <RowSkeleton numberOfRows={2} className="!h-[50px]" />
            </div>
          )}
        </div>
      )}
      {openConfirmDeleteModal && (
        <ConfirmDeleteModal
          open={openConfirmDeleteModal}
          type="ファイル"
          onConfirm={handleConfirmDeleteFile}
          onClose={() => setOpenConfirmDeleteModal(false)}
        />
      )}
    </>
  );
};

export default TabFileChat;
