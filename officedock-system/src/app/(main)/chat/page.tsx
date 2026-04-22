import MainLayout from '@components/layouts/MainLayout';
import BoardChat from './board';

import { PermissionsSystem } from '@constants/enums';
import { pageRouters } from '@constants/routers';

const ChatPage = () => {
  return (
    <MainLayout
      showFooter={false}
      title={pageRouters.CHAT_MANAGEMENT.name}
      className="!overflow-y-hidden !overflow-x-auto !pt-0 !px-0 !bg-[#F8FAFC]"
      permission={PermissionsSystem.CHAT_VIEW}>
      <div className="flex flex-row ">
        <BoardChat />
      </div>
    </MainLayout>
  );
};

export default ChatPage;
