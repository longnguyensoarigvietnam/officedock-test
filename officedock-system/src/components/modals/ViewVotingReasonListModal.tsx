'use client';

import { memo, useEffect, useRef, useState } from 'react';
import {
  FetchNextPageOptions,
  InfiniteQueryObserverResult,
} from '@tanstack/react-query';
import { useMutation } from 'react-query';
import { AxiosError } from 'axios';

import Modal from '../common/Modal';
import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';
import Spinner from '@components/common/Spinner';

import { MVPVotingComment } from '@interfaces/mvp';
import { ResponseError } from '@interfaces/response';

import { useUpdateMVPVoteCommentCache } from '@hooks/CacheQuery/useUpdateMVPVoteCommentCache';
import { useErrorToast } from '@hooks/useErrorToast';

import { apiRouters } from '@constants/routers';
import {
  ERROR_DELETE_MESSAGE,
  SUCCESS_DELETE_MESSAGE,
} from '@constants/message';

import { useToast } from '@providers/ToastProvider';

import api from '@base/api';

export type ViewVotingMemberListProps = {
  reasonList: MVPVotingComment[];
  hasNextPage: boolean | undefined;
  isFetchingNextPage: boolean;
  isLoadingList: boolean;
  open: boolean;
  fetchNextPage: (options?: FetchNextPageOptions | undefined) => Promise<
    InfiniteQueryObserverResult<
      {
        currentUrl: string;
        count: number;
        numPages: number;
        results: MVPVotingComment[];
        hasNext?: boolean;
        totalDuration?: string;
        next?: string | null;
        previous?: string | null;
      },
      ResponseError<any>
    >
  >;
  onClose: () => void;
};

const ViewVotingReasonListModal = memo(
  ({
    reasonList,
    open,
    hasNextPage,
    isFetchingNextPage,
    isLoadingList,
    fetchNextPage,
    onClose,
  }: ViewVotingMemberListProps) => {
    const showErrorToast = useErrorToast();
    const { showToast } = useToast();
    const resultsContainerRef = useRef<HTMLDivElement | null>(null);
    const [selectedReasonToDelete, setSelectedReasonToDelete] = useState<
      number | null
    >(null);

    const { deleteVoteCommentLocal } = useUpdateMVPVoteCommentCache();

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

    // Call API to delete comment
    const handleDeleteComment = async (data: {
      commentId: number;
      mvpCandidateId: number;
    }) => {
      const { data: response } = await api.delete(
        `${apiRouters.VOTE_MVP_DETAIL(String(data.commentId))}`,
      );
      return response;
    };

    const { mutate: deleteVoteComment } = useMutation(
      'deleteVoteComment',
      handleDeleteComment,
      {
        onSuccess: (_data, variables) => {
          showToast({
            variant: 'success',
            description: SUCCESS_DELETE_MESSAGE,
          });
          setSelectedReasonToDelete(null);
          deleteVoteCommentLocal({
            commentId: variables.commentId,
            mvpCandidateId: variables.mvpCandidateId,
          });
        },
        onError: (error: AxiosError) => {
          showErrorToast(error, ERROR_DELETE_MESSAGE);
        },
      },
    );

    return (
      <Modal
        open={open}
        isOutSideAction={false}
        className="font-primary !rounded-[20px] text-gray-700 !p-0 w-[500px]"
        titleClassName="!text-[14px] !text-[#5B6770] !font-medium"
        headerClassName="bg-[#EBF1F7] !rounded-t-[20px] !rounded-b-none px-6 py-4 !mb-0"
        contentClass="!rounded-[20px]"
        closeIconClassName="!bg-white !rounded-full !p-2 !hover:cursor-pointer !shadow-sm"
        closeClassName="!mt-0 opacity-70 !w-4 !h-4 !hover:cursor-pointer"
        onClose={() => {
          setSelectedReasonToDelete(null);
          onClose();
        }}
        title="投票理由">
        <div className="pt-5 pb-[30px] px-5 w-full">
          {isLoadingList ? (
            <Spinner className="!h-3 py-3" iconClassName="h-6 w-6" />
          ) : (
            <></>
          )}
          <div
            ref={resultsContainerRef}
            className={`max-h-[346px] overflow-y-auto border-[1px] border-[#D2DBE1] rounded-[6px] ${!reasonList?.length && 'hidden'}`}>
            {reasonList?.length > 0 ? (
              reasonList.map((reason) => (
                <div
                  key={reason.id}
                  className={`px-4 py-[14px] ${selectedReasonToDelete == reason.id && 'pb-5'} w-full border-b-[1px] border-[#D2DBE1] last:border-b-[0px]`}>
                  <div className="flex items-center justify-between">
                    <div
                      className={`${reason.deletedAt ? 'w-[calc(100%_-_10px)]' : 'w-[calc(100%_-_30px)]'}`}>
                      <p
                        className={`${selectedReasonToDelete == reason.id || reason.deletedAt ? 'text-[#00000066]' : 'text-black'} text-sm break-all`}
                        dangerouslySetInnerHTML={{
                          __html: reason.comment,
                        }}></p>
                    </div>
                    {!reason.deletedAt ? (
                      <ImageRound
                        name="Delete"
                        src={'/icons/delete-gray.svg'}
                        className={`w-[12px] h-[14px] hover:cursor-pointer`}
                        onClick={() => {
                          setSelectedReasonToDelete(Number(reason.id));
                        }}
                      />
                    ) : (
                      <></>
                    )}
                  </div>
                  {selectedReasonToDelete == reason.id ? (
                    <div className="space-y-4 mt-[22px]">
                      <p className="text-sm text-center">
                        本当に削除しますか？
                      </p>
                      <div className="flex justify-center gap-[10px] items-center">
                        <Button
                          variant="outline"
                          onClick={() => setSelectedReasonToDelete(null)}
                          className="w-[100px] h-[36px] text-[13px] !px-0">
                          キャンセル
                        </Button>
                        <Button
                          variant="primary"
                          className={`w-[100px] h-[36px]`}
                          onClick={() =>
                            deleteVoteComment({
                              commentId: Number(reason.id),
                              mvpCandidateId: Number(reason.mvpCandidate),
                            })
                          }>
                          OK
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <></>
                  )}
                </div>
              ))
            ) : (
              <></>
            )}

            {isFetchingNextPage ? (
              <Spinner className="!h-fit py-3" iconClassName="h-6 w-6" />
            ) : (
              <></>
            )}
          </div>
          <div className="flex justify-center mt-[30px]">
            <Button
              variant="text"
              className="!text-[13px] !p-0 font-medium"
              onClick={() => {
                setSelectedReasonToDelete(null);
                onClose();
              }}>
              閉じる
            </Button>
          </div>
        </div>
      </Modal>
    );
  },
);
export default ViewVotingReasonListModal;
