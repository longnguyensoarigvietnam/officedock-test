'use client';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { useMutation } from 'react-query';
import { AxiosError } from 'axios';

import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import { RenderAccessories } from '@components/custom/UserCustomize';
import ImageRound from '@components/common/ImageRound';
import { SkillMapProgressBar } from '@components/common/ProgressBar/SkillMapProgressBar';
import { TwinklingStar } from '@components/common/TwinklingStar';
import { MyPageMenu } from '@components/myPage/Menu';
import CreateTweetModal from '@components/modals/CreateTweetModal';
import socketEventEmitter from '@components/socket/socketEventEmitter';
import { TimeLine } from '@components/myPage/TimeLine';

import { GlobalStateContext } from '@providers/GlobalStateProvider';
import { useSessionCache } from '@providers/SessionCacheProvider';
import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';

import {
  TweetDetail,
  TweetFormData,
  WebSocketTweetMessage,
} from '@interfaces/tweet';

import {
  ERROR_CREATE_MESSAGE,
  SUCCESS_CREATE_MESSAGE,
} from '@constants/message';
import { SocketActions } from '@constants/enums';
import { apiRouters } from '@constants/routers';

import useTweetList from '@hooks/useTweetList';
import { useErrorToast } from '@hooks/useErrorToast';

import api from '@base/api';

const MyPage = () => {
  const { data: session } = useSessionCache();
  const showErrorToast = useErrorToast();
  const { showToast } = useToast();

  const { dashboardMembersWithAvatars } = useContext(GlobalStateContext);
  const { setIsLoading } = useContext(LoadingContext);

  // Tweet
  const [openCreateTweetModal, setOpenCreateTweetModal] =
    useState<boolean>(false);
  const [tweetMessage, setTweetMessage] = useState<string>('');
  const [tweetList, setTweetList] = useState<TweetDetail[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPage, setTotalPage] = useState<number>(1);
  const [hasNext, setHasNext] = useState<boolean>(false);
  const isLoadingTweetRef = useRef(false);

  // Get tweet list
  useTweetList({
    pagination: {
      page: currentPage,
    },
    isLoadingTweetRef,
    conditions: [Boolean(currentPage <= totalPage)],
    onSuccess: (data) => {
      setHasNext(data?.hasNext || false);
      setTweetList((prev) => [...prev, ...data.results]);
      setTotalPage(data.numPages);
    },
  });
  // Render user's avatar
  const renderBoxUser = (userId: string) => {
    const memberInfo = dashboardMembersWithAvatars.find(
      (member) => member.id == userId,
    );

    return (
      <CustomUserAvatar
        avatarUrl={memberInfo?.avatar || ''}
        avatarColor={memberInfo?.avatarColor || ''}
        size={36}
      />
    );
  };

  // Socket
  useEffect(() => {
    // Create WebSocket
    const handleSocketMessage = (data: WebSocketTweetMessage) => {
      switch (data.action) {
        case SocketActions.CREATE_TWEET:
          setTweetList((prev) => {
            const allMessages = [data.tweet, ...prev];

            // Remove duplicates by uuid
            const uniqueMessages = Array.from(
              new Map(allMessages.map((msg) => [msg.id, msg])).values(),
            );

            return uniqueMessages;
          });
          break;
        default:
          break;
      }
    };
    socketEventEmitter.on('message', handleSocketMessage);

    return () => {
      socketEventEmitter.off('message', handleSocketMessage);
    };
  }, []);

  const renderLevelText = (level: number) => (
    <div className="flex gap-1 items-baseline">
      <p className="text-[15px] font-medium">Lv.</p>
      <p className="text-[26px] font-medium">{level}</p>
    </div>
  );
  const showTwinklingStars = true;
  const listAvatar = ['body', 'head-full', 'hat', 'shoes'];

  // Call API to send tweet message
  const handleSendTweetMessage = async (data: TweetFormData) => {
    setIsLoading(true);
    const { data: response } = await api.post(apiRouters.TWEET_LIST, data);
    return response;
  };

  const { mutate: sendTweetMessage } = useMutation(
    'sendTweetMessage',
    handleSendTweetMessage,
    {
      onSuccess: () => {
        setTweetMessage('');
        showToast({
          description: SUCCESS_CREATE_MESSAGE,
        });
      },
      onError: (error: AxiosError) => {
        showErrorToast(error, ERROR_CREATE_MESSAGE);
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

  return (
    <div className="h-full w-full relative">
      <div
        style={{
          backgroundImage: 'url("/images/bg-profile.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          width: '100%',
          height: '100%',
        }}
        className="bg-red-300 h-[calc(100vh-120px)] w-full">
        <div className="flex ">
          <div className="h-20 bg-white w-fit px-5 py-4 text-[#77858F] font-medium flex items-center gap-5 rounded-br-[30px]">
            <div>
              {session?.user.id && renderBoxUser(`${session?.user.id}`)}
            </div>
            <p className="break-all max-w-[100px] line-clamp-2">
              {session?.user.profile.fullName}
            </p>
            <p className="break-all text-[22px] text-black max-w-[100px] line-clamp-2">
              湊藤 哉斗
            </p>
            <div className="h-full border-l border-[#D2DBE1]"></div>
            <div className="flex items-center text-sm font-medium gap-[10px]">
              <p>ID</p>
              <p className="text-base text-black">001</p>
            </div>
          </div>
          <div className="w-[303px] mt-5 ml-5 font-bold text-base bg-white rounded-full h-10 flex items-center justify-center gap-[9px]">
            <ImageRound
              name="Badge icon"
              src={'/icons/badge.svg'}
              className={`w-fit h-fit`}
            />
            <p>200</p>
            <ImageRound
              name="Pearl icon"
              src={'/icons/pearl.svg'}
              className={`w-fit h-fit ml-[10px]`}
            />
            <p>10</p>
            <p className="text-sm text-primary underline ml-[11px] cursor-pointer hover:opacity-80">
              ポイント履歴/交換
            </p>
          </div>
        </div>
        <div className="mt-[30px] ml-[30px] flex item-center gap-[14px]">
          <div className="w-[245px] h-[55px] bg-white px-5 py-3 flex items-center gap-3 justify-center  rounded-[14px]">
            <div className="w-fit h-fit">
              <p className="max-w-[150px] truncate text-[15px] font-medium">
                プロジェクト推進力
              </p>
              <div className="w-[156px] mt-[5px]">
                <SkillMapProgressBar
                  value={80}
                  strokeColor={'#228CDB'}
                  trailColor={'#D2DBE1'}
                  className="!h-[6px]"
                />
              </div>
            </div>
            <div className="relative top-[5px]">{renderLevelText(2)}</div>
          </div>
          {/* Skill 2 */}
          <div
            style={{
              boxShadow: showTwinklingStars
                ? '0px 0px 20px 0px #36ACDE80'
                : '0px 2px 8px 0px #0000001A',
            }}
            className="w-[245px] h-[55px] relative bg-white px-5 py-3 flex items-center gap-3 justify-center  rounded-[14px]">
            {showTwinklingStars && (
              <>
                <div className="absolute -top-[20px] left-[20px] bg-primary rounded-[20px] w-[140px] h-[20px] flex items-center justify-center">
                  <p className="text-white text-xs font-bold">
                    レベルアップ申請可能
                  </p>
                </div>
                <div className="bg-primary absolute clip-diagonal-left h-[7px] w-[7px] top-0 left-[38px]"></div>
              </>
            )}

            {showTwinklingStars && (
              <div>
                <TwinklingStar
                  className="absolute top-[-10px] left-[-10px]"
                  delay={0}
                />
                <TwinklingStar
                  className="absolute top-[5px] right-[-15px]"
                  delay={0.5}
                />
                <TwinklingStar
                  className="absolute top-[-15px] right-[5px]"
                  delay={0.8}
                />
                <TwinklingStar
                  className="absolute bottom-[5px] left-[-15px]"
                  delay={1}
                />
                <TwinklingStar
                  className="absolute bottom-[-15px] left-[5px]"
                  delay={1.2}
                />
                <TwinklingStar
                  className="absolute bottom-[-10px] right-[-10px]"
                  delay={1.5}
                />
              </div>
            )}
            <div className="w-fit h-fit">
              <p className="max-w-[150px] truncate text-[15px] font-medium">
                プロジェクト推進力
              </p>
              <div className="w-[156px] mt-[5px]">
                <SkillMapProgressBar
                  value={80}
                  strokeColor={'#228CDB'}
                  trailColor={'#D2DBE1'}
                  className="!h-[6px]"
                />
              </div>
            </div>
            <div className="relative top-[5px]">{renderLevelText(3)}</div>
          </div>
          {/* Skill add */}
          <div
            style={{
              boxShadow: '0px 0px 7px 0px #00000080',
            }}
            className="w-[245px] h-[55px] bg-transparent border border-white rounded-[14px] hover:opacity-70 flex items-center cursor-pointer justify-center text-white text-center font-medium text-sm">
            <p>＋ スキルをセットできます</p>
          </div>
        </div>
        <div className="mt-[74px] relative ml-[30px] flex items-end">
          {/* Menu */}
          <MyPageMenu />
          <div className="flex-grow">
            <div className="h-[424px] w-[336px] ml-[200px] relative">
              <RenderAccessories images={listAvatar} />
            </div>
            {/* Message user */}
            <>
              <div
                style={{
                  background:
                    'linear-gradient(180deg, #355AC9 0%, #5282FC 100%)',
                  boxShadow: '0px 4px 0px 0px #355AC940',
                }}
                className="absolute top-[13px] left-[555px] p-[10px] rounded-[14px] w-[258px] h-fit] ">
                <p className="text-white text-[13px] font-bold">マイルくん</p>
                <div className="mt-[10px] w-full bg-white rounded-[5px] p-4 text-[13px] font-semibold text-black">
                  ポイントが貯まると、素敵な商品と交換できるよ！
                </div>
              </div>
              <div className="bg-[#5282FB] rotate-[20deg] absolute clip-diagonal-left h-[25px] w-[22px] top-[128px] left-[585px]"></div>
            </>
          </div>
          {/* Tweet icon */}
          <ImageRound
            name="Tweet icon"
            src={'/icons/tweet.svg'}
            className={`w-[88px] h-[94px] z-10 hover:cursor-pointer absolute bottom-[0px] right-[20px]`}
            onClick={() => setOpenCreateTweetModal(true)}
          />
        </div>
      </div>
      {/* Timeline */}
      <TimeLine
        tweetList={tweetList}
        hasNext={hasNext}
        totalPage={totalPage}
        currentPage={currentPage}
        isLoadingTweetRef={isLoadingTweetRef}
        setCurrentPage={setCurrentPage}
      />
      {openCreateTweetModal && (
        <CreateTweetModal
          open={openCreateTweetModal}
          tweetMessage={tweetMessage}
          setTweetMessage={setTweetMessage}
          onClose={() => setOpenCreateTweetModal(false)}
          onSubmit={() => sendTweetMessage({ content: tweetMessage })}
        />
      )}
    </div>
  );
};

export default MyPage;
