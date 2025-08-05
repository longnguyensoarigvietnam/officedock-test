import MainLayout from '@components/layouts/MainLayout';
import BoardChat from './board';
import { PermissionsSystem } from '@constants/enums';

const ChatPage = () => {
  return (
    <MainLayout
      showFooter={false}
      className="!overflow-y-hidden !overflow-x-auto !pt-0 !px-0 !bg-[#F8FAFC]"
      permission={PermissionsSystem.CHAT_VIEW}>
      <div className="flex flex-row ">
        <BoardChat />
      </div>
    </MainLayout>
  );
};

export default ChatPage;
