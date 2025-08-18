import React, { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import Button from '@components/common/Button';
import RowSkeleton from '@components/skeleton/RowSkeleton';

import { TabTypeSurveyValue } from '@constants/enums';
import useSurveyList from '@hooks/useListSurvey';
import { formatShowDateJapanese } from '@utils/date';
import { getDaysUntil } from '@utils';
import { useSessionCache } from '@providers/SessionCacheProvider';

type MySurveyTabProp = {
  handleAnswer: (id: number, isMySurvey?: boolean) => void;
  handleDelete?: (id: number) => void;
};

const MySurveyTab = ({ handleAnswer }: MySurveyTabProp) => {
  const {
    surveyList,
    fetchNextPage,
    hasNextPage,
    isLoadingList,
    isFetchingNextPage,
  } = useSurveyList({
    status: TabTypeSurveyValue.MY_SURVEY,
  });

  const resultsContainerRef = useRef<HTMLDivElement | null>(null);

  const queryClient = useQueryClient();

  const { data: session } = useSessionCache();

  useEffect(() => {
    return () => {
      queryClient.removeQueries(['getSurveyList']);
    };
  }, [queryClient]);

  useEffect(() => {
    const handleScroll = () => {
      const surveyContainer = resultsContainerRef.current;
      if (
        surveyContainer &&
        hasNextPage &&
        !isFetchingNextPage &&
        surveyContainer.clientHeight + Math.abs(surveyContainer.scrollTop) >=
          surveyContainer.scrollHeight - 10
      ) {
        fetchNextPage();
      }
    };

    const surveyContainer = resultsContainerRef.current;

    if (surveyContainer) {
      surveyContainer.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (surveyContainer) {
        surveyContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <div className="pr-5 h-full">
      {/* Header */}
      <div className="h-fit flex items-center  text-white text-xs font-medium">
        <div className="w-[125px]">日付</div>
        <div className="w-[317px]  flex justify-between items-center">
          <div className="h-[9px] w-[1px] border-l border-[#D2DBE1]"></div>
          <div className="flex-grow px-5">質問</div>
          <div className="h-[9px] w-[1px] border-l border-[#D2DBE1]"></div>
        </div>
        <div className="flex-grow px-5">ステータス</div>
      </div>
      {/* Table */}
      <div
        ref={resultsContainerRef}
        className="h-full max-h-[calc(100vh_-_415px)]  pr-[10px]  overflow-y-auto  mt-[14px]">
        <div className="w-full bg-white h-full py-[14px] rounded-[14px]">
          {isLoadingList && (
            <div>
              <RowSkeleton numberOfRows={5} className="h-[90px]" />
            </div>
          )}
          {!isLoadingList &&
            surveyList.map((item, index) => {
              return (
                <>
                  <div
                    key={index}
                    className="flex items-stretch bg-white text-black text-xs font-normal py-[14px]">
                    {/* Date column */}
                    <div className="w-[125px] pl-5 pr-2 py-[15px] flex items-center">
                      {item.createdAt && formatShowDateJapanese(item.createdAt)}
                    </div>
                    <div className="w-[1px] border-l border-[#D2DBE1] -my-[15px]"></div>
                    <div className="w-[317px] px-[15px] flex items-center justify-between">
                      <p
                        onClick={() => {
                          if (item.status.open) {
                            handleAnswer(item.id);
                          }
                        }}
                        dangerouslySetInnerHTML={{ __html: item.title }}
                        className={`${item.isAnswered === false && item.status.open && 'text-[#228CDB]'} ${item.status.open && 'cursor-pointer'} text-sm font-medium`}></p>
                      {/* TODO: Delete survey */}
                      {/* {item.status.mySurvey && (
                        <ImageRound
                          onClick={() => handleDelete(item.id)}
                          name="Delete icon"
                          src={'/icons/delete.svg'}
                          className="w-fit h-fit flex-shrink-0 ml-1 cursor-pointer"
                        />
                      )} */}
                    </div>
                    <div className="w-[1px] border-l border-[#D2DBE1] -my-[15px]"></div>
                    <div className="px-5 w-[132px] flex flex-col gap-[10px] items-center justify-center">
                      {item.status.mySurvey && (
                        <Button
                          variant="outline"
                          className="w-[104px] h-[22px] !px-0 !bg-[#EBF1F7] !rounded-[3px] hover:opacity-80 !text-black text-xs font-normal !border-none ]">
                          マイアンケート
                        </Button>
                      )}
                      {item.status.open && (
                        <>
                          <Button
                            variant="option"
                            className="w-[104px] h-[22px] !rounded-[3px] hover:opacity-80 !text-black text-xs font-normal !border-none !bg-[#FFEE6F]">
                            受付中
                          </Button>
                          <p className="text-[#77858F]">
                            残り{item.endAt && getDaysUntil(item.endAt)}日
                          </p>
                        </>
                      )}
                      {item.status.closed && (
                        <>
                          <Button
                            variant="outline"
                            className="w-[104px] h-[22px] !px-0 !bg-[#EBF1F7] !rounded-[3px] hover:opacity-80 !text-black text-xs font-normal !border-none ]">
                            受付終了
                          </Button>
                        </>
                      )}
                    </div>
                    <div className="w-[1px] border-l border-[#D2DBE1] -my-[15px]"></div>
                    {item.status.open && (
                      <div className="flex-grow flex items-center justify-center">
                        {item.isAnswered ? (
                          <Button
                            onClick={() => {
                              if (item.createdBy.id == session?.user.id) {
                                handleAnswer(item.id, true);
                              } else {
                                handleAnswer(item.id);
                              }
                            }}
                            style={{
                              background:
                                'linear-gradient(180deg, #355AC9 0%, #5282FC 100%)',
                            }}
                            className="text-white w-[50px] h-[22px] !rounded-[3px] hover:opacity-80 !text-xs font-normal !border-none !px-0 !py-0">
                            {item.createdBy.id == session?.user.id
                              ? '詳細'
                              : '回答済'}
                          </Button>
                        ) : (
                          <Button
                            onClick={() => {
                              if (item.createdBy.id == session?.user.id) {
                                handleAnswer(item.id, true);
                              } else {
                                handleAnswer(item.id);
                              }
                            }}
                            style={{
                              background:
                                'linear-gradient(180deg, #355AC9 0%, #5282FC 100%)',
                            }}
                            className="text-white w-[50px] h-[22px] !rounded-[3px] hover:opacity-80 !text-xs font-normal !border-none !px-0 !py-0">
                            {item.createdBy.id == session?.user.id
                              ? '詳細'
                              : '未回答'}
                          </Button>
                        )}
                      </div>
                    )}
                    {item.status.closed && (
                      <div className="flex-grow flex items-center justify-center">
                        <Button
                          onClick={() => {
                            handleAnswer(item.id);
                          }}
                          style={{
                            background:
                              'linear-gradient(180deg, #355AC9 0%, #5282FC 100%)',
                          }}
                          className="text-white w-[50px] h-[22px] !rounded-[3px] hover:opacity-80 !text-xs font-normal !border-none !px-0 !py-0">
                          詳細
                        </Button>
                      </div>
                    )}
                  </div>
                  {index !== surveyList.length - 1 && (
                    <div className="bg-[#409EDE] w-full h-[2px]"></div>
                  )}
                </>
              );
            })}
          {isFetchingNextPage && (
            <div className="mt-2">
              <RowSkeleton numberOfRows={2} className="h-[60px]" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MySurveyTab;
