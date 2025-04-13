'use client';
import { useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { SubmitHandler, useForm } from 'react-hook-form';

import MultiSelectDropdown from '@components/common/MultiSelectDropdown';
import Button from '@components/common/Button';
import Input from '@components/common/Input';
import ImageRound from '@components/common/ImageRound';
import Drawer from '@components/common/Drawers';

import { OptionDropdownType } from '@interfaces/common';
import { Tags, TagFormData } from '@interfaces/tag';

import { ActionsEvent, PermissionsSystem } from '@constants/enums';
import { UNREGISTERED } from '@constants';

import { formatShowDateJapanese } from '@utils/date';
import {
  hasPermissionInArray,
  showModalHeaderBackgroundColorByTime,
} from '@utils';

export type ActionsTagModalProps = {
  open: boolean;
  dataTag?: Tags | null;
  action?: string | null;
  dataOrganizationList: OptionDropdownType[];
  onDelete?: (values: Tags) => void;
  onClose: () => void;
  onCreate?: (values: TagFormData) => void;
  onEdit?: (values: TagFormData) => void;
};

const ActionsTagModal = ({
  open,
  dataTag,
  action = 'CREATE',
  dataOrganizationList,
  onClose,
  onEdit,
  onDelete,
  onCreate,
}: ActionsTagModalProps) => {
  const { data: session } = useSession();

  const {
    register,
    watch,
    setValue,
    getValues,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TagFormData>({
    mode: 'onSubmit',
  });

  const defaultValues = useMemo<TagFormData>(() => {
    const value: TagFormData = {
      name: '',
      organizations: [],
    };
    if (dataTag) {
      (value.name = `${dataTag.name}`),
        (value.organizations = dataTag.organizations
          ? dataTag.organizations.map((org) => {
              return {
                label: org.name,
                value: Number(org.id),
              };
            })
          : []);
    }
    return value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataTag]);

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const onSubmitData: SubmitHandler<TagFormData> = async (data) => {
    if (action === ActionsEvent.CREATE) {
      onCreate && onCreate(data as TagFormData);
    }
    if (action === ActionsEvent.EDIT) {
      onEdit && onEdit(data as TagFormData);
    }
  };

  const handleDeleteTag = () => {
    onDelete && onDelete(dataTag as Tags);
  };

  const handleCloseModal = () => {
    onClose();
  };

  const isDisabled =
    session?.user.permissions &&
    ((action === ActionsEvent.EDIT &&
      !hasPermissionInArray(
        session?.user.permissions,
        PermissionsSystem.TAG_UPDATE,
      )) ||
      (action === ActionsEvent.CREATE &&
        !hasPermissionInArray(
          session?.user.permissions,
          PermissionsSystem.TAG_ADD,
        )));

  return (
    <Drawer
      open={open}
      className="font-primary bg-white !h-screen w-[700px] !px-0 !rounded-tl-xl"
      onClose={handleCloseModal}>
      <header
        className="px-8 rounded-tl-xl h-[50px] flex items-center justify-between"
        style={{
          background: showModalHeaderBackgroundColorByTime(),
        }}>
        <div className="flex text-sm items-center gap-4 text-white">
          <p className="">
            登録日{' '}
            {action === ActionsEvent.EDIT && dataTag?.createdAt
              ? formatShowDateJapanese(dataTag.createdAt)
              : formatShowDateJapanese(new Date())}
          </p>
        </div>
        <div className="flex gap-5 items-center">
          {action === ActionsEvent.EDIT &&
            session?.user.permissions &&
            hasPermissionInArray(
              session?.user.permissions,
              PermissionsSystem.TAG_DELETE,
            ) &&
            (dataTag?.actions?.updateName === false ? (
              <></>
            ) : (
              <ImageRound
                className="mt-1 w-[14px] h-[17px] hover:cursor-pointer"
                src="/icons/delete-event.svg"
                name="Delete icon"
                onClick={handleDeleteTag}
              />
            ))}

          <ImageRound
            className="mt-1 w-3 h-[14px] hover:cursor-pointer"
            src="/icons/drawer-close-white.svg"
            name="Close icon"
            onClick={() => {
              reset();
              onClose();
            }}
          />
        </div>
      </header>
      <div className="flex flex-col h-full">
        <form
          onSubmit={handleSubmit(onSubmitData)}
          className="px-8 pb-8 h-full overflow-y-auto">
          <header className="flex sticky z-[100] top-[0px] py-5 items-center gap-2 justify-between bg-white">
            <div className="w-full">
              <Input
                autoCompleteInput
                className="shadow-none text-2xl  leading-[56px] font-bold !pl-3 flex items-center !py-0 h-[46px] focus:!shadow-none focus:border !border-[#77858F] !border-[1px] rounded-md"
                register={register('name', {
                  required: watch('name') !== null ? true : false,
                })}
                placeholder="新規タグ"
                error={errors.name?.message}
                disabled={isDisabled || dataTag?.actions?.updateName === false}
              />
            </div>
            <div className="flex gap-2 items-center">
              {session?.user.permissions &&
                ((action === ActionsEvent.EDIT &&
                  hasPermissionInArray(
                    session?.user.permissions,
                    PermissionsSystem.TAG_UPDATE,
                  )) ||
                  (action === ActionsEvent.CREATE &&
                    hasPermissionInArray(
                      session?.user.permissions,
                      PermissionsSystem.TAG_ADD,
                    ))) && (
                  <Button
                    type="submit"
                    className="w-[82px] h-[36px] !text-[12px] !px-2">
                    保存
                  </Button>
                )}
              <Button
                variant="outline"
                type="button"
                onClick={onClose}
                className="w-[82px] !rounded-md  h-[34px] !text-[12px] !px-2">
                キャンセル
              </Button>
            </div>
          </header>
          <div className="text-xs font-normal flex flex-col gap-4">
            <div className="flex gap-3 items-center">
              <p className="!w-fit font-medium text-[14px] whitespace-nowrap">
                表示するチーム
              </p>
              <div className="w-full">
                <MultiSelectDropdown
                  className="!h-[34px]"
                  disabled={isDisabled}
                  valueClassName="!border-[1px] !border-[#77858F]"
                  options={dataOrganizationList}
                  optionClassName="!border-[1px] !border-[#77858F]"
                  labelClass="max-w-[460px]"
                  labelOptionClass="w-[460px]"
                  customLabel={
                    (watch('organizations') ?? [])
                      .filter((org: OptionDropdownType) => org.value)
                      .map((org: OptionDropdownType) => org.label)
                      .join('/ ') || UNREGISTERED
                  }
                  selectedOptions={watch('organizations') ?? []}
                  onChange={(selected) => {
                    let updatedOrganizations = [];
                    const currentOrganizations =
                      getValues('organizations') || [];
                    const foundItemIndex = currentOrganizations.findIndex(
                      (org: OptionDropdownType) => org.value == selected.value,
                    );
                    if (foundItemIndex == -1) {
                      updatedOrganizations = [
                        ...currentOrganizations,
                        selected,
                      ];
                    } else {
                      updatedOrganizations = currentOrganizations.filter(
                        (org: OptionDropdownType) =>
                          org.value != selected.value,
                      );
                    }
                    setValue('organizations', updatedOrganizations);
                  }}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-center mt-8">
            {session?.user.permissions &&
              ((action === ActionsEvent.EDIT &&
                hasPermissionInArray(
                  session?.user.permissions,
                  PermissionsSystem.TAG_UPDATE,
                )) ||
                (action === ActionsEvent.CREATE &&
                  hasPermissionInArray(
                    session?.user.permissions,
                    PermissionsSystem.TAG_ADD,
                  ))) && (
                <Button
                  type="submit"
                  className="w-[200px] h-[46px] !text-[15px]">
                  保存
                </Button>
              )}
          </div>
        </form>
      </div>
    </Drawer>
  );
};

export default ActionsTagModal;
