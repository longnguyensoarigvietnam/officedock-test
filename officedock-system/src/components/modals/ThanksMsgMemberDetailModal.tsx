import React, { useEffect, useRef, useState } from 'react';

import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';
import Modal from '@components/common/Modal';
import useThankMsgDetailUserList from '@hooks/useThankMsgDetailUserList';
import { formatShowDateJapanese } from '@utils/date';
import { useQueryClient } from '@tanstack/react-query';
import RowSkeleton from '@components/skeleton/RowSkeleton';
import { NO_DATA_AVAILABLE } from '@constants';
import { useToast } from '@providers/ToastProvider';
import api from '@base/api';
import { apiRouters } from '@constants/routers';
import { useMutation } from 'react-query';
import { ERROR_DELETE_MESSAGE } from '@constants/message';
import { useUpdateThankMsgHistoryCache } from '@hooks/CacheQuery/useUpdateThankMsgHistory';
import { formatWithParagraphTags } from '@utils';

type Props = {
  open: boolean;
  userDetailId?: {
    avatar: string;
    avatarColor: string;
    fullName: string;
    id: number;
    orgName: string;
  };
  onClose: () => void;
};

const ThanksMsgMemberDetailModal = ({ open, userDetailId, onClose }: Props) => {
  const [isSended, setIsSended] = useState(false);
  const { showToast } = useToast();

  const [openDeleteIds, setOpenDeleteIds] = useState<number[]>([]);

  const resultsContainerRef = useRef<HTMLDivElement | null>(null);

  const queryClient = useQueryClient();
  const { removeMsgFromCache } = useUpdateThankMsgHistoryCache();

  useEffect(() => {
    return () => {
      queryClient.removeQueries(['getDetailThankMsgList']);
    };
  }, [queryClient, open]);

  const {
    thankDetailList,
    fetchNextPage,
    hasNextPage,
    isLoadingList,
    isFetchingNextPage,
  } = useThankMsgDetailUserList({
    type: isSended ? 'sent' : 'received',
    user_id: String(userDetailId?.id) || '',
  });

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

  // Delete location API
  const handleDeleteThankMsg = async (uuid: string) => {
    return await api.delete(apiRouters.DETAIL_THANK_MSG_HISTORY(uuid));
  };

  const { mutate: deleteThankMsg } = useMutation(
    'postDeleteThankMsg',
    handleDeleteThankMsg,
    {
      onSuccess: () => {},
      onError: () => {
        showToast({
          variant: 'error',
          description: ERROR_DELETE_MESSAGE,
        });
      },
      onSettled: () => {},
    },
  );
  const toggleDelete = (id: number) => {
    setOpenDeleteIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleDelete = (id: number) => {
    setOpenDeleteIds((prev) => prev.filter((x) => x !== id));
    removeMsgFromCache({
      id: id,
      type: isSended ? 'sent' : 'received',
      user_id: String(userDetailId?.id) || '',
    });
    deleteThankMsg(String(id));
  };

  const handleCancel = (id: number) => {
    setOpenDeleteIds((prev) => prev.filter((x) => x !== id));
  };

  return (
    <Modal
      open={open}
      className="font-primary bg-white w-[1000px] !rounded-[24px] !py-0 !px-0"
      contentClass="!rounded-[24px]"
      onClose={onClose}
      title="">
      <header className="flex items-center gap-5 justify-between bg-[#EBF1F7] !py-6 !px-[30px]  !rounded-tl-[24px]  !rounded-tr-[24px] ">
        <div className="flex items-center text-base font-medium gap-[10px]">
          <CustomUserAvatar
            avatarUrl={userDetailId?.avatar || ''}
            avatarColor={userDetailId?.avatarColor || ''}
            size={63}
          />
          <span className="text-[#77858F] break-all flex-shrink-0 line-clamp-2  max-w-[150px] ">
            {userDetailId?.orgName}
          </span>
          <span className="text-black break-all line-clamp-2 ml-[10px] flex-grow">
            {userDetailId?.fullName}
          </span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-[6px] w-fit h-fit p-[6px] rounded-[20px] bg-white">
            <Button
              onClick={() => {
                if (isSended) {
                  setOpenDeleteIds([]);
                  setIsSended(false);
                }
              }}
              variant={isSended ? 'outline' : 'primary'}
              className={`w-[200px] ${isSended ? '!bg-[#EBF1F7] !border-[#EBF1F7] !text-[#77858F]' : ''} !rounded-[20px] h-[30px] !px-0 !py-0 !text-xs `}>
              受け取ったサンクスメッセージ
            </Button>
            <Button
              onClick={() => {
                if (!isSended) {
                  setOpenDeleteIds([]);
                  setIsSended(true);
                }
              }}
              variant={isSended ? 'primary' : 'outline'}
              className={`w-[176px] ${isSended ? '' : '!bg-[#EBF1F7] !border-[#EBF1F7] !text-[#77858F]'}  !rounded-[20px] h-[30px] !px-0 !py-0 !text-xs `}>
              送ったサンクスメッセージ
            </Button>
          </div>
          <div
            className={` w-[30px] h-[30px] flex items-center justify-center rounded-full bg-white`}>
            <ImageRound
              className={`w-5 h-5 hover:cursor-pointer `}
              src="/icons/close.svg"
              name="Close modal"
              onClick={onClose}
            />
          </div>
        </div>
      </header>
      <div className="p-[30px]">
        <div></div>
        {/* Header */}
        <div className="h-fit flex items-center  text-[#77858F] text-xs font-medium   px-5">
          <div className="w-[125px]">日付</div>
          <div className="w-[180px]  flex justify-between items-center">
            <div className="h-[9px] w-[1px] border-l border-[#D2DBE1]"></div>
            <div className="flex-grow px-5">名前</div>
            <div className="h-[9px] w-[1px] border-l border-[#D2DBE1]"></div>
          </div>
          <div className="flex-grow px-5">サンクスメッセージ</div>
        </div>
        {/* Table */}
        <div
          ref={resultsContainerRef}
          className="h-full max-h-[calc(100vh_-_515px)] overflow-y-auto rounded-[14px]   border border-[#D2DBE1]   mt-[14px]">
          {isLoadingList && (
            <div>
              <RowSkeleton numberOfRows={3} className="h-[90px]" />
            </div>
          )}
          {!isLoadingList &&
            thankDetailList.map((item, index) => {
              return (
                <div
                  key={item.id}
                  className={`py-4 px-5    ${index !== thankDetailList.length - 1 && 'border-b'} border-[#D2DBE1]`}>
                  <div
                    className={`w-full ${openDeleteIds.includes(item.id) || item.deletedAt ? 'opacity-40' : ''} bg-white h-full py-[14px] rounded-[14px]`}>
                    <div className="flex items-baseline bg-white text-black text-xs font-normal ">
                      {/* Date column */}
                      <div className="w-[124px] flex items-center">
                        {item.createdAt &&
                          formatShowDateJapanese(item.createdAt)}
                      </div>
                      <div className="w-[1px] border-l border-[#D2DBE1] -my-[15px]"></div>
                      <div className="w-[179px] px-[15px] flex items-center justify-between">
                        <div className="flex items-start gap-[10px]">
                          <CustomUserAvatar
                            avatarUrl={
                              isSended
                                ? item.recipient.avatar || ''
                                : item?.sender.avatar || ''
                            }
                            avatarColor={
                              isSended
                                ? item.recipient.avatarColor || ''
                                : item?.sender.avatarColor || ''
                            }
                            size={33}
                          />
                          <div className="flex-grow">
                            <p className="text-xs  text-[#77858F] max-w-[100px] line-clamp-2 break-all ">
                              {isSended
                                ? item.recipient.organizations.name
                                : item.sender?.organizations.name}
                            </p>
                            <p className="text-sm text-black  max-w-[100px] break-all line-clamp-2  mt-1">
                              {' '}
                              {isSended
                                ? item.recipient.fullName
                                : item.sender?.fullName}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="w-[1px] border-l border-[#D2DBE1] -my-[15px]"></div>
                      <div className="px-5 w-[588px] flex items-start gap-3 justify-between">
                        <p
                          className="break-all text-sm font-normal"
                          dangerouslySetInnerHTML={{
                            __html: formatWithParagraphTags(item.message),
                          }}></p>
                        {item.deletedAt ? (
                          <></>
                        ) : (
                          <ImageRound
                            onClick={() => {
                              if (!openDeleteIds.includes(item.id)) {
                                toggleDelete(item.id);
                              }
                            }}
                            name="Delete icon"
                            src={'/icons/delete.svg'}
                            className="w-fit h-fit flex-shrink-0 relative top-[5px] cursor-pointer"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                  {openDeleteIds.includes(item.id) && (
                    <div className="flex justify-center items-center gap-20 rounded-lg bg-[#EBF1F7] py-5">
                      <div className="font-normal">
                        <p className="text-sm text-black">
                          本当に削除しますか？
                        </p>
                        <p className="text-[13px] mt-2 text-[#77858F]">
                          このメッセージを【送受信者の履歴】から削除します。
                        </p>
                      </div>
                      <div className="flex items-center gap-[10px]">
                        <Button
                          onClick={() => handleCancel(item.id)}
                          variant="outline"
                          className="w-[100px] h-9 !px-0 !py-0">
                          キャンセル
                        </Button>
                        <Button
                          variant="primary"
                          onClick={() => handleDelete(item.id)}
                          className="w-[100px] h-9 !px-0 !py-0">
                          OK
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          {!isLoadingList && thankDetailList.length === 0 && (
            <p className="text-center text-[#77858F]">{NO_DATA_AVAILABLE}</p>
          )}
          {isFetchingNextPage && (
            <div className="mt-2">
              <RowSkeleton numberOfRows={2} className="h-[60px]" />
            </div>
          )}
        </div>
        <div className="flex justify-center mt-[30px]">
          <Button onClick={onClose} variant="text">
            閉じる
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ThanksMsgMemberDetailModal;
