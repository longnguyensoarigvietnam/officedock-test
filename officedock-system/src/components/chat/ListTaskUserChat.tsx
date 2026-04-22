import React, {
  Dispatch,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useSearchParams } from 'next/navigation';

import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';
import InputSearch from '@components/common/InputSearch';
import useTaskUserChat from '@hooks/useTaskUserChat';
import RowSkeleton from '@components/skeleton/RowSkeleton';
import { DynamicTooltip } from '@components/tooltip/DynamicTooltip';

import useDebounceText from '@hooks/useDebounceText';
import { NO_DATA_AVAILABLE } from '@constants';

interface ListTaskUserProps {
  quoteTaskList: {
    id: number;
    title: string;
  }[];
  setQuoteTaskList: Dispatch<
    SetStateAction<
      {
        id: number;
        title: string;
      }[]
    >
  >;
  handleQuoteTaskUser: (
    data: {
      id: number;
      title: string;
    }[],
  ) => void;
}

const ListTaskUserChat = ({
  quoteTaskList,
  setQuoteTaskList,
  handleQuoteTaskUser,
}: ListTaskUserProps) => {
  const searchParams = useSearchParams();

  const room = searchParams.get('room');
  const [page, setPage] = useState<number>(1);

  const [isShowList, setIsShowList] = useState(false);

  const boxListRef = useRef<HTMLDivElement | null>(null);
  const [isMyTask, setIsMyTask] = useState(true);

  const [searchTask, setSearchTask] = useState<string>('');

  const searchTaskDebounce = useDebounceText(searchTask, 1000);

  const {
    taskUserChatList,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoadingList,
  } = useTaskUserChat({
    roomCode: isMyTask ? '' : (room as string),
    search: searchTaskDebounce,
  });

  const resultsContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      const archiveTaskContainer = resultsContainerRef.current;
      if (
        archiveTaskContainer &&
        hasNextPage &&
        !isFetchingNextPage &&
        archiveTaskContainer.clientHeight +
          Math.abs(archiveTaskContainer.scrollTop) >=
          archiveTaskContainer.scrollHeight - 10
      ) {
        fetchNextPage();
      }
    };

    const archiveTaskContainer = resultsContainerRef.current;

    if (archiveTaskContainer) {
      archiveTaskContainer.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (archiveTaskContainer) {
        archiveTaskContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleClosePopover = (event: MouseEvent) => {
    if (
      boxListRef.current &&
      !boxListRef.current.contains(event.target as Node)
    ) {
      setIsShowList(false);
      setSearchTask('');
    }
  };

  useEffect(() => {
    document.addEventListener('click', handleClosePopover, true);
    return () => {
      document.removeEventListener('click', handleClosePopover, true);
    };
  }, [handleClosePopover]);

  const handleToggleSelect = (id: number, title: string) => {
    setQuoteTaskList((prev) => {
      const exists = prev.some((item) => item.id === id);
      if (exists) {
        return prev.filter((item) => item.id !== id);
      } else {
        return [...prev, { id, title }];
      }
    });
  };

  return (
    <div className="relative z-20">
      <DynamicTooltip content={'タスクを引用'} placement="top">
        <div
          className="hover:bg-[#77858F26] relative rounded-full p-[7px] hover:cursor-pointer"
          onClick={() => {
            setIsShowList(true);
          }}>
          <ImageRound
            name="Quote checker"
            src="/icons/quote-checker.svg"
            className="w-[16px] h-[16px]"
          />
        </div>
      </DynamicTooltip>

      <div
        ref={boxListRef}
        style={{
          boxShadow: '0px 4px 8px 0px #0000000F',
        }}
        className={`${!isShowList && '!hidden'} absolute after:content-[''] after:absolute  after:top-full after:left-1/2 after:-translate-x-1/2 after:border-8 after:border-transparent after:border-t-white  left-[-158px] p-[10px] bottom-10 w-[350px] h-[calc(100vh_-_491px)] min-h-[315px] rounded-lg bg-white`}>
        <div className="flex justify-center items-center gap-2 py-5">
          <Button
            onClick={() => {
              if (!isMyTask) {
                setPage(1);
                setIsMyTask(true);
              }
            }}
            variant={isMyTask ? 'primary' : 'outline'}
            className={`!py-0 !px-0 font-bold w-[90px] h-6 
              !rounded-[20px] text-xs  ${isMyTask ? '' : '!text-[#A7B7C2] !border-[#A7B7C2]'}`}>
            マイタスク
          </Button>
          <Button
            disabled={true}
            variant={!isMyTask ? 'primary' : 'outline'}
            className={`${!isMyTask ? '' : '!text-[#A7B7C2] !border-[#A7B7C2]'} !py-0 !px-0 font-bold w-[90px] h-6 !rounded-[20px] text-xs`}>
            チームタスク
          </Button>
        </div>
        <div className="mb-[10px]">
          <InputSearch
            placeholder="タスクを検索"
            value={searchTask}
            inputClassName="!border-[#77858F] h-9"
            onChange={(e) => {
              if (page !== 1) {
                setPage(1);
              }
              setSearchTask(e.target.value);
            }}
          />
        </div>

        <div
          ref={resultsContainerRef}
          className="h-[calc(100vh_-_679px)] min-h-[135px] overflow-y-auto scroll-smooth flex flex-col gap-[6px]">
          {isLoadingList && (
            <RowSkeleton numberOfRows={2} className="!h-[50px]" />
          )}
          {!isLoadingList && (
            <>
              {taskUserChatList.length > 0 ? (
                taskUserChatList.map((item) => {
                  const isSelected = quoteTaskList.some(
                    (selected) => selected.id === item.id,
                  );

                  return (
                    <p
                      key={item.id}
                      onClick={() => handleToggleSelect(item.id, item.title)}
                      className={`${
                        isSelected ? 'border !border-[#0068B6]' : ' '
                      } px-4 break-all py-[11px] border border-transparent text-sm text-black font-medium rounded-md bg-[#EBF1F7]`}>
                      {item.title}
                    </p>
                  );
                })
              ) : (
                <p className="text-center">{NO_DATA_AVAILABLE}</p>
              )}
            </>
          )}
          {isFetchingNextPage && (
            <div className="mt-2">
              <RowSkeleton numberOfRows={2} className="h-[50px]" />
            </div>
          )}
        </div>

        <div className="flex items-center mt-[10px] justify-center">
          <Button
            onClick={() => {
              handleQuoteTaskUser(quoteTaskList);
              setQuoteTaskList([]);
              setIsShowList(false);
              setSearchTask('');
            }}
            className="!py-0 !px-0 h-[38px] w-[150px] flex items-center justify-center">
            タスクを引用する
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ListTaskUserChat;
