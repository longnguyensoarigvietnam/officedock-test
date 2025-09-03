'use client';
import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';

import Footer from './Footer';
import Metadata from '@components/common/Metadata';

import { SessionStatus } from '@constants/enums';
import { pageRouters } from '@constants/routers';
import { useSessionCache } from '@providers/SessionCacheProvider';

type AuthenticationLayoutProps = {
  children?: ReactNode;
  title?: string;
  className?: string;
  showFooter?: boolean;
};

const AuthenticationLayout = ({
  children,
  className,
  title,
  showFooter = true,
}: AuthenticationLayoutProps) => {
  const { status, data: session, update } = useSessionCache();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut({
      redirect: false,
    });
    await update();
  };

  useEffect(() => {
    if (
      session &&
      status === SessionStatus.AUTHENTICATED &&
      new Date(session.expires) >= new Date()
    ) {
      if (
        session &&
        session.user.permissions &&
        session.user.permissions.length > 0
      ) {
        router.push(pageRouters.MY_PAGE.href);
      }
    }
    if (
      session &&
      status === SessionStatus.AUTHENTICATED &&
      new Date(session.expires) <= new Date()
    ) {
      handleSignOut();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session]);

  return (
    <>
      <Metadata metadata={title} />
      <div
        className={`relative min-h-screen flex flex-col justify-center items-center gap-5`}>
        <main
          className={`flex-grow flex flex-col justify-center items-center gap-10 ${className}`}>
          {children}
        </main>
        {showFooter && <Footer />}
      </div>
    </>
  );
};

export default AuthenticationLayout;
