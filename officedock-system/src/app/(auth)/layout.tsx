import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { options } from '@app/api/auth/[...nextauth]/options';

import { CompanyMetaNav } from '@components/layouts/CompanyMetaNav';

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
  return (
    <main
      className="w-full flex min-w-[1440px]"
      style={{
        background: 'linear-gradient(168.55deg, #289BF2 0.21%, #73CCDF 99.79%)',
      }}>
      <div className="w-[37.5%] flex flex-col min-h-screen items-center justify-center pb-5">
        <CompanyMetaNav />
      </div>
      <div className="w-[62.5%] rounded-l-[60px] bg-white">{children}</div>
    </main>
  );
};
export default MainRootLayout;
