import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import Metadata from '@components/common/Metadata';
import Footer from './Footer';

import { pageRouters } from '@constants/routers';
import { options } from '@app/api/auth/[...nextauth]/options';

type AuthenticationLayoutProps = {
  children?: ReactNode;
  title?: string;
  className?: string;
};

const AuthenticationLayout = async ({
  children,
  className,
  title,
}: AuthenticationLayoutProps) => {
  const session = await getServerSession(options);

  if (session) {
    redirect(pageRouters.COMPANY_MANAGEMENT.href);
  }
  return (
    <>
      <Metadata metadata={title} />
      <div
        className={`relative min-h-screen flex flex-col justify-center items-center gap-5`}>
        <main
          className={`flex-grow flex flex-col justify-center items-center gap-10 ${className}`}>
          {children}
        </main>
        <Footer />
      </div>
    </>
  );
};

export default AuthenticationLayout;
