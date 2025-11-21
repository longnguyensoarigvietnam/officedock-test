import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { options } from '@app/api/auth/[...nextauth]/options';

import Header from '@components/layouts/Header';
import Sidebar from '@components/layouts/Sidebar';
import TermAgreeModal from '@components/modals/TermAgreeModal';

import { pageRouters } from '@constants/routers';

const MainRootLayout = async ({ children }: { children: React.ReactNode }) => {
  const session = await getServerSession(options);

  if (!session) {
    redirect(pageRouters.LOGIN.href);
  }
  return (
    <main className="w-full min-w-[1440px]">
      <TermAgreeModal />
      <div className={`relative h-screen flex flex-col min-w-[1280px]  w-full`}>
        <Header />
        <div className="flex-grow overflow-x-hidden flex w-full 2xl:mt-[70px] h-[calc(100vh_-_70px)] bg-transparent">
          <Sidebar />
          <div className="w-full">{children}</div>
        </div>
      </div>
    </main>
  );
};
export default MainRootLayout;
