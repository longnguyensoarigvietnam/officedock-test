'use client';
import { Fragment, useContext, useEffect, useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { AxiosError } from 'axios';

import { Table, TableBody, TableHeader } from '@components/common/Table';
import ImageRound from '@components/common/ImageRound';
import Pagination from '@components/common/Pagination';
import GroupIconWithDynamicColor from '@components/common/GroupIcon';
import ErrorUploadFileValidationModal from '@components/modals/ErrorUploadFileValidationModal';
import CustomUserAvatar from '@components/common/AvatarIcon/CustomUserAvatar';
import Dropdown from '@components/common/Dropdown';
import ConfirmRestoreModal from '@components/modals/ConfirmRestoreModal';
import InputSearch from '@components/common/InputSearch';

import { NO_DATA_AVAILABLE, PAGE_SIZE_OPTIONS } from '@constants';
import { apiRouters } from '@constants/routers';
import {
  ERROR_RESTORE_MESSAGE,
  SUCCESS_RESTORE_MESSAGE,
  UPLOAD_AVATAR_FILE_MAXIMUM_SIZE,
} from '@constants/message';
import { PermissionsSystem } from '@constants/enums';

import { Organizations } from '@interfaces/organization';

import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';
import { useSessionCache } from '@providers/SessionCacheProvider';

import { hasPermissionInArray } from '@utils';

import useOrganizationList from '@hooks/useOrganizationList';
import { useErrorToast } from '@hooks/useErrorToast';
import useDebounceText from '@hooks/useDebounceText';

import api from '@base/api';

const HiddenListOrganizations = () => {
  const { data: session } = useSessionCache();
  const queryClient = useQueryClient();

  const { setIsLoading } = useContext(LoadingContext);
  const showErrorToast = useErrorToast();
  const [selectedOrganizationToRestore, setSelectedOrganizationToRestore] =
    useState<Organizations | null>(null);

  const { showToast } = useToast();

  const [dataOrganizations, setDataOrganizations] = useState<Organizations[]>(
    [],
  );
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);

  const [openConfirmRestoreModal, setOpenConfirmRestoreModal] = useState(false);
  const [openErrorUploadFileModal, setOpenErrorUploadFileModal] =
    useState(false);

  const [searchOrganizationName, setSearchOrganizationName] = useState('');
  const debouncedFilterByOrganizationName = useDebounceText(
    searchOrganizationName,
    1000,
  );
  const [debouncedParams, setDebouncedParams] = useState({
    search: '',
    page: 1,
  });

  useEffect(() => {
    setDebouncedParams((prev) => ({
      ...prev,
      search: debouncedFilterByOrganizationName,
      page: 1,
    }));
  }, [debouncedFilterByOrganizationName]);

  const { organizationList, refetchOrganizationList } = useOrganizationList(
    { page: debouncedParams.page, pageSize },
    { name: debouncedParams.search, isHidden: true },
  );

  useEffect(() => {
    document.body.style.backgroundColor = '#F3F3F3';
    return () => {
      document.body.style.backgroundColor = '';
    };
  }, []);

  useEffect(() => {
    if (organizationList) {
      setDataOrganizations(organizationList.results);
      setTotalPages(organizationList.numPages);
    }
  }, [organizationList]);

  // Restore organization
  const handleOpenRestoreOrganizationModal = (org: Organizations) => {
    setOpenConfirmRestoreModal(true);
    setSelectedOrganizationToRestore(org);
  };

  const handleConfirmRestoreOrganization = () => {
    if (selectedOrganizationToRestore) {
      setIsLoading(true);
      restoreOrganization(String(selectedOrganizationToRestore.uuid));
      return;
    }
  };

  const postRestoreOrganization = async (uuid: string) => {
    const { data: response } = await api.post(
      apiRouters.ORGANIZATION_RESTORE(uuid),
    );
    return response;
  };

  const { mutate: restoreOrganization } = useMutation(postRestoreOrganization, {
    onSuccess: async () => {
      showToast({
        description: SUCCESS_RESTORE_MESSAGE,
      });
      if (dataOrganizations.length === 1 && debouncedParams.page > 1) {
        // If change current page, useOrganizationList auto recall, just don't need using refetchOrganizationList
        setDebouncedParams((prev) => ({
          ...prev,
          page: debouncedParams.page - 1,
        }));
      } else {
        refetchOrganizationList();
      }
      setOpenConfirmRestoreModal(false);
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'getTeamList',
      });
    },
    onError: (error: AxiosError<any>) => {
      showErrorToast(error, ERROR_RESTORE_MESSAGE);
      setOpenConfirmRestoreModal(false);
      setIsLoading(false);
    },
    onSettled: () => {
      setSelectedOrganizationToRestore(null);
    },
  });

  return (
    <Fragment>
      <div className="flex justify-between mb-[30px]">
        <InputSearch
          placeholder="チームを検索"
          inputClassName="!w-[300px] !py-2 !rounded-[30px] text-sm !bg-[#FFF] border-none !placeholder-[#77858F99]"
          iconClassName="w-[14px] h-[14px]"
          onChange={(e) => {
            setSearchOrganizationName(e.target.value);
          }}
        />
      </div>
      <div
        className="w-full p-[30px] bg-[#FFFFFF] rounded-[30px]"
        style={{ boxShadow: '0px 4px 10px 0px #0000000D' }}>
        <Table className="bg-white !rounded-[10px] relative table-fixed">
          <TableHeader className="!bg-[#F3F3F3]">
            <th className="text-left w-[calc(100%_-_40px)]">
              <span className="text-[#77858F] text-[12px] font-medium">
                チーム名
              </span>
            </th>
            <th className="text-left w-[40px] min-w-[40px]"></th>
          </TableHeader>
          <TableBody>
            {dataOrganizations && dataOrganizations.length ? (
              dataOrganizations.map((element, index) => (
                <tr key={index} className="text-black">
                  <td
                    className={`text-left w-[calc(100%_-_40px)] max-w-[calc(100%_-_40px)] !px-[18px] !py-[13px]`}>
                    <div className="flex items-center gap-[6px]">
                      {element.icon ? (
                        <CustomUserAvatar
                          avatarUrl={element.icon || ''}
                          avatarColor={''}
                          size={24}
                        />
                      ) : (
                        <GroupIconWithDynamicColor
                          color={element.iconColor || '#228CDB'}
                          size={24}
                        />
                      )}{' '}
                      <p className="break-all w-[calc(100%_-_40px)] text-[16px] font-medium text-[#000000] leading-none">
                        {element.name}
                      </p>
                    </div>
                  </td>
                  <td>
                    <div className="flex w-[40px] justify-center">
                      {session?.user.permissions &&
                      hasPermissionInArray(
                        session?.user.permissions,
                        PermissionsSystem.ORGANIZATION_DELETE,
                      ) ? (
                        <ImageRound
                          name="Hide"
                          src={'/icons/dark-close-eye.svg'}
                          className={`w-[16px] h-[13px] cursor-pointer hide-icon`}
                          onClick={() =>
                            handleOpenRestoreOrganizationModal(element)
                          }
                        />
                      ) : (
                        <div className="w-[16px]"></div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr className="py-5 text-center text-sm leading-6">
                <td className="h-16" />
                <td className="absolute whitespace-nowrap top-[54px] left-1/2 transform -translate-x-1/2  py-5 text-center">
                  {NO_DATA_AVAILABLE}
                </td>
              </tr>
            )}
          </TableBody>
        </Table>
        <div className="flex justify-center items-center w-full mt-3">
          <div className="flex justify-center flex-1">
            {dataOrganizations && dataOrganizations.length ? (
              <Pagination
                onChange={(pageNumber) =>
                  setDebouncedParams((prev) => ({
                    ...prev,
                    page: pageNumber,
                  }))
                }
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
            <p className="text-sm">件ずつ表示</p>
          </div>
        </div>
      </div>

      {openConfirmRestoreModal && (
        <ConfirmRestoreModal
          open={openConfirmRestoreModal}
          message="このチームを復元しますか？"
          name={selectedOrganizationToRestore?.name}
          userColor={selectedOrganizationToRestore?.iconColor}
          userAvatarUrl={selectedOrganizationToRestore?.icon || ''}
          onConfirm={handleConfirmRestoreOrganization}
          onClose={() => setOpenConfirmRestoreModal(false)}
        />
      )}

      {openErrorUploadFileModal && (
        <ErrorUploadFileValidationModal
          open={true}
          message={UPLOAD_AVATAR_FILE_MAXIMUM_SIZE}
          onClose={() => {
            setOpenErrorUploadFileModal(false);
          }}
        />
      )}
    </Fragment>
  );
};

export default HiddenListOrganizations;
