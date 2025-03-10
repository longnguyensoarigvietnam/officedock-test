'use client';
import { ReactNode, useEffect, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import Footer from './Footer';

import Metadata from '@components/common/Metadata';
import { pageRouters } from '@constants/routers';
import { PermissionsSystem, SessionStatus } from '@constants/enums';
import { SYSTEM_PERMISSIONS_MENU } from '@constants/menu';
import { hasPermissionInArray } from '@utils';

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
  const { data: session, status, update } = useSession();
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

  return (
    <div className="h-[calc(100vh_-_76px)]">
      <Metadata metadata={title} />
      <div
        className={`overflow-x-hidden overflow-y-auto h-full flex-grow flex flex-col gap-10 bg-transparent custom-scrollbar p-4 ${className}`}>
        <main className="flex-grow flex flex-col">
          <div className="flex-grow">{isShow && children}</div>
          {showFooter && <Footer className="!mb-0" />}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
