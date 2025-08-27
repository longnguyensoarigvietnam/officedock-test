import { useEffect, useRef, useState } from 'react';

import ImageRound from '@components/common/ImageRound';
import CandidateList from '@components/mvp/CandidateList';
import Spinner from '@components/common/Spinner';

import { NO_SETTING } from '@constants';
import { VotingManagementType } from '@constants/enums';

import useMVPVotingList from '@hooks/useMVPVotingList';
import useVotingDetail from '@hooks/useVotingDetail';

import { UserProfile } from '@interfaces/user';

import { getCategoryFormattedDate, getFullFormattedDate } from '@utils/date';

export const PastVotingResults = () => {
  const [selectedVotingId, setSelectedVotingId] = useState<number | null>(null);

  const [expandedVotingState, setExpandedVotingState] = useState<
    Record<
      number,
      { detail?: { candidates: any[]; totalVoters?: number }; isOpen?: boolean }
    >
  >({});

  const {
    votingList,
    isLoadingList,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useMVPVotingList({
    timeline: VotingManagementType.PAST,
  });

  useVotingDetail({
    id: Number(selectedVotingId),
    onSuccess: (data) => {
      setSelectedVotingId(null);
      setExpandedVotingState((prev) => ({
        ...prev,
        [data.id]: {
          detail: {
            candidates: data.candidates,
            totalVoters: data.totalVoters,
          },
          isOpen: true,
        },
      }));
    },
  });

  const resultsContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let debounceTimer: NodeJS.Timeout;

    const handleScroll = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const resultsContainer = resultsContainerRef.current;
        if (
          resultsContainer &&
          hasNextPage &&
          !isFetchingNextPage &&
          Math.round(
            resultsContainer.clientHeight +
              Math.abs(resultsContainer.scrollTop),
          ) >= Math.round(0.9 * resultsContainer.scrollHeight)
        ) {
          fetchNextPage();
        }
      }, 200);
    };

    const resultsContainer = resultsContainerRef.current;

    if (resultsContainer) {
      resultsContainer.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (resultsContainer) {
        resultsContainer.removeEventListener('scroll', handleScroll);
      }
      clearTimeout(debounceTimer);
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div
      className="bg-[#F8FAFC] pt-[30px] pb-[40px] px-[30px] rounded-[30px] w-full"
      style={{ boxShadow: '0px 4px 10px 0px #0000000D' }}>
      <p className="text-lg font-semibold mb-[30px]">過去の投票結果</p>
      {isLoadingList ? (
        <Spinner className="!h-fit py-3" iconClassName="h-6 w-6" />
      ) : votingList.length > 0 ? (
        <div
          className="max-h-[500px] overflow-y-auto"
          ref={resultsContainerRef}>
          {votingList
            .map((item) => ({
              ...item,
              ...expandedVotingState[item.id], // merge detail/isOpen here
            }))
            .map((item) => {
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-[14px] px-[24px] pt-[30px] pb-[40px] mb-[14px] w-full"
                  style={{ boxShadow: '0px 2px 8px 0px #0000001A' }}>
                  {/* Voting info */}
                  <div className="flex items-start w-full justify-between">
                    <div className="w-[calc(100%_-_728px)]">
                      <p className="text-base font-medium max-w-full break-all mb-[13px]">
                        {item.title}
                      </p>
                      <div className="flex items-center gap-[6px] text-primary">
                        <p className="text-xs font-medium">
                          {item.startDate
                            ? getCategoryFormattedDate(new Date(item.startDate))
                            : NO_SETTING}
                        </p>
                        <p className="text-sm text-[#77858F]">~</p>
                        <p className="text-xs font-medium">
                          {item.endDate
                            ? getFullFormattedDate(new Date(item.endDate))
                            : NO_SETTING}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="flex items-center gap-4 bg-[#F8FAFC] rounded-[6px] py-[18px] px-5 mr-6">
                        <p className="text-xs font-medium text-black w-[165px] truncate">
                          <span className="text-[#77858F] mr-[10px]">
                            贈呈コイン
                          </span>
                          {item.bonusPoint}
                        </p>
                        <div className="w-[1px] h-3 bg-[#D2DBE1]"></div>
                        <p className="text-xs font-medium text-black w-[165px] truncate">
                          <span className="text-[#77858F] mr-[10px]">
                            設定者
                          </span>
                          {(item?.createdBy as UserProfile)?.fullName}
                        </p>
                        <div className="w-[1px] h-3 bg-[#D2DBE1]"></div>
                        <p className="text-xs font-medium text-black w-[165px] truncate">
                          <span className="text-[#77858F] mr-[10px]">
                            最終更新者
                          </span>
                          {(item?.updatedBy as UserProfile)?.fullName}
                        </p>
                      </div>
                      <ImageRound
                        name="Open"
                        src={`/icons/${item.isOpen ? 'primary-minus' : 'primary-add'}.svg`}
                        className="w-9 h-9 hover:cursor-pointer"
                        onClick={() => {
                          setExpandedVotingState((prev) => ({
                            ...prev,
                            [item.id]: {
                              ...prev[item.id],
                              isOpen: !prev[item.id]?.isOpen, // toggle open/close
                            },
                          }));

                          // If not opened yet, also trigger detail fetch
                          if (!expandedVotingState[item.id]?.isOpen) {
                            setSelectedVotingId(item.id);
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Results */}
                  <CandidateList detail={item.detail} isOpen={item.isOpen} />
                </div>
              );
            })}
          {isFetchingNextPage ? (
            <Spinner className="!h-fit py-3" iconClassName="h-6 w-6" />
          ) : (
            <></>
          )}
        </div>
      ) : (
        <p className="text-sm font-medium">過去に実施した投票はありません。</p>
      )}
    </div>
  );
};
