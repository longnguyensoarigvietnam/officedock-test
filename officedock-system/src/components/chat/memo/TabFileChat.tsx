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

import { getTruncatedFileName } from '@utils';
import { ChatMessageResponse, DataChatFileMemo } from '@interfaces/chat';
import api from '@base/api';

type Props = {
  chatRoomCode: string;
  dataFileAddList: DataChatFileMemo[];
  onGotoMessage: (data: { messageId: string | number }) => void;
  setDataMessageDetail: Dispatch<SetStateAction<ChatMessageResponse[]>>;
};

const TabFileChat = ({
  chatRoomCode,
  dataFileAddList,
  setDataMessageDetail,
  onGotoMessage,
}: Props) => {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);

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
    if (dataFileAddList) {
      setDataFiles((prev) => [...dataFileAddList, ...prev]);
    }
  }, [dataFileAddList]);

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
      onSettled: () => {},
    },
  );
  const handleDeleteFileChart = (id: string, uuid: string, msgUuid: string) => {
    setDataFiles(dataFiles.filter((file) => file.uuid !== uuid));

    setDataMessageDetail((prev) => {
      return prev.map((item) => {
        if (item.uuid === msgUuid) {
          return {
            ...item,
            chatFiles: item.chatFiles.filter((file) => file.uuid !== uuid),
          };
        }
        return item;
      });
    });
    deleteFileChat(uuid);
  };

  const handleDownload = (url: string, filename: string) => {
    fetch(url)
      .then((res) => res.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl); // cleanup
      });
  };

  return isFetchingFileMemoChat && dataFiles.length == 0 ? (
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
            <div className="max-w-[210px] text-sm break-all" title={fileName}>
              {getTruncatedFileName(fileName)}
            </div>

            <div className="w-20 h-7 hidden group-hover:flex absolute right-0 top-1/2 transform -translate-y-1/2   rounded-[3px] bg-[#5B6770] gap-x-3  items-center justify-center">
              <ImageRound
                src="/icons/go-file.svg"
                className="w-fit h-fit object-cover cursor-pointer hover:opacity-75"
                name={fileName}
                onClick={() =>
                  onGotoMessage({
                    messageId: file.chatMessageId,
                  })
                }
              />
              <ImageRound
                src="/icons/download.svg"
                className="w-fit h-fit object-cover cursor-pointer hover:opacity-75"
                name={fileName}
                onClick={() => handleDownload(file.originalFile, file.fileName)}
              />
              <ImageRound
                src="/icons/delete-event.svg"
                className="w-fit h-fit object-cover cursor-pointer hover:opacity-75"
                name={fileName}
                onClick={() =>
                  handleDeleteFileChart(
                    String(id),
                    String(file.uuid),
                    file.chatMessageUuid,
                  )
                }
              />
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
  );
};

export default TabFileChat;
