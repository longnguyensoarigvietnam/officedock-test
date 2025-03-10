import Header from '@components/layouts/Header';
import Sidebar from '@components/layouts/Sidebar';
import TermAgreeModal from '@components/modals/TermAgreeModal';

const MainRootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <main className="w-full min-w-[1440px]">
      <TermAgreeModal />
      <div className={`relative h-screen flex flex-col min-w-[1280px]  w-full`}>
        <Header />
        <div className="flex-grow overflow-x-hidden flex w-full 2xl:mt-[76px] h-[calc(100vh_-_76px)]">
          <Sidebar />
          <div className="w-full">{children}</div>
        </div>
      </div>
    </main>
  );
};
export default MainRootLayout;
