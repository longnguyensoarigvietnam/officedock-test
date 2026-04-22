'use client';
import { ReactNode, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signOut } from 'next-auth/react';

import Footer from './Footer';
import Metadata from '@components/common/Metadata';

import { SessionStatus } from '@constants/enums';
import { apiRouters, pageRouters } from '@constants/routers';

import { useSessionCache } from '@providers/SessionCacheProvider';

import api from '@base/api';
import { hasFullPaymentPermissions } from '@utils';

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
  const searchParams = useSearchParams();
  const callback = searchParams.get('callback');

  const handleSignOut = async () => {
    await signOut({
      redirect: false,
    });
    await update();
  };

  useEffect(() => {
    const handleRedirect = async () => {
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
          // If there is callback in url then redirect to Dot Money website
          if (callback) {
            try {
              const { data: me } = await api.get(
                `${apiRouters.LOGIN_EXCHANGE}?callback=${callback}&is_login=true`,
                {
                  headers: {
                    Authorization: `Bearer ${session?.accessToken}`,
                  },
                },
              );

              if (me.exchangeUrl) {
                router.push(me.exchangeUrl);
                return;
              }
            } catch (error) {
              if (
                session &&
                hasFullPaymentPermissions(session.user.permissions)
              ) {
                router.push(pageRouters.PAYMENT_MANAGEMENT.href);
              } else {
                router.push(pageRouters.MY_PAGE.href);
              }
            }
          } else {
            if (
              session &&
              hasFullPaymentPermissions(session.user.permissions)
            ) {
              router.push(pageRouters.PAYMENT_MANAGEMENT.href);
            } else {
              router.push(pageRouters.MY_PAGE.href);
            }
          }
        }
      }
    };

    if (
      session &&
      status === SessionStatus.AUTHENTICATED &&
      new Date(session.expires) <= new Date()
    ) {
      handleSignOut();
    }

    handleRedirect();
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
