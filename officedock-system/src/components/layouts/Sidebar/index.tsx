'use client';
import { useContext, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  TabPanel,
} from '@headlessui/react';
import { useSession } from 'next-auth/react';
import lodash from 'lodash';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';

import ImageRound from '@components/common/ImageRound';
import Tabs from '@components/common/Tabs';
import socketEventEmitter from '@components/socket/socketEventEmitter';

import {
  SYSTEM_PERMISSIONS_MENU,
  SYSTEM_PERMISSIONS_MENU_TEAM,
} from '@constants/menu';
import { PermissionsSystem, SocketActions, TabType } from '@constants/enums';
import { pageRouters } from '@constants/routers';

import { MenuItem } from '@interfaces/menu';
import { OptionTabType } from '@interfaces/common';

import useDashboardUnreadMessages from '@hooks/useDashboardUnreadMessages';

import { TaskContext } from '@providers/TaskProvider';
import { GlobalStateContext } from '@providers/GlobalStateProvider';
import { WebSocketMessageData } from '@interfaces/chat';
import { showBackgroundColorByTime } from '@utils';

type Props = {
  className?: string;
};

const updateCurrent = (menuItems: MenuItem[], pathname: string): MenuItem[] => {
  return menuItems.map((item) => {
    const updatedItem = { ...item };

    if (updatedItem.href && pathname == updatedItem.href) {
      updatedItem.current = true;
    } else if (updatedItem.children) {
      const childWithMatchingHref = updatedItem.children.find((child) =>
        child.href.startsWith(pathname),
      );
      if (childWithMatchingHref) {
        updatedItem.current = true;
        childWithMatchingHref.current = true;
      }
      updatedItem.children = updateCurrent(updatedItem.children, pathname);
    }

    return updatedItem;
  });
};

const Sidebar = ({ className }: Props) => {
  const router = useRouter();
  const pathname = usePathname();

  const { data: session } = useSession();
  const today = new Date();

  const { memberSelected, tagSelected, setMemberSelected, setTagSelected } =
    useContext(TaskContext);
  const { totalNotifications, expanded, setExpanded, setTotalNotifications } =
    useContext(GlobalStateContext);
  const { dashboardUnreadMessages } = useDashboardUnreadMessages();

  const MENU_ITEMS = SYSTEM_PERMISSIONS_MENU.filter((menu) => {
    if (menu.requiredPermission === PermissionsSystem.VIEW_ALL) {
      return true;
    }
    return session?.user.permissions.includes(menu.requiredPermission);
  });
  const menuItemsClone: MenuItem[] = lodash.cloneDeep(MENU_ITEMS);
  const menuItems = updateCurrent(menuItemsClone, pathname);

  const tabSidebar: OptionTabType[] = [
    { name: TabType.MY_DOC },
    { name: TabType.TEAM_DOCK },
  ];

  const MENU_ITEMS_TEAM = SYSTEM_PERMISSIONS_MENU_TEAM.filter((menu) => {
    if (menu.requiredPermission === PermissionsSystem.VIEW_ALL) {
      return true;
    }
    return session?.user.permissions.includes(menu.requiredPermission);
  });
  const menuItemsCloneTeam: MenuItem[] = lodash.cloneDeep(MENU_ITEMS_TEAM);
  const menuItemsTeam = updateCurrent(menuItemsCloneTeam, pathname);

  useEffect(() => {
    const handleSocketMessage = (data: WebSocketMessageData) => {
      switch (data.action) {
        case SocketActions.TOTAL_UNREAD_MESSAGE:
          if (data.total != undefined) {
            setTotalNotifications(data.total);
          }
          break;

        default:
          break;
      }
    };

    socketEventEmitter.on('message', handleSocketMessage);

    return () => {
      socketEventEmitter.off('message', handleSocketMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (dashboardUnreadMessages)
      setTotalNotifications(dashboardUnreadMessages?.total);
  }, [dashboardUnreadMessages, setTotalNotifications]);

  const hour = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    hour: 'numeric',
    hour12: false,
  }).format(new Date());

  const [isHasTerm, setHasTerm] = useState(false);
  useEffect(() => {
    if (session) {
      if (
        session?.user.unreadTerms?.length &&
        session?.user.unreadTerms?.length > 0
      ) {
        const hasFalse = session?.user.unreadTerms.some(
          (item) => item.isAccepted === false,
        );
        if (hasFalse) {
          setHasTerm(true);
        } else {
          setHasTerm(false);
        }
      } else {
        setHasTerm(false);
      }
    }
  }, [session]);

  const memberOption = menuItems.find(
    (item) => item.href == pageRouters.MEMBER_MANAGEMENT.href,
  );

  return (
    <aside
      className={`overflow-x-hidden ${hour} overflow-y-hidden relative transition-all duration-300 ${expanded ? 'w-52 min-w-[208px]' : 'w-20 min-w-[70px]'} flex flex-col ${className}`}
      style={{
        background:
          today &&
          showBackgroundColorByTime(Number(hour.substring(0, hour.length - 1))),
      }}>
      <Tabs
        tabs={expanded ? tabSidebar : [tabSidebar[0]]}
        expanded={expanded}
        underline={false}
        showNotificationDot={true}
        full
        className="h-full [&_.tab-button]:!text-xs [&_.tab-button]:!font-bold [&_.tab-button]:!py-[unset] [&_.tab-button]:!px-[unset] [&_.tab-button>span]:py-2">
        <TabPanel key={0} className={'h-full relative'}>
          <nav className="flex flex-col  w-full mb-5  h-full max-h-[70%]">
            <ul role="list" className="flex flex-col gap-y-6 list-none">
              <li className="flex-1">
                <ul role="list" className="list-none pl-2">
                  {menuItems
                    .filter(
                      (item) =>
                        item.companyMenu == false &&
                        item.href !== pageRouters.MEMBER_MANAGEMENT.href,
                    )
                    .map((item) => (
                      <Tippy
                        content={`${item.name}`}
                        disabled={expanded}
                        arrow={false}
                        delay={1000}
                        key={item.name}
                        placement="right"
                        offset={[0, 0]}>
                        <li key={item.name} className={`text-sm relative`}>
                          {!item.children ? (
                            <div
                              className={`group cursor-pointer flex items-center gap-2 py-4 px-3 leading-6 rounded-l-md ${item.current && !memberSelected && !tagSelected ? 'bg-[#EBF1F7] menu-item' : 'hover:mr-2 hover:rounded-r-md hover:bg-[#FFFFFF33]'}`}
                              onClick={() => {
                                if (isHasTerm) return;

                                if (
                                  item.href ===
                                  pageRouters.TASKS_MANAGEMENT.href
                                ) {
                                  setTagSelected('');
                                  setMemberSelected('');
                                  router.push(`${item.href}?view=day`);
                                } else {
                                  if (
                                    pathname ===
                                      pageRouters.CHAT_MANAGEMENT.href &&
                                    item.href ===
                                      pageRouters.CHAT_MANAGEMENT.href
                                  ) {
                                    return;
                                  }
                                  {
                                    router.push(item.href);
                                  }
                                }
                              }}>
                              {item.iconUrl && (
                                <ImageRound
                                  className={`w-5 h-5 ${!expanded && 'ml-2 my-1'}`}
                                  src={item.iconUrl(item.current)}
                                  name={`Icon ${item.name} menu`}
                                />
                              )}
                              {!expanded &&
                                item.iconUrl &&
                                item.iconUrl(true).includes('chat') &&
                                totalNotifications > 0 && (
                                  <div className="notification-dot absolute bg-error w-1 h-1 rounded-full right-4 top-4" />
                                )}
                              {expanded && (
                                <>
                                  <p
                                    className={`opacity-100 text-left font-medium w-fit text-white ${item.current && !memberSelected && !tagSelected && '!text-black'}`}>
                                    {item.name}
                                  </p>
                                </>
                              )}
                              {expanded &&
                                item.hasNotification &&
                                totalNotifications != undefined &&
                                totalNotifications > 0 && (
                                  <p className="rounded-full w-4 h-4 bg-error text-[10px] text-center text-white leading-4">
                                    {totalNotifications}
                                  </p>
                                )}
                            </div>
                          ) : (
                            <Disclosure as="div" defaultOpen={item.current}>
                              {({ open }) => (
                                <>
                                  <DisclosureButton
                                    className={`flex items-center w-full gap-4 py-4 px-3 hover:bg-gray-50`}>
                                    {item.iconUrl && (
                                      <ImageRound
                                        className="w-4 h-4"
                                        src={item.iconUrl(item.current)}
                                        name={`Icon ${item.name} menu`}
                                      />
                                    )}
                                    <p
                                      className={`flex-1 text-left ${item.current ? 'font-medium text-primary' : ''}`}>
                                      {item.name}
                                    </p>
                                    <ImageRound
                                      className={`w-4 h-4 ${open ? 'rotate-180' : ''}`}
                                      src={`/icons/arrow-down${item.current ? '-active' : ''}.svg`}
                                      name="Arrow menu icon"
                                    />
                                  </DisclosureButton>
                                  <DisclosurePanel
                                    as="ul"
                                    className="list-none mt-1 px-2 last:pb-2">
                                    {item.children?.map((subItem) => (
                                      <li key={subItem.name}>
                                        <Link
                                          href={subItem.href}
                                          className={`block py-2 pr-2 pl-9 ${subItem.current ? 'font-medium text-primary' : 'hover:bg-gray-50'}`}>
                                          {subItem.name}
                                        </Link>
                                      </li>
                                    ))}
                                  </DisclosurePanel>
                                </>
                              )}
                            </Disclosure>
                          )}
                        </li>
                      </Tippy>
                    ))}
                </ul>
              </li>
            </ul>
          </nav>
          {memberOption && (
            <div
              className={`absolute ${expanded ? 'bottom-[135px]' : 'bottom-[165px]'}  left-0 w-full`}>
              <ul
                role="list"
                className="flex max-h-20 flex-col gap-y-6 list-none">
                <li className="flex-1">
                  <ul role="list" className="list-none pl-2">
                    <Tippy
                      content={`${memberOption.name}`}
                      disabled={expanded}
                      arrow={false}
                      delay={1000}
                      key={memberOption.name}
                      placement="right"
                      offset={[0, 0]}>
                      <li
                        key={memberOption.name}
                        className={`text-sm relative`}>
                        <div
                          className={`group cursor-pointer flex items-center gap-2 py-4 px-3 leading-6 rounded-l-md ${memberOption.current && !memberSelected && !tagSelected ? 'bg-[#EBF1F7] menu-item' : 'hover:mr-2 hover:rounded-r-md hover:bg-[#FFFFFF33]'}`}
                          onClick={() => {
                            if (isHasTerm) return;

                            router.push(memberOption.href);
                          }}>
                          {memberOption.iconUrl && (
                            <ImageRound
                              className={`w-5 h-5 ${!expanded && 'ml-2 my-1'}`}
                              src={memberOption.iconUrl(memberOption.current)}
                              name={`Icon ${memberOption.name} menu`}
                            />
                          )}
                          {!expanded &&
                            memberOption.iconUrl &&
                            memberOption.iconUrl(true).includes('chat') &&
                            totalNotifications > 0 && (
                              <div className="notification-dot absolute bg-error w-1 h-1 rounded-full right-4 top-4" />
                            )}
                          {expanded && (
                            <>
                              <p
                                className={`opacity-100 text-left font-medium w-fit text-white ${memberOption.current && !memberSelected && !tagSelected && '!text-black'}`}>
                                {memberOption.name}
                              </p>
                            </>
                          )}
                        </div>
                      </li>
                    </Tippy>
                  </ul>
                </li>
              </ul>
            </div>
          )}
        </TabPanel>
        <TabPanel key={1}>
          <nav className="flex flex-col  w-full mb-5  h-full max-h-[70%]">
            <ul role="list" className="flex flex-col gap-y-6 list-none">
              <li className="flex-1">
                <ul role="list" className="list-none pl-2">
                  {menuItemsTeam
                    .filter(
                      (item) =>
                        item.companyMenu == false &&
                        item.href !== pageRouters.MEMBER_MANAGEMENT.href,
                    )
                    .map((item) => (
                      <Tippy
                        content={`${item.name}`}
                        disabled={expanded}
                        arrow={false}
                        delay={1000}
                        key={item.name}
                        placement="right"
                        offset={[0, 0]}>
                        <li key={item.name} className={`text-sm relative`}>
                          {!item.children ? (
                            <div
                              className={`group cursor-pointer flex items-center gap-2 py-4 px-3 leading-6 rounded-l-md ${item.current && !memberSelected && !tagSelected ? 'bg-[#EBF1F7] menu-item' : 'hover:mr-2 hover:rounded-r-md hover:bg-[#FFFFFF33]'}`}
                              onClick={() => {
                                if (isHasTerm) return;

                                if (
                                  item.href ===
                                  pageRouters.TASKS_MANAGEMENT.href
                                ) {
                                  setTagSelected('');
                                  setMemberSelected('');
                                  router.push(`${item.href}?view=day`);
                                } else {
                                  if (
                                    pathname ===
                                      pageRouters.CHAT_MANAGEMENT.href &&
                                    item.href ===
                                      pageRouters.CHAT_MANAGEMENT.href
                                  ) {
                                    return;
                                  }
                                  {
                                    router.push(item.href);
                                  }
                                }
                              }}>
                              {item.iconUrl && (
                                <ImageRound
                                  className={`w-5 h-5 ${!expanded && 'ml-2 my-1'}`}
                                  src={item.iconUrl(item.current)}
                                  name={`Icon ${item.name} menu`}
                                />
                              )}
                              {!expanded &&
                                item.iconUrl &&
                                item.iconUrl(true).includes('chat') &&
                                totalNotifications > 0 && (
                                  <div className="notification-dot absolute bg-error w-1 h-1 rounded-full right-4 top-4" />
                                )}
                              {expanded && (
                                <>
                                  <p
                                    className={`opacity-100 text-left font-medium w-fit text-white ${item.current && !memberSelected && !tagSelected && '!text-black'}`}>
                                    {item.name}
                                  </p>
                                </>
                              )}
                              {expanded &&
                                item.hasNotification &&
                                totalNotifications != undefined &&
                                totalNotifications > 0 && (
                                  <p className="rounded-full w-4 h-4 bg-error text-[10px] text-center text-white leading-4">
                                    {totalNotifications}
                                  </p>
                                )}
                            </div>
                          ) : (
                            <Disclosure as="div" defaultOpen={item.current}>
                              {({ open }) => (
                                <>
                                  <DisclosureButton
                                    className={`flex items-center w-full gap-4 py-4 px-3 hover:bg-gray-50`}>
                                    {item.iconUrl && (
                                      <ImageRound
                                        className="w-4 h-4"
                                        src={item.iconUrl(item.current)}
                                        name={`Icon ${item.name} menu`}
                                      />
                                    )}
                                    <p
                                      className={`flex-1 text-left ${item.current ? 'font-medium text-primary' : ''}`}>
                                      {item.name}
                                    </p>
                                    <ImageRound
                                      className={`w-4 h-4 ${open ? 'rotate-180' : ''}`}
                                      src={`/icons/arrow-down${item.current ? '-active' : ''}.svg`}
                                      name="Arrow menu icon"
                                    />
                                  </DisclosureButton>
                                  <DisclosurePanel
                                    as="ul"
                                    className="list-none mt-1 px-2 last:pb-2">
                                    {item.children?.map((subItem) => (
                                      <li key={subItem.name}>
                                        <Link
                                          href={subItem.href}
                                          className={`block py-2 pr-2 pl-9 ${subItem.current ? 'font-medium text-primary' : 'hover:bg-gray-50'}`}>
                                          {subItem.name}
                                        </Link>
                                      </li>
                                    ))}
                                  </DisclosurePanel>
                                </>
                              )}
                            </Disclosure>
                          )}
                        </li>
                      </Tippy>
                    ))}
                </ul>
              </li>
            </ul>
          </nav>
          {memberOption && (
            <div
              className={`absolute ${expanded ? 'bottom-[40px]' : 'bottom-[40px]'}  left-0 w-full`}>
              <ul
                role="list"
                className="flex max-h-20 flex-col gap-y-6 list-none">
                <li className="flex-1">
                  <ul role="list" className="list-none pl-2">
                    <Tippy
                      content={`${memberOption.name}`}
                      disabled={expanded}
                      arrow={false}
                      delay={1000}
                      key={memberOption.name}
                      placement="right"
                      offset={[0, 0]}>
                      <li
                        key={memberOption.name}
                        className={`text-sm relative`}>
                        <div
                          className={`group cursor-pointer flex items-center gap-2 py-4 px-3 leading-6 rounded-l-md ${memberOption.current && !memberSelected && !tagSelected ? 'bg-[#EBF1F7] menu-item' : 'hover:mr-2 hover:rounded-r-md hover:bg-[#FFFFFF33]'}`}
                          onClick={() => {
                            if (isHasTerm) return;

                            router.push(memberOption.href);
                          }}>
                          {memberOption.iconUrl && (
                            <ImageRound
                              className={`w-5 h-5 ${!expanded && 'ml-2 my-1'}`}
                              src={memberOption.iconUrl(memberOption.current)}
                              name={`Icon ${memberOption.name} menu`}
                            />
                          )}
                          {!expanded &&
                            memberOption.iconUrl &&
                            memberOption.iconUrl(true).includes('chat') &&
                            totalNotifications > 0 && (
                              <div className="notification-dot absolute bg-error w-1 h-1 rounded-full right-4 top-4" />
                            )}
                          {expanded && (
                            <>
                              <p
                                className={`opacity-100 text-left font-medium w-fit text-white ${memberOption.current && !memberSelected && !tagSelected && '!text-black'}`}>
                                {memberOption.name}
                              </p>
                            </>
                          )}
                        </div>
                      </li>
                    </Tippy>
                  </ul>
                </li>
              </ul>
            </div>
          )}
        </TabPanel>
        <Tippy
          content={expanded ? 'メニューバーを縮小' : 'メニューバーを拡大'}
          arrow={false}
          delay={1000}
          placement="right"
          offset={[0, 19]}>
          <div
            className="shadow-lg absolute bottom-5 right-5 bg-white rounded-full w-[35px] h-[35px] flex items-center justify-center p-[8px] hover:cursor-pointer"
            onClick={() => setExpanded((prevExpanded) => !prevExpanded)}>
            <ImageRound
              src="/icons/extend-calendar.svg"
              name="Extend calendar"
              className={`!w-3.5 !h-3.5 min-w-2 ${expanded ? 'rotate-180' : ''}`}
            />
          </div>
        </Tippy>
      </Tabs>
    </aside>
  );
};

export default Sidebar;
