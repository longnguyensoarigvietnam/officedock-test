'use client';
import { ReactNode, useContext, useEffect, useState } from 'react';
import { Tab, TabGroup, TabList, TabPanels } from '@headlessui/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import Switch from '../Switch';
import { DynamicTooltip } from '@components/tooltip/DynamicTooltip';

import { OptionTabType } from '@interfaces/common';

import { deduplicateSearchParams, showToggleButtonColorByTime } from '@utils';

import { PermissionsSystem, TabType } from '@constants/enums';
import {
  SYSTEM_PERMISSIONS_MENU,
  SYSTEM_PERMISSIONS_MENU_TEAM,
} from '@constants/menu';
import { pageRouters } from '@constants/routers';

import { GlobalStateContext } from '@providers/GlobalStateProvider';
import { useSessionCache } from '@providers/SessionCacheProvider';

type TabsProps = {
  defaultTab?: number;
  tabs: OptionTabType[];
  underline?: boolean;
  expanded?: boolean;
  badge?: boolean;
  className?: string;
  tabClassName?: {
    default?: string;
    active?: string;
  };
  showNotificationDot?: boolean;
  full?: boolean;
  children: ReactNode;
  onSelectedTab?: (idx: number) => void;
};

const Tabs = ({
  defaultTab = 0,
  tabs,
  underline = false,
  expanded,
  badge = false,
  className,
  tabClassName,
  showNotificationDot = false,
  full,
  children,
  onSelectedTab,
}: TabsProps) => {
  const { data: session } = useSessionCache();
  const MENU_ITEMS = SYSTEM_PERMISSIONS_MENU.filter((menu) => {
    if (menu.requiredPermission === PermissionsSystem.VIEW_ALL) {
      return true;
    }
    return session?.user.permissions.includes(menu.requiredPermission);
  });
  const TEAM_MENU_ITEMS = SYSTEM_PERMISSIONS_MENU_TEAM.filter((menu) => {
    if (menu.requiredPermission === PermissionsSystem.VIEW_ALL) {
      return true;
    }
    return session?.user.permissions.includes(menu.requiredPermission);
  });

  const [tabIdx, setTabIdx] = useState<number>(defaultTab);
  const [isTeamDockMenu, setIsTeamDockMenu] = useState<boolean>(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tabIdParam = searchParams.get('tabId');
  const { lastVisitedByTab, setLastVisitedByTab } =
    useContext(GlobalStateContext);

  useEffect(() => {
    setTabIdx(tabIdParam ? Number(tabIdParam) : 0);

    const dedupedParams = deduplicateSearchParams(
      new URLSearchParams(searchParams.toString()),
    );
    const url = `${pathname}?${dedupedParams.toString()}`;

    const isMyDockPage = MENU_ITEMS.filter(
      (item) =>
        item.companyMenu == false &&
        item.href !== pageRouters.MEMBER_MANAGEMENT.href,
    ).some((item) => pathname.includes(item.href));
    const isTeamDockPage = TEAM_MENU_ITEMS.filter(
      (item) =>
        item.companyMenu == false &&
        item.href !== pageRouters.MEMBER_MANAGEMENT.href,
    ).some((item) => pathname.includes(item.href));

    if (Number(tabIdParam) == 1 && isTeamDockPage) {
      setLastVisitedByTab((prev) => ({ ...prev, secondTab: url }));
    } else if (!tabIdParam && isMyDockPage) {
      setLastVisitedByTab((prev) => ({ ...prev, firstTab: url }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabIdParam, pathname, searchParams]);

  const onChangeTab = (idx: number) => {
    setTabIdx(idx);
    setIsTeamDockMenu(idx == 1);
    onSelectedTab && onSelectedTab(idx);
    if (idx) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tabId', String(idx));
      router.push(
        `${lastVisitedByTab.secondTab ? `${lastVisitedByTab.secondTab}` : `${pathname}?${params.toString()}`}`,
        {
          scroll: false,
        },
      );
    } else if (lastVisitedByTab.firstTab) {
      router.push(lastVisitedByTab.firstTab);
    }
  };

  const handleSwitchToggle = (enable: boolean) => {
    setIsTeamDockMenu(enable);
    onChangeTab(enable ? 1 : 0);
  };

  return (
    <TabGroup
      className={'h-full'}
      selectedIndex={tabIdx}
      onChange={(idx) => onChangeTab(idx)}
      key={tabIdx}>
      <div className={`w-full ${className} mt-[30px]`}>
        <TabList
          className={`tab-list flex justify-center rounded-3xl ${
            expanded && 'bg-[#182A4B33]'
          } p-1.5 mx-2 mb-6`}>
          {tabs.length == 2 ? (
            tabs.map((tab, index) => (
              <Tab
                key={index}
                className={({ selected }) =>
                  `tab-button relative flex gap-1 justify-center ${
                    full && 'w-full'
                  } whitespace-nowrap text-base font-medium leading-5 ${
                    underline ? 'border-b-2' : ''
                  } ring-0 focus:outline-none ${
                    selected
                      ? `text-primary ${tabClassName?.active} bg-white rounded-3xl`
                      : `text-[#00000066] ${tabClassName?.default}`
                  }`
                }>
                <span>{tab.name}</span>
                {showNotificationDot && (
                  <div className="notification-dot absolute bg-error w-1 h-1 rounded-full right-1.5 top-2" />
                )}
                {tab.badge && badge ? (
                  <div
                    className={`notification-badge rounded-full w-5 h-5 bg-blue-100 text-blue-700 text-xs font-medium flex justify-center items-center`}>
                    {tab.badge}
                  </div>
                ) : null}
              </Tab>
            ))
          ) : (
            <div className="flex flex-col justify-center items-center gap-2">
              <DynamicTooltip
                content={`${isTeamDockMenu ? 'マイドック' : 'チームドック'}`}
                placement="right"
                customOffset={{
                  left: 10,
                }}>
                <div>
                  <Switch
                    className="!gap-0 ml-1"
                    customTranslate="!translate-x-[115%]"
                    enableColor={showToggleButtonColorByTime()}
                    disableColor="#182A4B33"
                    enable={isTeamDockMenu}
                    onChange={handleSwitchToggle}
                  />
                </div>
              </DynamicTooltip>
              <div className="flex flex-col items-center text-white text-xs">
                {!isTeamDockMenu ? (
                  <>
                    <p>{TabType.MY_DOC.substring(0, 2)}</p>
                    <p>{TabType.MY_DOC.substring(2, TabType.MY_DOC.length)}</p>
                  </>
                ) : (
                  <>
                    <p>{TabType.TEAM_DOCK.substring(0, 3)}</p>
                    <p>
                      {TabType.TEAM_DOCK.substring(3, TabType.TEAM_DOCK.length)}
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </TabList>
        <TabPanels className="tab-panel">{children}</TabPanels>
      </div>
    </TabGroup>
  );
};

export default Tabs;
