import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import Image from 'next/image';
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
  return (
    <main
      className="w-full flex min-w-[1440px]"
      style={{
        background: 'linear-gradient(to right, #0068B6, #0088C3)',
      }}>
      <div className="w-1/3 flex flex-col min-h-screen items-center justify-center pb-5">
        <div className="flex flex-grow flex-col justify-center items-center ">
          <Image
            width={200}
            height={200}
            src="/images/officedock_logo_white.svg"
            alt="Officedock logo"
          />
        </div>
        <div className="flex flex-col text-white items-center gap-3">
          <p className="font-medium text-sm">
            利用規約｜個人情報保護方針｜お問い合わせ
          </p>
          <p className="font-normal text-xs">@OFFICEDOCK</p>
        </div>
      </div>
      <div className="w-2/3 rounded-l-[14px] bg-white">{children}</div>
    </main>
  );
};
export default MainRootLayout;
