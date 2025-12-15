'use client';
import { useEffect, useMemo } from 'react';

import { SubmitHandler, useForm } from 'react-hook-form';

import MultiSelectDropdown from '@components/common/MultiSelectDropdown';
import Button from '@components/common/Button';
import Input from '@components/common/Input';
import ImageRound from '@components/common/ImageRound';
import Drawer from '@components/common/Drawers';
import Checkbox from '@components/common/Checkbox';

import { OptionDropdownType } from '@interfaces/common';
import { Tags, TagFormData } from '@interfaces/tag';

import { useSessionCache } from '@providers/SessionCacheProvider';

import { ActionsEvent, ActionTask, PermissionsSystem } from '@constants/enums';
import { UNREGISTERED } from '@constants';
import { ERROR_LONG_FIELD_MESSAGE } from '@constants/message';

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
  action = ActionTask.CREATE,
  dataOrganizationList,
  onClose,
  onEdit,
  onDelete,
  onCreate,
}: ActionsTagModalProps) => {
  const { data: session } = useSessionCache();

  const {
    register,
    watch,
    setValue,
    getValues,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<TagFormData>({
    mode: 'onSubmit',
  });
  const defaultValues = useMemo<TagFormData>(() => {
    const value: TagFormData = {
      name: '',
      organizations: [],
      calendarOrganizationCheck: false,
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
          : []),
        (value.calendarOrganizationCheck = Boolean(
          dataTag.isCalendarOrganizationCheck,
        ));
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
      !isDirty ? onClose() : onEdit && onEdit(data as TagFormData);
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const selectedOrganizations = watch('organizations') || [];

  const selectedHiddenOrganizations = useMemo(() => {
    return selectedOrganizations?.filter(
      (selected) =>
        !dataOrganizationList.some(
          (org) => org.value === selected.value,
        ),
    );
  }, [selectedOrganizations, dataOrganizationList]);

  const mergedOptions = useMemo(() => {
    const map = new Map<number, OptionDropdownType>();

    [...dataOrganizationList, ...selectedHiddenOrganizations].forEach((opt) => {
      map.set(opt.value as number, opt);
    });

    return Array.from(map.values());
  }, [dataOrganizationList, selectedHiddenOrganizations]);

  return (
    <Drawer
      open={open}
      className="font-primary bg-white w-[700px] !px-0 !rounded-l-[30px]"
      onClose={handleCloseModal}>
      <header
        className="px-9 rounded-tl-[30px] h-[50px] flex items-center justify-between"
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
                className="mt-1 w-[14px] h-[17px] hover:cursor-pointer hidden"
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
      <form
        onSubmit={handleSubmit(onSubmitData)}
        className="px-9 pb-9 !h-screen overflow-y-auto">
        <header className="flex sticky z-[100] top-[0px] pt-10 pb-[35px] items-center gap-5 justify-between bg-white">
          <div className="w-full">
            <Input
              className="shadow-none text-[22px] leading-[56px] font-bold !pl-3 flex items-center !py-0 h-[42px] focus:!shadow-none focus:border !border-[#77858F] !border-[1px] rounded-md"
              register={register('name', {
                required: watch('name') !== null ? true : false,
                maxLength: {
                  value: 255,
                  message: ERROR_LONG_FIELD_MESSAGE,
                },
              })}
              placeholder="新規タグ"
              error={errors.name?.message}
              disabled={isDisabled || dataTag?.actions?.updateName === false}
            />
          </div>
          <div className="flex gap-[10px] items-center">
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
                  disabled={action === ActionsEvent.EDIT && !isDirty}
                  className="w-[86px] h-[36px] !text-[13px] !p-0 !border-none">
                  保存
                </Button>
              )}
            <Button
              variant="outline"
              type="button"
              onClick={onClose}
              className="w-[86px] h-[36px] !text-[13px] !p-0">
              キャンセル
            </Button>
          </div>
        </header>
        <div className="font-normal flex flex-col gap-[35px]">
          <div className="flex gap-2 items-center">
            <p className="!w-[112px] font-medium text-[14px] whitespace-nowrap">
              表示するチーム
            </p>
            <div className="w-[calc(100%_-_120px)]">
              <MultiSelectDropdown
                className="!h-[34px]"
                disabled={isDisabled}
                valueClassName="!border-[1px] !border-[#77858F]"
                options={mergedOptions}
                optionClassName="!border-[1px] !border-[#77858F]"
                labelClass="max-w-[450px] !break-all"
                labelOptionClass="w-[450px] !break-all"
                customLabel={
                  (watch('organizations') ?? [])
                    .filter((org: OptionDropdownType) => org.value)
                    .map((org: OptionDropdownType) => org.label)
                    .join('/ ') || UNREGISTERED
                }
                selectedOptions={watch('organizations') ?? []}
                onChange={(selected) => {
                  let updatedOrganizations = [];
                  const currentOrganizations = getValues('organizations') || [];
                  const foundItemIndex = currentOrganizations.findIndex(
                    (org: OptionDropdownType) => org.value == selected.value,
                  );
                  if (foundItemIndex == -1) {
                    updatedOrganizations = [...currentOrganizations, selected];
                  } else {
                    updatedOrganizations = currentOrganizations.filter(
                      (org: OptionDropdownType) => org.value != selected.value,
                    );
                  }
                  setValue('organizations', updatedOrganizations, {
                    shouldDirty: true,
                  });
                }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <p className="!w-[112px] font-medium text-[14px] whitespace-nowrap">
              カレンダーで使用
            </p>
            <Checkbox
              label=""
              className="!w-4"
              isChecked={watch('calendarOrganizationCheck')}
              onChange={(state) => {
                setValue('calendarOrganizationCheck', state, {
                  shouldDirty: true,
                });
              }}
            />
          </div>
        </div>

        <div className="flex justify-center mt-[50px]">
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
                style={{ boxShadow: '0px 1px 5px 0px #00000033' }}
                disabled={action === ActionsEvent.EDIT && !isDirty}
                className="w-[200px] h-[46px] !text-[14px] !font-medium !border-none">
                保存
              </Button>
            )}
        </div>
      </form>
    </Drawer>
  );
};

export default ActionsTagModal;
