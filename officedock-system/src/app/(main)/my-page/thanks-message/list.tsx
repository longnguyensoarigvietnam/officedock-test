'use client';
import React, { useRef, useState } from 'react';
import { useMutation } from 'react-query';
import { useRouter } from 'next/navigation';

import ImageRound from '@components/common/ImageRound';
import Button from '@components/common/Button';
import { SendThanksMessageList } from '@components/thanksMessage/SendThanksMessageList';
import SendEnvelopeAnimationOverlay from '@components/thanksMessage/SendEnvelopeAnimationOverlay';
import { ReceiveAndSendThanksMessageTable } from '@components/thanksMessage/ReceiveAndSendThanksMessageTable';

import useMemberOrganizationList from '@hooks/userMemberOrganizationList';
import useRemainingQuota from '@hooks/useRemainingQuota';
import useThanksMessageInfiniteList from '@hooks/useThanksMessageInfiniteList';

import { UserOrganization } from '@interfaces/user';

import { apiRouters, pageRouters } from '@constants/routers';
import { ThanksMessageType } from '@constants/enums';

import api from '@base/api';

const ThanksMessageListPage = () => {
  const [openSendThanksMessageTable, setOpenSendThanksMessageTable] =
    useState<boolean>(false);
  const [memberListByOrganization, setMemberListByOrganization] = useState<
    {
      orgInfo: UserOrganization;
      collapseStatus: boolean;
    }[]
  >([]);
  const [openSendThanksMessageForm, setOpenSendThanksMessageForm] = useState<{
    status: boolean;
    userInfo: {
      id: number;
      fullName: string;
      avatarColor: string;
      avatar: string;
    } | null;
  }>({
    status: false,
    userInfo: null,
  });
  const [activeTab, setActiveTab] = useState<ThanksMessageType>(
    ThanksMessageType.RECEIVED,
  );
  const hasReadAllMessages = useRef(false);
  const router = useRouter();

  useMemberOrganizationList({
    search: '',
    onSuccess: (data) => {
      setMemberListByOrganization(
        data.map((org) => {
          return {
            orgInfo: { ...org },
            collapseStatus: true,
          };
        }),
      );
    },
  });

  const {
    thanksMessageList,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoadingList,
  } = useThanksMessageInfiniteList({
    filter: {
      type: activeTab,
    },
    onSuccess: (data) => {
      if (
        activeTab == ThanksMessageType.RECEIVED &&
        !hasReadAllMessages.current &&
        data.previous == null
      ) {
        hasReadAllMessages.current = true;
        readAllThanksMessage();
      }
    },
  });

  const { remainingQuota, refetchRemainingQuota } = useRemainingQuota();

  // Call API to read thanks message
  const handleReadAllThanksMessage = async () => {
    const { data: response } = await api.post(apiRouters.READ_THANKS_MESSAGE, {
      readAll: true,
    });
    return response;
  };

  const { mutate: readAllThanksMessage } = useMutation(
    'readAllThanksMessage',
    handleReadAllThanksMessage,
    {
      onSuccess: () => {
        hasReadAllMessages.current = false;
      },
      onError: () => {
        hasReadAllMessages.current = false;
      },
    },
  );

  return (
    <>
      <div className="h-full w-full overflow-hidden">
        <div
          style={{
            backgroundImage: 'url("/images/bg-profile.jpg")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            width: '100%',
            height: '100%',
          }}
          className="rounded-bl-[30px] relative rounded-tr-[30px] rounded-br-[30px] h-[calc(100vh-120px)] w-full">
          <div className="relative pr-[30px] flex w-full justify-between items-center h-full !overflow-hidden rounded-b-[30px]">
            {/* Header */}
            <div className="flex absolute top-0 left-0">
              <div className="h-[92px] bg-white w-fit px-10 py-4 font-medium flex items-center rounded-br-[30px]">
                <div
                  className="flex items-center"
                  onClick={() => router.push(pageRouters.MY_PAGE.href)}>
                  <ImageRound
                    name="Left icon"
                    src={'/icons/chevron-left.svg'}
                    className={`w-[8px] h-[16px] mr-3 cursor-pointer`}
                  />
                  <p className="text-sm font-medium hover:cursor-pointer">
                    戻る
                  </p>
                </div>

                <ImageRound
                  name="Heart icon"
                  src={'/icons/heart.svg'}
                  className={`w-[60px] h-[60px]`}
                />
                <span className="text-[22px] font-medium">
                  サンクスメッセージ
                </span>
              </div>
            </div>
            {/* Number of remaining thanks messages */}
            <div className="w-[290px] h-[142px] absolute top-[110px] left-[30px] rounded-[14px] py-[20px] px-[26px] bg-white">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[#77858F] text-sm font-medium w-[140px]">
                  今月送ることができる サンクスメッセージ
                </p>
                <p className="text-[15px] font-medium">
                  残り
                  <span className="text-primary text-[28px] font-medium mx-1">
                    {remainingQuota?.remainingQuota || 0}
                  </span>
                  通
                </p>
              </div>
              <Button
                className="text-white !text-[13px] !rounded-[10px] font-bold hover:cursor-pointer w-full"
                style={{
                  background:
                    'linear-gradient(180deg, #355AC9 0%, #5282FC 100%)',
                  boxShadow: '0px 4px 0px 0px #0028A140',
                }}
                onClick={() => setOpenSendThanksMessageTable((prev) => !prev)}>
                <div className="w-[28px] h-[28px] mr-2 bg-white rounded-full flex items-center justify-center">
                  <ImageRound
                    name="Heart icon"
                    src={'/icons/blue-heart.svg'}
                    className={`w-[14px] h-[13px] mb-[-3px]`}
                  />
                </div>{' '}
                {openSendThanksMessageTable
                  ? 'サンクスメッセージ一覧'
                  : 'サンクスメッセージを送る'}
              </Button>
            </div>
            {/* Seagull icon */}
            <div className="absolute -bottom-[220px] left-[20px]">
              <ImageRound
                name="Seagull"
                src="/icons/seagull.svg"
                className="w-fit h-[73vh] cursor-pointer"
              />
            </div>

            {openSendThanksMessageTable ? (
              <SendThanksMessageList
                memberListByOrganization={memberListByOrganization}
                remainingQuota={remainingQuota}
                setMemberListByOrganization={setMemberListByOrganization}
                setOpenSendThanksMessageForm={setOpenSendThanksMessageForm}
              />
            ) : (
              <ReceiveAndSendThanksMessageTable
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                thanksMessageList={thanksMessageList}
                fetchNextPage={fetchNextPage}
                hasNextPage={hasNextPage}
                isLoadingList={isLoadingList}
                isFetchingNextPage={isFetchingNextPage}
              />
            )}
          </div>
        </div>
      </div>

      {openSendThanksMessageForm.status &&
        openSendThanksMessageForm.userInfo && (
          <SendEnvelopeAnimationOverlay
            userInfo={openSendThanksMessageForm.userInfo}
            remainingQuota={remainingQuota}
            refetchRemainingQuota={refetchRemainingQuota}
            onFinish={() => {
              setOpenSendThanksMessageForm({
                status: false,
                userInfo: null,
              });
            }}
          />
        )}
    </>
  );
};

export default ThanksMessageListPage;
