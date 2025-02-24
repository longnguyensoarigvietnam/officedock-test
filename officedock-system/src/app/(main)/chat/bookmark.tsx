import { useSession } from 'next-auth/react';
import React, { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import InputSearch from '@components/common/InputSearch';
import ImageRound from '@components/common/ImageRound';
import { MessageDetailBookmark } from '@components/chat/MessageDetailBookmark';
import RowSkeleton from '@components/skeleton/RowSkeleton';

import { PermissionsSystem } from '@constants/enums';
import useBookMarkList from '@hooks/usBookMarkList';

import { ChatDashboardMember, ChatMessageResponse } from '@interfaces/chat';
import { Profile } from '@interfaces/user';
import { hasPermissionInArray } from '@utils';

interface BookmarkListProps {
  searchChatMsg: string;
  dashboardMembers: ChatDashboardMember[];
  dashboardMemberList: Omit<Profile, 'birthday' | 'gender'>[];
  setSearchChatMsg: React.Dispatch<React.SetStateAction<string>>;
}

const BookmarkList = ({
  searchChatMsg,
  dashboardMembers,
  dashboardMemberList,
  setSearchChatMsg,
}: BookmarkListProps) => {
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  const { data: session } = useSession();

  const router = useRouter();

  const searchParams = useSearchParams();

  const [page, setPage] = useState<number>(1);

  const [initialLoad, _setInitialLoad] = useState<boolean>(false);

  const [hasMoreDetail, setHasMoreDetail] = useState(false);

  const [dataMessageDetail, setDataMessageDetail] = useState<
    ChatMessageResponse[]
  >([]);

  useBookMarkList({
    page: page,
    onSuccess: (bookmark) => {
      setHasMoreDetail(bookmark.hasNext as boolean);
      setDataMessageDetail((prev) => {
        const newMessages = bookmark.results.filter(
          (newMsg) =>
            !(prev || []).some((existingMsg) => existingMsg.id === newMsg.id),
        );
        return [...(prev || []), ...newMessages];
      });
    },
  });

  useEffect(() => {
    const handleScroll = () => {
      const chatContainer = chatContainerRef.current;
      if (
        chatContainer &&
        hasMoreDetail &&
        chatContainer.clientHeight + Math.abs(chatContainer.scrollTop) ===
          chatContainer.scrollHeight
      ) {
        setPage(page + 1);
      }
    };

    const chatContainer = chatContainerRef.current;

    if (chatContainer) {
      chatContainer.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (chatContainer) {
        chatContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, [hasMoreDetail]);

  const handleChangeRoom = (data: { roomCode: string; messageId: string }) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('room', data.roomCode);
    params.set('messageId', data.messageId);

    router.push(`/chat?${params.toString()}`, { scroll: false });
  };

  const handleRemoveItemBookmark = (uuid: string) => {
    setDataMessageDetail(
      dataMessageDetail.filter((item) => item.uuid !== uuid),
    );
  };

  return (
    <>
      <div className="w-full">
        <div
          className="flex justify-between items-center px-4 py-[14px] !w-full border-b-[2px] text-white"
          style={{
            background: 'linear-gradient(to right, #0E8DC5, #0D6FBA)',
          }}>
          <div className={`flex items-center w-[60%] gap-[10px]`}>
            <div className="">
              <ImageRound
                name="Save"
                src={`/icons/save-white.svg`}
                className="w-[14px] h-[18px] hover:cursor-pointer"
              />
            </div>
            <p
              className={`text-[20px] font-semibold text-ellipsis break-all overflow-hidden w-full `}>
              ブックマーク
            </p>
          </div>

          <div className="flex gap-5 items-center">
            <InputSearch
              placeholder="チャットルーム内のキーワードを検索"
              customSearchIconUrl="/icons/search-white.svg"
              inputClassName="!w-[290px] !py-2 !rounded-[30px] text-sm !bg-[#F6F9FA4D] border-none placeholder-white"
              value={searchChatMsg}
              onChange={(e) => setSearchChatMsg(e.target.value)}
            />
            {session?.user.permissions &&
              hasPermissionInArray(
                session?.user.permissions,
                PermissionsSystem.CHAT_UPDATE,
              ) && (
                <>
                  <div>
                    <ImageRound
                      className="w-[26px] h-[26px] hover:cursor-pointer"
                      src="/icons/setting-chat.svg"
                      border="full"
                      name="Setting icon"
                    />
                  </div>
                </>
              )}
          </div>
        </div>
        <div
          ref={chatContainerRef}
          className={` h-[calc(100vh_-_170px)] pt-4 pb-3 ${dataMessageDetail.length > 0 && !initialLoad ? 'overflow-y-auto' : 'overflow-y-hidden'}  overflow-x-hidden scrollbar-gutter-stable flex flex-col-reverse scroll-smooth`}>
          <div className="h-[calc(100vh)] mt-3 w-full bg-[rgb(229, 231, 235)] relative">
            <div>
              {initialLoad ? (
                <div className="flex flex-col items-start ml-3">
                  <RowSkeleton className="!h-[100px] w-[500px] mb-2" />
                  <RowSkeleton className="!h-[200px] w-[600px] mb-2" />
                  <RowSkeleton
                    numberOfRows={4}
                    className="!h-[50px] w-[700px]"
                  />
                </div>
              ) : (
                <div className="w-full"></div>
              )}
            </div>
          </div>
          {dataMessageDetail.map((item, index) => (
            <div key={item.id}>
              <MessageDetailBookmark
                isLastItem={dataMessageDetail.length - 1 === index}
                messageDetail={item}
                dashboardMembers={dashboardMembers}
                dashboardMemberList={dashboardMemberList}
                onGotoMessage={() => {
                  router.push;
                  handleChangeRoom({
                    roomCode: String(item.chatRoomCode),
                    messageId: String(item.id),
                  });
                }}
                handleRemoveItemBookmark={handleRemoveItemBookmark}
              />
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default BookmarkList;
