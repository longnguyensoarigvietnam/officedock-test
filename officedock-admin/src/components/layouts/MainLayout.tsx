import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import Metadata from '@components/common/Metadata';
import Sidebar from './Sidebar';
import Header from './Header';
import Navigation from './Navigation';
import Footer from './Footer';

import { pageRouters } from '@constants/routers';
import { options } from '@app/api/auth/[...nextauth]/options';

type MainLayoutProps = {
  children?: ReactNode;
  title?: string;
  className?: string;
};

const MainLayout = async ({ title, children, className }: MainLayoutProps) => {
  const session = await getServerSession(options);

  if (!session || !session.user) {
    redirect(pageRouters.LOGIN.href);
  }
  return (
    <>
      <Metadata metadata={title} />
      <div
        className={`relative min-h-screen flex gap-5 p-6 min-w-[1440px]`}
        style={{ scrollbarGutter: 'stable' }}>
        <Sidebar />
        <div className="flex-grow flex flex-col gap-4 w-full">
          <Header pageName={title} />
          <Navigation />
          <div
            className={`h-[calc(100vh_-_180px)] flex-grow flex flex-col gap-10 bg-white overflow-y-auto custom-scrollbar shadow-common rounded-lg p-4 ${className}`}
            style={{ scrollbarGutter: 'stable' }}>
            <main className="flex-grow flex flex-col">{children}</main>
            <Footer className="!mb-0" />
          </div>
        </div>
      </div>
    </>
  );
};

export default MainLayout;
