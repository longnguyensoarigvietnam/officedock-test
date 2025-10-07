'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

import Button from '@components/common/Button';
import ImageRound from '@components/common/ImageRound';
import MainLayout from '@components/layouts/MainLayout';

import { PermissionsSystem } from '@constants/enums';
import { pageRouters } from '@constants/routers';

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathName = usePathname();

  const pageTitle =
    pathName == pageRouters.MVP_VOTING.href
      ? pageRouters.MVP_VOTING.name
      : pathName == pageRouters.MVP_ANNOUNCEMENT.href
        ? pageRouters.MVP_ANNOUNCEMENT.name
        : pathName == pageRouters.MVP_HISTORY.href
          ? pageRouters.MVP_HISTORY.name
          : '';
  return (
    <MainLayout
      title={pageTitle}
      permission={PermissionsSystem.VIEW_ALL}
      className={`pl-8 pt-8 pb-8 overflow-x-hidden ${pathName == pageRouters.MVP_VOTING.href ? 'overflow-y-auto' : 'overflow-y-hidden'}`}
      showFooter={false}>
      <div
        style={{
          backgroundImage: 'url("/images/mvp-background.jpg")',
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'top center',
          width: '100%',
          height: '100%',
        }}
        className={`relative h-full w-full rounded-tr-[30px] rounded-b-[30px] ${pathName == pageRouters.MVP_VOTING.href ? 'overflow-y-auto' : 'overflow-hidden'}`}>
        {pathName == pageRouters.MVP_ANNOUNCEMENT.href ? (
          <Image
            src="/images/spotlight.svg"
            fill
            alt=""
            className="!z-0 pointer-events-none -mt-[20px] scale-110"
          />
        ) : (
          <></>
        )}
        <div className="absolute flex w-full justify-between items-center z-10">
          {/* Header */}
          <div className="flex gap-5 items-center">
            <div className="h-[80px] bg-white w-[230px] font-medium flex items-center justify-center rounded-br-[30px]">
              <div
                className="flex items-center"
                onClick={() => router.push(pageRouters.MY_PAGE.href)}>
                <ImageRound
                  name="Left icon"
                  src={'/icons/chevron-left.svg'}
                  className={`w-[8px] h-[16px] mr-[10px] cursor-pointer`}
                />
                <p className="text-sm font-medium hover:cursor-pointer">戻る</p>
              </div>
              <ImageRound
                name="MVP Crown"
                src={'/icons/mvp-crown.svg'}
                className="w-[26px] h-[26px] ml-5 cursor-pointer"
              />
              <p className="text-[22px] font-medium ml-[10px]">MVP</p>
            </div>
            <div className="flex justify-between items-center px-[6px] h-[40px] bg-white w-[218px] rounded-[20px]">
              <Link href={pageRouters.MVP_VOTING.href}>
                <Button
                  variant={`${pathName == pageRouters.MVP_VOTING.href ? 'secondary' : 'outline'}`}
                  className={`w-[64px] !p-0 text-xs h-[28px] !font-bold ${pathName == pageRouters.MVP_VOTING.href ? 'text-white !bg-[#C93535]' : '!text-[#8F7777] !bg-[#F7EBEB]'} border-none !rounded-[20px]`}>
                  投票
                </Button>
              </Link>

              <Link href={pageRouters.MVP_ANNOUNCEMENT.href}>
                <Button
                  variant={`${pathName == pageRouters.MVP_ANNOUNCEMENT.href ? 'secondary' : 'outline'}`}
                  className={`w-[64px] !p-0 text-xs h-[28px] !font-bold ${pathName == pageRouters.MVP_ANNOUNCEMENT.href ? 'text-white !bg-[#C93535]' : '!text-[#8F7777] !bg-[#F7EBEB]'} border-none !rounded-[20px]`}>
                  発表
                </Button>
              </Link>
              <Link href={pageRouters.MVP_HISTORY.href}>
                <Button
                  variant={`${pathName == pageRouters.MVP_HISTORY.href ? 'secondary' : 'outline'}`}
                  className={`w-[64px] !p-0 text-xs h-[28px] !font-bold ${pathName == pageRouters.MVP_HISTORY.href ? 'text-white !bg-[#C93535]' : '!text-[#8F7777] !bg-[#F7EBEB]'} border-none !rounded-[20px]`}>
                  履歴
                </Button>
              </Link>
            </div>
          </div>
        </div>
        {children}
      </div>
    </MainLayout>
  );
}
