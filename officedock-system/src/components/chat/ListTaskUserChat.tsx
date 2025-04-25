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

import { TaskUserListChat } from '@interfaces/chat';
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
  const [pageSearch, setPageSearch] = useState<number>(1);

  const [isShowList, setIsShowList] = useState(false);
  const listTaskUerRef = useRef<HTMLDivElement | null>(null);
  const listTaskUerSearchRef = useRef<HTMLDivElement | null>(null);

  const boxListRef = useRef<HTMLDivElement | null>(null);
  const [isMyTask, setIsMyTask] = useState(true);

  const [hasNext, setHasNext] = useState(false);

  const [dataTaskList, setDataTaskList] = useState<TaskUserListChat[]>([]);
  const [dataTaskSearch, setDataTaskSearch] = useState<TaskUserListChat[]>([]);

  const [searchTask, setSearchTask] = useState<string>('');

  const searchTaskDebounce = useDebounceText(searchTask, 1000);

  useTaskUserChat({
    page: searchTaskDebounce ? pageSearch : page,
    roomCode: isMyTask ? '' : (room as string),
    search: searchTaskDebounce,
    isShowList: true,
    onSuccess: (data) => {
      if (searchTaskDebounce) {
        if (pageSearch > 1) {
          setDataTaskSearch((prev) => {
            const newMessages = data.results.filter(
              (newMsg) =>
                !(prev || []).some(
                  (existingMsg) => existingMsg.id === newMsg.id,
                ),
            );
            return [...(prev || []), ...newMessages];
          });
        } else {
          setDataTaskSearch(data.results);
        }
      } else {
        setDataTaskList((prev) => {
          const newMessages = data.results.filter(
            (newMsg) =>
              !(prev || []).some((existingMsg) => existingMsg.id === newMsg.id),
          );
          return [...(prev || []), ...newMessages];
        });
      }
      setHasNext(data.hasNext as boolean);
    },
  });

  useEffect(() => {
    if (!isShowList) {
      setDataTaskSearch([]);
      setSearchTask('');
      setPageSearch(1);
      setPage(1);
      setQuoteTaskList([]);
    }
  }, [isShowList]);

  useEffect(() => {
    const handleScroll = () => {
      const chatContainer = listTaskUerRef.current;

      if (
        chatContainer &&
        hasNext &&
        chatContainer.scrollTop + chatContainer.clientHeight ===
          chatContainer.scrollHeight
      ) {
        setPage((prevPage) => prevPage + 1);
      }
    };

    const chatContainer = listTaskUerRef.current;

    if (chatContainer) {
      chatContainer.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (chatContainer) {
        chatContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, [hasNext, isShowList]);

  // Scroll Search
  useEffect(() => {
    const handleScroll = () => {
      const chatContainer = listTaskUerSearchRef.current;

      if (
        chatContainer &&
        hasNext &&
        chatContainer.scrollTop + chatContainer.clientHeight ===
          chatContainer.scrollHeight
      ) {
        setPageSearch((prevPage) => prevPage + 1);
      }
    };

    const chatContainer = listTaskUerSearchRef.current;

    if (chatContainer) {
      chatContainer.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (chatContainer) {
        chatContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, [hasNext, isShowList, searchTaskDebounce]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleClosePopover = (event: MouseEvent) => {
    if (
      boxListRef.current &&
      !boxListRef.current.contains(event.target as Node)
    ) {
      setDataTaskSearch([]);
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
      <DynamicTooltip
        content={'タスクを引用'}
        placement="top">
        <div
          className="hover:bg-[#77858F26] relative rounded-full p-[7px] hover:cursor-pointer"
          onClick={() => {
            setIsShowList(true);
          }}>
          <ImageRound
            name="Quote checker"
            src="/icons/quote-checker.svg"
            className="w-[18px] h-[18px]"
          />
        </div>
      </DynamicTooltip>

      <div
        ref={boxListRef}
        style={{
          boxShadow: '0px 4px 8px 0px #0000000F',
        }}
        className={`${!isShowList && '!hidden'} absolute after:content-[''] after:absolute  after:top-full after:left-1/2 after:-translate-x-1/2 after:border-8 after:border-transparent after:border-t-white  left-[-158px] p-[10px] top-[-479px] w-[350px] h-[470px] rounded-lg bg-white`}>
        <div className="flex justify-center items-center gap-2 py-5">
          <Button
            onClick={() => {
              if (!isMyTask) {
                setPage(1);
                setDataTaskList([]);
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
              setPageSearch(1);
              setSearchTask(e.target.value);
            }}
          />
        </div>
        {searchTask && (
          <div
            ref={listTaskUerSearchRef}
            className="h-[282px] overflow-y-auto scroll-smooth flex flex-col gap-[6px]">
            {dataTaskSearch.length > 0
              ? dataTaskSearch.map((item) => {
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
              : !hasNext && <p className="text-center">{NO_DATA_AVAILABLE}</p>}
            <div>
              {hasNext ? (
                <RowSkeleton
                  numberOfRows={pageSearch > 1 ? 6 : 2}
                  className="!h-[50px]"
                />
              ) : (
                <div className="w-full"></div>
              )}
            </div>
          </div>
        )}
        {!searchTask && (
          <div
            ref={listTaskUerRef}
            className="h-[282px] overflow-y-auto scroll-smooth flex flex-col gap-[6px]">
            {dataTaskList.length > 0 ? (
              dataTaskList.map((item) => {
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
            <div>
              {hasNext ? (
                <RowSkeleton numberOfRows={2} className="!h-[50px]" />
              ) : (
                <div className="w-full"></div>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center mt-[10px] justify-center">
          <Button
            onClick={() => {
              handleQuoteTaskUser(quoteTaskList);
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
