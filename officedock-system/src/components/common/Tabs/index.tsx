'use client';
import { ReactNode, useEffect, useState } from 'react';
import { Tab, TabGroup, TabList, TabPanels } from '@headlessui/react';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';

import Switch from '../Switch';
import { OptionTabType } from '@interfaces/common';
import { showToggleButtonColorByTime } from '@utils';
import { TabType } from '@constants/enums';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

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
  const [tabIdx, setTabIdx] = useState<number>(defaultTab);
  const [isTeamDockMenu, setIsTeamDockMenu] = useState<boolean>(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tabIdParam = searchParams.get('tabId');

  useEffect(() => {
    setTabIdx(tabIdParam ? Number(tabIdParam) : 0);
  }, [tabIdParam]);

  const onChangeTab = (idx: number) => {
    setTabIdx(idx);
    setIsTeamDockMenu(idx == 1);
    onSelectedTab && onSelectedTab(idx);
    if(idx){
      const params = new URLSearchParams(searchParams.toString());
      params.set('tabId', String(idx));
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
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
      <div className={`w-full ${className} mt-5`}>
        <TabList
          className={`tab-list flex justify-center rounded-3xl ${
            expanded && 'bg-[#182A4B33]'
          } p-1.5 mx-2 mb-3`}>
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
              <Tippy
                content={`${isTeamDockMenu ? 'マイドック' : 'チームドック'}`}
                arrow={false}
                delay={1000}
                placement="top">
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
              </Tippy>
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
