'use client';
import { Fragment, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from '@headlessui/react';
import { signOut, useSession } from 'next-auth/react';
import lodash from 'lodash';

import ImageRound from '@components/common/ImageRound';

import { MENU_ITEMS, SETTING_MENU_ITEMS } from '@constants/menu';
import { MenuItem } from '@interfaces/menu';

type Props = {
  className?: string;
};

const updateCurrent = (menuItems: MenuItem[], pathname: string): MenuItem[] => {
  return menuItems.map((item) => {
    const updatedItem = { ...item };

    if (updatedItem.href && pathname.startsWith(updatedItem.href)) {
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
  const pathname = usePathname();
  const { data: session } = useSession();

  const menuItems = useMemo(() => {
    const menuItemsClone: MenuItem[] = lodash.cloneDeep(MENU_ITEMS);
    return updateCurrent(menuItemsClone, pathname);
  }, [pathname]);

  return (
    <aside
      className={`w-72 flex flex-col gap-6 bg-white shadow-common rounded-lg p-4 pt-6 ${className}`}>
      <div className="flex shrink-0 items-center">
        <ImageRound
          className="h-20 w-60 object-fill"
          src="/images/logo-full.svg"
          name="Logo full"
        />
      </div>
      <nav className="flex flex-1 mt-12 w-60">
        <ul role="list" className="flex flex-1 flex-col gap-y-6 list-none">
          <li className="flex-1 overflow-y-auto">
            <ul role="list" className="list-none">
              {menuItems.map((item) => (
                <li key={item.name} className="border-b border-gray-100">
                  {!item.children ? (
                    <Link
                      href={item.href}
                      className={`group flex items-center gap-4 py-4 px-3 leading-6 ${item.current ? 'font-medium text-primary' : 'hover:bg-gray-50'}`}>
                      {item.iconUrl && (
                        <ImageRound
                          className="w-4 h-4"
                          src={item.iconUrl(item.current)}
                          name={`Icon ${item.name} menu`}
                        />
                      )}
                      <p className="flex-1 text-left text-sm"> {item.name}</p>
                    </Link>
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
              ))}
            </ul>
          </li>
          <li className="flex flex-col gap-3">
            <div className="flex items-center gap-x-4 px-2 py-1">
              <ImageRound
                className="w-10 h-10"
                src="/images/avatar-default.svg"
                border="full"
                name="Avatar user"
              />
              <span className="truncate max-w-[150px]" aria-hidden="true">
                {session?.user.email}
              </span>
            </div>
            <Popover className="relative">
              {({ open }) => (
                <>
                  <PopoverButton
                    className={`flex w-full px-3 py-2 items-center rounded-md focus:outline-none 
                ${open ? 'text-primary bg-gray-50' : 'hover:bg-gray-50'}
                `}>
                    <ImageRound
                      className={`w-4 h-4`}
                      src={`/icons/setting${open ? '-active' : ''}.svg`}
                      name="Setting icon"
                    />
                    <p className="ml-2 flex-1 text-left">設定</p>
                    <ImageRound
                      className={`w-4 h-4 ${open ? 'rotate-180' : ''}`}
                      src={`/icons/arrow-down${open ? '-active' : ''}.svg`}
                      name="Arrow menu icon"
                    />
                  </PopoverButton>
                  <Transition
                    as={Fragment}
                    enter="transition ease-out duration-200"
                    enterFrom="opacity-0 translate-y-1"
                    enterTo="opacity-100 translate-y-0"
                    leave="transition ease-in duration-150"
                    leaveFrom="opacity-100 translate-y-0"
                    leaveTo="opacity-0 translate-y-1">
                    <PopoverPanel className="absolute bottom-10 right-0 z-10 w-fit transform">
                      <div className="overflow-hidden rounded-lg shadow-common p-1">
                        <div className="relative flex flex-col w-40 gap-1 bg-white text-gray-700">
                          {SETTING_MENU_ITEMS.map((item) =>
                            item.href ? (
                              <Link
                                key={item.name}
                                href={item.href}
                                className="flex rounded-md  px-3 py-2 hover:bg-gray-50">
                                <p>{item.name}</p>
                              </Link>
                            ) : (
                              <div
                                key={item.name}
                                onClick={() => signOut()}
                                className="flex items-center rounded-md justify-between px-3 py-2 hover:bg-gray-50 hover:cursor-pointer">
                                <p>{item.name}</p>
                                {item.iconUrl ? (
                                  <ImageRound
                                    className={`w-4 h-4`}
                                    src={item.iconUrl}
                                    name="Logout"
                                  />
                                ) : null}
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    </PopoverPanel>
                  </Transition>
                </>
              )}
            </Popover>
          </li>
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
