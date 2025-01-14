import React from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { options } from '@app/api/auth/[...nextauth]/options';

import { pageRouters } from '@constants/routers';
import { SYSTEM_PERMISSIONS_MENU } from '@constants/menu';

const MainRootLayout = async ({ children }: { children: React.ReactNode }) => {
  const session = await getServerSession(options);
  if (session && session.user.permissions.length > 0) {
    setTimeout(() => {
      const firstViewPath = SYSTEM_PERMISSIONS_MENU.filter((menu) =>
        session.user.permissions.includes(menu.requiredPermission),
      ).map((menu) => menu.href)[0];
      if (firstViewPath) {
        redirect(firstViewPath);
      } else {
        redirect(pageRouters.DEFAULT.href);
      }
    }, 500);
  }
  return <main className="w-full ">{children}</main>;
};
export default MainRootLayout;
