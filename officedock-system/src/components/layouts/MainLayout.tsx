'use client';
import { useMutation } from 'react-query';
import { ReactNode, useContext, useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import Metadata from '@components/common/Metadata';

import { apiRouters, pageRouters } from '@constants/routers';
import { PermissionsSystem, SessionStatus } from '@constants/enums';
import { SYSTEM_PERMISSIONS_MENU } from '@constants/menu';

import { hasPermissionInArray } from '@utils';

import { useSessionCache } from '@providers/SessionCacheProvider';
import { GlobalStateContext } from '@providers/GlobalStateProvider';

import Footer from './Footer';
import api from '@base/api';

type MainLayoutProps = {
  children?: ReactNode;
  title?: string;
  className?: string;
  showFooter?: boolean;
  permission?: PermissionsSystem;
};

const MainLayout = ({
  title,
  className,
  children,
  permission,
  showFooter = true,
}: MainLayoutProps) => {
  const { totalNotifications } = useContext(GlobalStateContext);
  const { data: session, status, update } = useSessionCache();
  const router = useRouter();

  const [isShow, setIsShow] = useState(false);

  const handleSignOut = async () => {
    await signOut({
      redirect: false,
    });
    await update();
    window.location.href = pageRouters.LOGIN.href;
  };

  useEffect(() => {
    if (session && status === SessionStatus.AUTHENTICATED) {
      if (new Date(session.expires) <= new Date()) {
        window.location.href = pageRouters.LOGIN.href;
        return;
      }
      if (permission) {
        if (session?.user.permissions && session?.user.permissions.length > 0) {
          const isPermission = hasPermissionInArray(
            session?.user.permissions,
            permission,
          );

          if (!isPermission) {
            setIsShow(false);

            const firstViewPath = SYSTEM_PERMISSIONS_MENU.filter((menu) =>
              session.user.permissions.includes(menu.requiredPermission),
            ).map((menu) => menu.href)[0];

            if (firstViewPath) {
              router.push(firstViewPath);
            } else {
              router.push(pageRouters.DEFAULT.href);
            }
          } else {
            setIsShow(true);
          }
        } else {
          handleSignOut();
        }
      }
    } else if (status === SessionStatus.UNAUTHENTICATED) {
      handleSignOut();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status, permission]);

  const handleLoginBonus = async () => {
    const { data: response } = await api.get(apiRouters.LOGIN_BONUS);
    return response;
  };

  const { mutate: loginBonusData } = useMutation(
    'handleLoginBonus',
    handleLoginBonus,
    {
      onSuccess: async () => {},
      onError: () => {},
      onSettled: () => {},
    },
  );

  useEffect(() => {
    if (session && status === SessionStatus.AUTHENTICATED) {
      const today = new Date().toISOString().split('T')[0];
      const idUser = String(session?.user.id);

      const storedData = localStorage.getItem('loginBonus');
      if (!storedData) {
        loginBonus(idUser, today);
        return;
      }

      try {
        const parsed = JSON.parse(storedData);

        if (parsed.idUser === idUser && parsed.date === today) {
          return;
        } else {
          loginBonus(idUser, today);
        }
      } catch (e) {
        loginBonus(idUser, today);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status]);

  function loginBonus(idUser: string, date: string) {
    localStorage.setItem('loginBonus', JSON.stringify({ idUser, date }));
    loginBonusData();
  }

  return (
    <div className="h-[calc(100vh_-_76px)]">
      <Metadata
        metadata={
          title == pageRouters.CHAT_MANAGEMENT.name
            ? `${pageRouters.CHAT_MANAGEMENT.name}${totalNotifications > 0 ? `(${totalNotifications})` : ''}`
            : title
        }
      />
      <div
        className={`overflow-x-hidden overflow-y-auto h-full flex-grow flex flex-col gap-10 bg-[#E6F3FB] custom-scrollbar p-4 ${className}`}>
        <main className="flex-grow flex flex-col">
          <div className="flex-grow">{isShow && children}</div>
          {showFooter && <Footer className="!mb-0" />}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
