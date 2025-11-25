'use client';
import { Fragment, useContext, useEffect, useState } from 'react';
import { useMutation } from 'react-query';
import { AxiosError } from 'axios';
import Link from 'next/link';

import { Table, TableBody, TableHeader } from '@components/common/Table';
import Dropdown from '@components/common/Dropdown';
import ImageRound from '@components/common/ImageRound';
import Pagination from '@components/common/Pagination';
import InputSearch from '@components/common/InputSearch';
import ConfirmRestoreModal from '@components/modals/ConfirmRestoreModal';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';

import { apiRouters, pageRouters } from '@constants/routers';
import { NO_DATA_AVAILABLE, PAGE_SIZE_OPTIONS } from '@constants';
import {
  ERROR_RESTORE_MESSAGE,
  SUCCESS_RESTORE_MESSAGE,
} from '@constants/message';

import useUserList from '@hooks/useUserList';
import { useErrorToast } from '@hooks/useErrorToast';
import useDebounceText from '@hooks/useDebounceText';
import useCreationDataCommon from '@hooks/common/useCreationDataCommon';

import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';

import { OptionDropdownType } from '@interfaces/common';
import {
  User,
} from '@interfaces/user';

import api from '@base/api';

const ListUsersDelete = () => {
  const { setIsLoading } = useContext(LoadingContext);

  const showErrorToast = useErrorToast();

  const { showToast } = useToast();

  // State
  const [dataUsers, setDataUsers] = useState<User[]>([]);
  const [roleUserOptions, setRoleUserOptions] = useState<OptionDropdownType[]>(
    [],
  );
  const [pageSize, setPageSize] = useState<number>(10);
  const [search, setSearch] = useState<string>('');

  const [organizationUserOptions, setOrganizationUserOptions] = useState<
    OptionDropdownType[]
  >([]);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [originalUserCount, setOriginalUserCount] = useState<number>(0);

  // Set ID user for Restore
  const [selectedUserToRestore, setSelectedUserToRestore] =
    useState<User | null>(null);
  const [openConfirmRestoreModal, setOpenConfirmRestoreModal] = useState(false);

  // Params
  const debouncedSearch = useDebounceText(search, 1000);

  const [debouncedParams, setDebouncedParams] = useState({
    search: '',
    companyName: '',
    organizationId: '',
    role: '',
    page: 1,
  });

  useEffect(() => {
    document.body.style.backgroundColor = '#F3F3F3';
    return () => {
      document.body.style.backgroundColor = '';
    };
  }, []);

  useEffect(() => {
    setDebouncedParams((prev) => ({
      ...prev,
      search: debouncedSearch,
      page: 1,
    }));
  }, [debouncedSearch]);

  const { refetchCreationDataCommon } = useCreationDataCommon({
    options: {
      get_roles: true,
      get_all_organizations: true,
      get_company: true,
    },
    onSuccess: (data) => {
      setRoleUserOptions([
        {
          label: '選択',
          value: '',
        },
        ...(data.roles?.map((org) => ({
          label: org.name,
          value: org.id,
        })) || []),
      ]);
      setOrganizationUserOptions([
        {
          label: '選択',
          value: '',
        },
        ...(data.allOrganizations?.map((item) => ({
          label: item.name,
          value: Number(item.id),
        })) || []),
      ]);
    },
  });

  const { userList, refetchUserList } = useUserList({
    pagination: {
      page: debouncedParams.page,
      pageSize,
    },
    filter: {
      fullName: debouncedParams.search,
      companyName: debouncedParams.companyName,
      organizationId: debouncedParams.organizationId,
      role: debouncedParams.role,
      is_deleted: 'true',
    },
    onSuccess: (data) => {
      setOriginalUserCount(data.count);
      setDataUsers(data.results);
      setTotalPages(data.numPages);
    },
  });

  // Restore user
  const handleOpenRestoreUserModal = (user: User) => {
    setOpenConfirmRestoreModal(true);
    setSelectedUserToRestore(user);
  };

  const handleConfirmRestoreUser = () => {
    if (selectedUserToRestore) {
      setIsLoading(true);
      restoreUser(selectedUserToRestore.id);
      return;
    }
  };

  const postRestoreUser = async (id: number) => {
    const { data: response } = await api.post(apiRouters.USER_RESTORE(`${id}`));
    return response;
  };

  const { mutate: restoreUser } = useMutation(postRestoreUser, {
    onSuccess: async () => {
      showToast({
        description: SUCCESS_RESTORE_MESSAGE,
      });
      if (userList?.results.length === 1 && debouncedParams.page > 1) {
        // If change current page, useUserList auto recall, just don't need using refetchUserList
        setDebouncedParams((prev) => ({
          ...prev,
          page: debouncedParams.page - 1,
        }));
      } else {
        refetchUserList();
      }
      refetchCreationDataCommon();
      setOpenConfirmRestoreModal(false);
      setOriginalUserCount(originalUserCount - 1);
    },
    onError: (error: AxiosError<any>) => {
      showErrorToast(error, ERROR_RESTORE_MESSAGE);
      setOpenConfirmRestoreModal(false);
      setIsLoading(false);
    },
  });

  return (
    <Fragment>
      <div>
        <div className="font-medium text-sm text-[#77858F] flex items-center gap-5  justify-between">
          <div className=" flex items-center  gap-5">
            <p className="text-black text-[26px]">ユーザー管理</p>
            <div className="text-xs flex items-center gap-1">
              <ImageRound
                name="Hide"
                src={'/icons/dark-close-eye.svg'}
                className={`w-[16px] h-[13px] opacity-80`}
              />
              <span className="text-[#77858F] text-xs font-medium">非表示一覧</span>
            </div>
          </div>
          <Link
            href={pageRouters.USERS_MANAGEMENT.href}
            className="flex items-center hover:cursor-pointer">
            <p className="ml-1 text-[#77858F] font-medium text-xs">
              表示中一覧
            </p>
            <div className="ml-[6px] flex justify-between p-[3px] rounded-full bg-white border-b">
              <ImageRound
                name="Filter extend icon"
                src={'/icons/arrow-down.svg'}
                className={`w-4 h-4 hover:cursor-pointer -rotate-90`}
              />
            </div>
          </Link>
        </div>
        <div className="mt-[30px] flex justify-between">
          <div className=" flex gap-3 items-center">
            <div className="h-[34px] w-fit ">
              <InputSearch
                className="w-[300px] h-[34px] py-0 bg-white !rounded-[20px]"
                inputClassName="h-[34px] bg-white border-none !rounded-[20px] text-sm"
                iconClassName="w-[14px] h-[14px]"
                placeholder="名前を検索"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                }}
              />
            </div>
            <div className="flex gap-[10px] items-center">
              <ImageRound
                src="/icons/filter.svg"
                name="Filter icon"
                className="w-[14px] h-[14px] ml-2"
              />

              {/* Search team */}
              <div className="w-[220px]">
                <Dropdown
                  options={organizationUserOptions}
                  placeholder="チーム"
                  placeholderClass="!text-black text-sm font-normal"
                  className="!h-[34px] !rounded-md !border text-sm font-normal !py-0 !border-[#77858F]"
                  labelTextClass="!text-[#77858F] !text-xs !font-medium"
                  classNameOption="!text-sm"
                  onChange={(data) => {
                    setDebouncedParams((prev) => ({
                      ...prev,
                      page: 1,
                      organizationId: data.value as string,
                    }));
                  }}
                />
              </div>
            </div>
            {/* Search role */}
            <div className="w-[220px]">
              <Dropdown
                options={roleUserOptions}
                placeholder="権限"
                placeholderClass="!text-black text-sm font-normal"
                className="!h-[34px] !rounded-md !border text-sm font-normal !py-0 !border-[#77858F]"
                labelTextClass="!text-[#77858F] !text-xs !font-medium"
                classNameOption="!text-sm"
                selectedOption={undefined}
                onChange={(data) => {
                  setDebouncedParams((prev) => ({
                    ...prev,
                    page: 1,
                    role: data.value as string,
                  }));
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          boxShadow: '0px 4px 10px 0px #0000000D',
        }}
        className="w-full relative p-[30px] mt-[30px] bg-[#F8FAFC] rounded-[30px]">
        <Table
          classCustom="!px-0 !py-0"
          className="bg-white text-xs font-medium !text-[#77858F] !rounded-[10px] relative !py-0 !px-0">
          <TableHeader classCustom=" [&>th]:text-xs [&>th]:border-r [&>th]:border-b [&>th]:border-[#D2DBE1] [&>th:last-child]:border-r-0">
            <th className="w-[220px] !text-[#77858F] text-left">
              <span>名前</span>
            </th>
            <th className="w-[88px] !text-[#77858F] text-left">
              <span>ID</span>
            </th>
            <th className="text-left !text-[#77858F] w-[228px] max-w-[228px]">
              <span>メインチーム</span>
            </th>
            <th className="text-left !text-[#77858F] w-[328px] max-w-[328px]">
              <span>サブチーム</span>
            </th>
            <th className="text-left !text-[#77858F] w-[232px] max-w-[232px]">
              <span>権限</span>
            </th>
          </TableHeader>
          <TableBody className=" [&>tr>td]:pr-[14px] [&>tr>td]:pl-[18px] [&>tr>td]:border-r [&>tr>td]:border-gray-300 [&>tr>td:last-child]:border-r-0">
            {dataUsers && dataUsers.length ? (
              dataUsers.map((element, index) => (
                <tr key={index} className="text-sm text-black font-medium">
                  <td className="w-[220px]">
                    <div className=" flex items-start gap-2">
                      <div className="flex items-start flex-grow gap-[6px]">
                        <div className="w-[27px] h-[27px]">
                          <CustomUserAvatar
                            avatarUrl={element?.avatar || ''}
                            avatarColor={element?.avatarColor || ''}
                            size={27}
                            customClassName="relative top-[3px]"
                          />
                        </div>
                        <p className="text-[16px] text-black break-all text-left w-0 min-w-0 flex-grow relative top-[5px]">
                          {element.profile.fullName}
                        </p>
                      </div>
                      <div className="w-fit pt-2">
                        {element.actions && element.actions.delete && (
                          <ImageRound
                            name="Hide"
                            onClick={() => handleOpenRestoreUserModal(element)}
                            src={'/icons/dark-close-eye.svg'}
                            className={`w-[16px] h-[13px] hover:cursor-pointer`}
                          />
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="w-[88px] break-all text-left align-top !pt-4">
                    {element.id}
                  </td>
                  <td className="text-left w-[228px] max-w-[228px] break-all align-top !pt-4">
                    {element.organizations &&
                      element.organizations
                        .filter((data) => data.isMain)
                        .map((item) => item.name)
                        .join(' ／ ')}
                  </td>
                  <td className="text-left w-[328px] max-w-[328px] break-all align-top !pt-4">
                    {element.organizations &&
                      element.organizations
                        .filter((data) => !data.isMain)
                        .map((item) => item.name)
                        .join(' ／ ')}
                  </td>
                  <td className="w-[232px] max-w-[232px] text-left break-all align-top !pt-4">
                    {element.roles.map((item) => item.name).join(' ／ ')}
                  </td>
                </tr>
              ))
            ) : (
              <tr className="py-5 text-center text-sm leading-6">
                <td className="h-16 !border-r-0" />
                <td className="absolute whitespace-nowrap top-[54px] left-1/2 transform -translate-x-1/2  py-5 text-center">
                  {NO_DATA_AVAILABLE}
                </td>
              </tr>
            )}
          </TableBody>
        </Table>
        <div className="flex justify-center items-center w-full mt-3">
          <div className="flex justify-center flex-1">
            {dataUsers && dataUsers.length ? (
              <Pagination
                onChange={(pageNumber) => {
                  setDebouncedParams((prev) => ({
                    ...prev,
                    page: pageNumber,
                  }));
                }}
                currentPage={debouncedParams.page}
                totalPages={totalPages}
              />
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-[66px]">
              <Dropdown
                options={PAGE_SIZE_OPTIONS}
                selectedOption={PAGE_SIZE_OPTIONS.find(
                  (element) => element.value == pageSize,
                )}
                className="h-[34px] !w-full !border-[#77858F] border-[1px] rounded-[6px] text-xs !py-1 !pr-0 !shadow-none"
                classNameTextData="!text-xs"
                classActive="!text-sm"
                classNameOption="!text-sm !border-[#77858F] !ring-[#77858F] !ring-opacity-100 !bottom-full !mb-1"
                labelOptionClass="!text-sm font-medium !pl-1.5"
                onChange={(e) => {
                  setPageSize(Number(e.value));
                  setDebouncedParams((prev) => ({
                    ...prev,
                    page: 1,
                  }));
                }}
              />
            </div>
            <p className="text-sm">人ずつ表示</p>
          </div>
        </div>
      </div>

      <ConfirmRestoreModal
        open={openConfirmRestoreModal}
        type="ユーザー"
        name={selectedUserToRestore?.profile.fullName}
        userColor={selectedUserToRestore?.avatarColor}
        userAvatarUrl={selectedUserToRestore?.avatar}
        onConfirm={handleConfirmRestoreUser}
        onClose={() => setOpenConfirmRestoreModal(false)}
      />
    </Fragment>
  );
};

export default ListUsersDelete;
