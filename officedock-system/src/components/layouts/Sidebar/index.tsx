'use client';
import { useContext, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  TabPanel,
} from '@headlessui/react';
import { useSessionCache } from '@providers/SessionCacheProvider';

import lodash from 'lodash';

import ImageRound from '@components/common/ImageRound';
import Tabs from '@components/common/Tabs';
import socketEventEmitter from '@components/socket/socketEventEmitter';
import Dropdown from '@components/common/Dropdown';

import {
  SYSTEM_PERMISSIONS_MENU,
  SYSTEM_PERMISSIONS_MENU_TEAM,
} from '@constants/menu';
import {
  PendingNavigationType,
  PermissionsSystem,
  SocketActions,
  TabType,
} from '@constants/enums';
import { pageRouters } from '@constants/routers';

import { MenuItem } from '@interfaces/menu';
import { OptionDropdownType, OptionTabType } from '@interfaces/common';

import useDashboardUnreadMessages from '@hooks/useDashboardUnreadMessages';

import { TaskContext } from '@providers/TaskProvider';
import { GlobalStateContext } from '@providers/GlobalStateProvider';
import { WebSocketMessageData } from '@interfaces/chat';
import { showBackgroundColorByTime } from '@utils';
import GroupIconWithDynamicColor from '@components/common/GroupIcon';
import ChatWarningUploadingFilesModal from '@components/modals/ChatWarningUploadingFilesModal';
import useTeamList from '@hooks/useListTeam';
import { DynamicTooltip } from '@components/tooltip/DynamicTooltip';
import { MAXIMUM_VISIBLE_NOTIFICATIONS } from '@constants';

type Props = {
  className?: string;
};

const updateCurrent = (menuItems: MenuItem[], pathname: string): MenuItem[] => {
  return menuItems.map((item) => {
    const updatedItem = { ...item };

    if (updatedItem.href) {
      const isActive =
        pathname === updatedItem.href ||
        (pathname.startsWith(updatedItem.href + '/') &&
          updatedItem.href !== '/');

      updatedItem.current = isActive;
    }

    if (updatedItem.children) {
      updatedItem.children = updateCurrent(updatedItem.children, pathname);
      if (updatedItem.children.some((child) => child.current)) {
        updatedItem.current = true;
      }
    }

    return updatedItem;
  });
};

const Sidebar = ({ className }: Props) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [organizationList, setOrganizationList] = useState<
    OptionDropdownType[]
  >([]);
  const organizationId = searchParams.get('organization');

  const { data: session } = useSessionCache();
  const today = new Date();

  const { memberSelected, tagSelected, setMemberSelected, setTagSelected } =
    useContext(TaskContext);
  const {
    totalNotifications,
    expanded,
    selectedOrganization,
    isChatFilesUploading,
    setOrganizationTeamList,
    setSelectedOrganization,
    setExpanded,
    setTotalNotifications,
    cancelUploadChatFiles,
  } = useContext(GlobalStateContext);
  const { dashboardUnreadMessages } = useDashboardUnreadMessages();
  const [showWarningChatUploadingModal, setShowWarningChatUploadingModal] =
    useState(false);
  const [pendingPageChange, setPendingPageChange] = useState<string | null>(
    null,
  );
  const [pendingNavigationType, setPendingNavigationType] =
    useState<PendingNavigationType | null>(null);

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

  const getRandomColor = () => {
    const hue = Math.floor(Math.random() * 360);
    const saturation = Math.floor(Math.random() * (80 - 40) + 40);
    const lightness = Math.floor(Math.random() * (70 - 30) + 30);

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

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

  const { teamList } = useTeamList({
    onSuccess: (data) => {
      setOrganizationList([
        ...data.map((org) => ({
          value: org.id as number,
          label: org.name,
          imgComponent: <GroupIconWithDynamicColor color={getRandomColor()} />,
        })),
      ]);
      setOrganizationTeamList([
        ...data.map((org) => ({
          value: org.id as number,
          label: org.name,
          imgComponent: <GroupIconWithDynamicColor color={getRandomColor()} />,
        })),
      ]);
    },
  });

  useEffect(() => {
    if (organizationId && teamList && organizationList) {
      const foundOrganization = teamList.find(
        (org) => org.id == Number(organizationId),
      );
      if (foundOrganization) {
        setSelectedOrganization({
          value: organizationId,
          label: foundOrganization?.name,
          imgComponent: organizationList.find(
            (org) => org.value == organizationId,
          )?.imgComponent,
        });
      }
    }
  }, [organizationId, teamList, organizationList]);

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

  let defaultOrganization = {
    label: '',
    value: '',
  };
  const mainOrganization = teamList?.find(
    (organization) => organization.isMain,
  );
  if (mainOrganization) {
    defaultOrganization = {
      label: mainOrganization.name,
      value: String(mainOrganization.id),
    };
  } else {
    if (teamList?.length && teamList?.length > 0) {
      defaultOrganization = {
        label: teamList[0].name,
        value: String(teamList[0].id),
      };
    }
  }

  const handleNavigateToMyDockPage = (href: string) => {
    if (pathname == href) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete('organization');
    params.delete('tabId');
    if (href === pageRouters.TASKS_MANAGEMENT.href) {
      setTagSelected('');
      setMemberSelected('');
      router.push(`${href}?view=day`);
    } else {
      params.delete('view');
      {
        router.push(`${href}?${params.toString()}`);
      }
    }
    setPendingPageChange(null);
    setPendingNavigationType(null);
  };

  const handleNavigateToTeamDockPage = (href: string) => {
    if (href === pageRouters.TASKS_MANAGEMENT.href) {
      setTagSelected('');
      setMemberSelected('');
      router.push(`${href}?view=day`);
    } else {
      if (
        pathname === pageRouters.CHAT_MANAGEMENT.href &&
        href === pageRouters.CHAT_MANAGEMENT.href
      ) {
        return;
      }
      {
        const organizationId = searchParams.get('organization');
        const params = new URLSearchParams(searchParams.toString());
        let defaultOrganization = {
          label: '',
          value: '',
        };
        const mainOrganization = teamList?.find(
          (organization) => organization.isMain,
        );
        if (mainOrganization) {
          defaultOrganization = {
            label: mainOrganization.name,
            value: String(mainOrganization.id),
          };
        } else {
          if (teamList?.length && teamList?.length > 0) {
            defaultOrganization = {
              label: teamList[0].name,
              value: String(teamList[0].id),
            };
          }
        }
        if (!organizationId) {
          if (selectedOrganization) {
            params.set('organization', selectedOrganization.value as string);
          } else {
            if (defaultOrganization.label && defaultOrganization.value) {
              setSelectedOrganization({
                label: defaultOrganization.label,
                value: defaultOrganization.value,
              });

              params.set('organization', defaultOrganization.value as string);
            }
          }
        }
        params.set('tabId', '1');
        params.delete('room');

        router.push(`${href}?${params.toString()}`);
      }
    }
    setPendingPageChange(null);
    setPendingNavigationType(null);
  };

  const handleNavigateToMemberPage = (href: string) => {
    router.push(href);
    setPendingPageChange(null);
    setPendingNavigationType(null);
  };

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
                      <DynamicTooltip
                        content={`${item.name}`}
                        disabled={expanded}
                        key={item.name}>
                        <li key={item.name} className={`text-sm relative`}>
                          {!item.children ? (
                            <div
                              className={`group cursor-pointer flex items-center gap-2 py-4 px-3 leading-6 rounded-l-md ${item.current && !memberSelected && !tagSelected ? 'bg-[#EBF1F7] menu-item' : 'hover:mr-2 hover:rounded-r-md hover:bg-[#FFFFFF33]'}`}
                              onClick={() => {
                                if (isHasTerm) return;
                                if (isChatFilesUploading) {
                                  setPendingPageChange(item.href);
                                  setPendingNavigationType(
                                    PendingNavigationType.MY_DOCK,
                                  );
                                  setShowWarningChatUploadingModal(true);
                                  return;
                                }
                                handleNavigateToMyDockPage(item.href);
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
                                  <p className="rounded-full w-4 h-4 bg-error text-[9px] text-center text-white leading-4">
                                    {totalNotifications >
                                    MAXIMUM_VISIBLE_NOTIFICATIONS
                                      ? `${MAXIMUM_VISIBLE_NOTIFICATIONS}+`
                                      : `${totalNotifications}`}
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
                      </DynamicTooltip>
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
                    <DynamicTooltip
                      content={`${memberOption.name}`}
                      disabled={expanded}
                      key={memberOption.name}
                      placement="right">
                      <li className={`text-sm relative`}>
                        <div
                          className={`group cursor-pointer flex items-center gap-2 py-4 px-3 leading-6 rounded-l-md ${memberOption.current && !memberSelected && !tagSelected ? 'bg-[#EBF1F7] menu-item' : 'hover:mr-2 hover:rounded-r-md hover:bg-[#FFFFFF33]'}`}
                          onClick={() => {
                            if (isHasTerm) return;
                            if (isChatFilesUploading) {
                              setPendingPageChange(memberOption.href);
                              setPendingNavigationType(
                                PendingNavigationType.MEMBER,
                              );
                              setShowWarningChatUploadingModal(true);
                              return;
                            }
                            handleNavigateToMemberPage(memberOption.href);
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
                    </DynamicTooltip>
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
                  {expanded ? (
                    <div className="flex justify-center pr-2 mb-2">
                      <Dropdown
                        options={organizationList}
                        className="!bg-[#182A4B33] !border-none !rounded-[6px] !w-full mb-1 !text-white !font-medium !text-sm !pr-0"
                        selectedOption={
                          selectedOrganization || {
                            label: defaultOrganization?.label || '',
                            value: defaultOrganization?.value || '',
                            imgComponent: organizationList.find(
                              (org) => org.value == defaultOrganization?.value,
                            )?.imgComponent,
                          }
                        }
                        labelClass="max-w-[100px]"
                        labelOptionClass="!text-sm max-w-[200px] !truncate"
                        imgClassname="!w-6 !h-6"
                        onChange={(e: OptionDropdownType) => {
                          setSelectedOrganization({
                            label: e.label,
                            value: e.value,
                            imgComponent: organizationList.find(
                              (org) => org.value == e.value,
                            )?.imgComponent,
                          });
                          const params = new URLSearchParams(
                            searchParams.toString(),
                          );
                          params.set('organization', e.value as string);

                          router.push(`${pathname}?${params.toString()}`);
                        }}
                      />
                    </div>
                  ) : (
                    <div className="px-4 mb-2">
                      {selectedOrganization?.imgComponent ||
                        organizationList.find(
                          (org) => org.value == defaultOrganization?.value,
                        )?.imgComponent}
                    </div>
                  )}

                  {menuItemsTeam
                    .filter(
                      (item) =>
                        item.companyMenu == false &&
                        item.href !== pageRouters.MEMBER_MANAGEMENT.href,
                    )
                    .map((item) => (
                      <DynamicTooltip
                        content={`${item.name}`}
                        disabled={expanded}
                        key={item.name}
                        placement="right">
                        <li key={item.name} className={`text-sm relative`}>
                          {!item.children ? (
                            <div
                              className={`group cursor-pointer flex items-center gap-2 py-4 px-3 leading-6 rounded-l-md ${item.current && !memberSelected && !tagSelected ? 'bg-[#EBF1F7] menu-item' : 'hover:mr-2 hover:rounded-r-md hover:bg-[#FFFFFF33]'}`}
                              onClick={() => {
                                if (isHasTerm) return;
                                if (isChatFilesUploading) {
                                  setPendingPageChange(item.href);
                                  setPendingNavigationType(
                                    PendingNavigationType.TEAM_DOCK,
                                  );
                                  setShowWarningChatUploadingModal(true);
                                  return;
                                }
                                handleNavigateToTeamDockPage(item.href);
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
                                    {totalNotifications >
                                    MAXIMUM_VISIBLE_NOTIFICATIONS
                                      ? `${MAXIMUM_VISIBLE_NOTIFICATIONS}+`
                                      : `${totalNotifications}`}
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
                      </DynamicTooltip>
                    ))}
                </ul>
              </li>
            </ul>
          </nav>
          {memberOption && (
            <div
              className={`absolute ${expanded ? 'bottom-[60px]' : 'bottom-[60px]'}  left-0 w-full`}>
              <ul
                role="list"
                className="flex max-h-20 flex-col gap-y-6 list-none">
                <li className="flex-1">
                  <ul role="list" className="list-none pl-2">
                    <DynamicTooltip
                      content={`${memberOption.name}`}
                      disabled={expanded}
                      key={memberOption.name}
                      placement="right">
                      <li
                        key={memberOption.name}
                        className={`text-sm relative`}>
                        <div
                          className={`group cursor-pointer flex items-center gap-2 py-4 px-3 leading-6 rounded-l-md ${memberOption.current && !memberSelected && !tagSelected ? 'bg-[#EBF1F7] menu-item' : 'hover:mr-2 hover:rounded-r-md hover:bg-[#FFFFFF33]'}`}
                          onClick={() => {
                            if (isHasTerm) return;
                            if (isChatFilesUploading) {
                              setPendingPageChange(memberOption.href);
                              setPendingNavigationType(
                                PendingNavigationType.MEMBER,
                              );
                              setShowWarningChatUploadingModal(true);
                              return;
                            }
                            handleNavigateToMemberPage(memberOption.href);
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
                    </DynamicTooltip>
                  </ul>
                </li>
              </ul>
            </div>
          )}
        </TabPanel>
        <div
          className="absolute bottom-5 right-5"
          onClick={() => setExpanded((prevExpanded) => !prevExpanded)}>
          <DynamicTooltip
            content={expanded ? 'メニューバーを縮小' : 'メニューバーを拡大'}
            placement="right">
            <div className="shadow-lg bg-white rounded-full w-[35px] h-[35px] flex items-center justify-center p-[8px] hover:cursor-pointer">
              <ImageRound
                src="/icons/extend-calendar.svg"
                name="Extend calendar"
                className={`!w-3.5 !h-3.5 min-w-2 ${expanded ? 'rotate-180' : ''}`}
              />
            </div>
          </DynamicTooltip>
        </div>
      </Tabs>

      {showWarningChatUploadingModal && pendingPageChange && (
        <ChatWarningUploadingFilesModal
          open={showWarningChatUploadingModal}
          onClose={() => {
            setShowWarningChatUploadingModal(false);
          }}
          onConfirm={() => {
            setShowWarningChatUploadingModal(false);
            cancelUploadChatFiles();
            if (pendingNavigationType == PendingNavigationType.MY_DOCK) {
              handleNavigateToMyDockPage(pendingPageChange);
            } else if (
              pendingNavigationType == PendingNavigationType.TEAM_DOCK
            ) {
              handleNavigateToTeamDockPage(pendingPageChange);
            } else if (pendingNavigationType == PendingNavigationType.MEMBER) {
              handleNavigateToMemberPage(pendingPageChange);
            }
          }}
        />
      )}
    </aside>
  );
};

export default Sidebar;
