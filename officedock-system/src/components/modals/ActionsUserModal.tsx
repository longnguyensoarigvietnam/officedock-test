'use client';
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Controller,
  SubmitHandler,
  useFieldArray,
  useForm,
} from 'react-hook-form';

import Button from '@components/common/Button';
import Input from '@components/common/Input';
import ImageRound from '@components/common/ImageRound';
import Drawer from '@components/common/Drawers';
import Checkbox from '@components/common/Checkbox';
import Dropdown from '@components/common/Dropdown';
import ErrorMessage from '@components/common/ErrorMessage';
import RadioButton from '@components/common/RadioButton';

import { useSessionCache } from '@providers/SessionCacheProvider';

import { OptionDropdownType } from '@interfaces/common';
import { CreateUserFormData, User } from '@interfaces/user';

import {
  ActionsEvent,
  ActionTask,
  CreateUserType,
  OrganizationType,
  PermissionsSystem,
} from '@constants/enums';
import {
  ERROR_LONG_FIELD_MESSAGE,
  ID_REQUIRED_MESSAGE,
  NAME_REQUIRED_MESSAGE,
  ROLE_REQUIRED_MESSAGE,
} from '@constants/message';

import {
  hasPermissionInArray,
  showModalHeaderBackgroundColorByTime,
} from '@utils';
import { emailRules, passwordRegisterRules } from '@utils/validators';
import { formatShowDateJapanese } from '@utils/date';

export type ActionsUserModalProps = {
  open: boolean;
  dataUserDetail?: User | null;
  action?: string | null;
  originalOrganizationOptions: OptionDropdownType[];
  roleUserOptions: OptionDropdownType[];
  errorMessages: {
    email?: string;
    username?: string;
    password?: string;
    fullName?: string;
  };
  resetOrganizationFields: boolean;
  resetRoleField: boolean;
  setResetOrganizationFields: Dispatch<SetStateAction<boolean>>;
  setResetRoleField: Dispatch<SetStateAction<boolean>>;
  setErrorMessages: Dispatch<
    SetStateAction<{
      email?: string;
      username?: string;
      password?: string;
      fullName?: string;
    }>
  >;
  onDelete?: (userToDelete: User) => void;
  onClose: () => void;
  onCreate?: (values: CreateUserFormData, isOptionEmail: boolean) => void;
  onEdit?: (values: CreateUserFormData, isOptionEmail: boolean) => void;
};

const ActionsUserModal = ({
  open,
  dataUserDetail,
  action = ActionTask.CREATE,
  roleUserOptions,
  originalOrganizationOptions,
  errorMessages,
  resetOrganizationFields,
  resetRoleField,
  setResetOrganizationFields,
  setResetRoleField,
  setErrorMessages,
  onClose,
  onDelete,
  onCreate,
  onEdit,
}: ActionsUserModalProps) => {
  const { data: session } = useSessionCache();

  const [isOptionEmail, setOptionEmail] = useState<boolean>(true);

  const [selectedOrganizationOptions, setSelectedOrganizationOptions] =
    useState<OptionDropdownType[]>([]);
  const [unSelectedOrganizationOptions, setUnSelectedOrganizationOptions] =
    useState<OptionDropdownType[]>([]);

  // Role
  const [selectedRoleOptions, setSelectedRoleOptions] = useState<
    OptionDropdownType[]
  >([]);
  const [unSelectedRoleOptions, setUnSelectedRoleOptions] = useState<
    OptionDropdownType[]
  >([]);

  const {
    register,
    control,
    reset,
    watch,
    clearErrors,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors, isDirty },
  } = useForm<CreateUserFormData>({
    mode: 'onSubmit',
    defaultValues: {
      roles: [{ label: '', value: '' }],
      organizations: [{ label: '', value: '' }],
      isTwoFactorAuth: true,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'organizations',
  });

  const {
    fields: fieldsRole,
    append: appendRole,
    remove: removeRole,
  } = useFieldArray({
    control,
    name: 'roles',
    rules: {
      validate: (value) => {
        if (!value || !value.some((item) => String(item.value).trim() !== '')) {
          return ROLE_REQUIRED_MESSAGE;
        }
        return true;
      },
    },
  });

  useEffect(() => {
    if (originalOrganizationOptions) {
      if (dataUserDetail?.organizations) {
        const mainOrganization = dataUserDetail.organizations.find(
          (org) => org.isMain,
        );
        const subOrganizations = dataUserDetail.organizations.filter(
          (org) => !org.isMain,
        );

        const sortedOrganization = [
          ...(mainOrganization
            ? [
                {
                  label: mainOrganization.name,
                  value: Number(mainOrganization.id),
                  type: OrganizationType.MAIN,
                },
              ]
            : [{ label: '', value: '', type: OrganizationType.MAIN }]),
          ...subOrganizations.map((org) => {
            return {
              label: org.name,
              value: Number(org.id),
              type: OrganizationType.SUB,
            };
          }),
        ];
        setSelectedOrganizationOptions(sortedOrganization);
      }
      if (dataUserDetail?.roles) {
        setSelectedRoleOptions(
          dataUserDetail.roles.map((org) => ({
            label: org.name,
            value: org.id,
          })),
        );
      }
    }
  }, [
    originalOrganizationOptions,
    dataUserDetail?.organizations,
    dataUserDetail?.roles,
  ]);

  useEffect(() => {
    append({ label: '', value: '' });
  }, [append]);

  const defaultValues = useMemo<CreateUserFormData>(() => {
    const value: CreateUserFormData = {
      name: '',
      email: '',
      organizations: [{ label: '', value: '' }],
      roles: [{ label: '', value: '' }],
      username: '',
      password: '',
      twoFactorAuthEmail: '',
      isTwoFactorAuth: true,
      twoFactorAuthEmailRequired: '',
    };

    if (dataUserDetail) {
      value.username = dataUserDetail.username;
      value.twoFactorAuthEmail = dataUserDetail.twoFactorAuthEmail;
      value.twoFactorAuthEmailRequired = dataUserDetail.twoFactorAuthEmail;
      value.roles = dataUserDetail.roles.map((element) => ({
        label: element.name,
        value: element.id,
      }));

      value.isTwoFactorAuth = dataUserDetail.isTwoFactorAuth;
      value.name = dataUserDetail.profile.fullName;
      value.email = dataUserDetail.email;
      value.organizations = dataUserDetail?.organizations
        ? dataUserDetail?.organizations
            .filter((organization) => !organization.isMain)
            .map((element) => ({
              label: element.name,
              value: Number(element.id),
              type: OrganizationType.SUB,
            }))
        : [];
      value.mainOrganization = dataUserDetail?.organizations
        ? dataUserDetail.organizations.find((element) => element.isMain)
          ? {
              label: dataUserDetail.organizations.find(
                (element) => element.isMain == true,
              )?.name as string,
              value: dataUserDetail.organizations.find(
                (element) => element.isMain == true,
              )?.id as number,
              type: OrganizationType.MAIN as string,
            }
          : { label: '', value: '', type: OrganizationType.MAIN as string }
        : { label: '', value: '', type: OrganizationType.MAIN as string };

      setOptionEmail(dataUserDetail.loginType === CreateUserType.EMAIL);
    }

    return value;
  }, [dataUserDetail]);

  useEffect(() => {
    if (resetOrganizationFields) {
      setValue('mainOrganization', defaultValues.mainOrganization);
      setValue('organizations', defaultValues.organizations);
      setResetOrganizationFields(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetOrganizationFields]);

  useEffect(() => {
    if (resetRoleField) {
      setValue('roles', defaultValues.roles);
      setResetRoleField(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetRoleField]);

  // Update default value
  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  // If have option selected or remove option selected, update option for unselected options
  useEffect(() => {
    const selectedValues = selectedOrganizationOptions
      .filter((element) => element?.value)
      .map((element) => element.value);
    const unSelectedOptions = originalOrganizationOptions.filter(
      (option) => !selectedValues.includes(option?.value),
    );
    setUnSelectedOrganizationOptions(unSelectedOptions);
  }, [originalOrganizationOptions, selectedOrganizationOptions]);

  // Function handle selected option
  const handleSelectedOrganization = useCallback(
    (index: number, option: OptionDropdownType) => {
      setSelectedOrganizationOptions((prevState) => {
        const updatedOrganizationOptions = [...prevState];
        updatedOrganizationOptions[index + 1] = option;
        return updatedOrganizationOptions;
      });
    },
    [],
  );

  const handleSelectedMainOrganization = (option: OptionDropdownType) => {
    setSelectedOrganizationOptions((prevState) => {
      const updatedOrganizationOptions = [...prevState];
      updatedOrganizationOptions[0] = option;
      return updatedOrganizationOptions;
    });
  };

  // Function handle remove selected option
  const handleRemoveSelectedOrganization = useCallback(
    (option: OptionDropdownType, index: number) => {
      setSelectedOrganizationOptions((prevState) =>
        prevState.filter((item) => item.value !== option.value),
      );
      remove(index);
    },
    [remove],
  );

  // If have option selected or remove option selected, update option for unselected options
  useEffect(() => {
    const selectedValues = selectedRoleOptions.map((element) => element.value);
    const unSelectedOptions = roleUserOptions.filter(
      (option) => !selectedValues.includes(option.value),
    );
    setUnSelectedRoleOptions(unSelectedOptions);
  }, [roleUserOptions, selectedRoleOptions]);

  // Function handle selected role
  const handleSelectedRole = useCallback(
    (index: number, option: OptionDropdownType) => {
      setSelectedRoleOptions((prevState) => {
        const existingElement = prevState?.[index];
        if (existingElement) {
          prevState.splice(index, 1);
        }
        return [...prevState, option];
      });
    },
    [],
  );
  // Function handle remove selected role
  const handleRemoveSelectedRole = useCallback(
    (option: OptionDropdownType, index: number) => {
      setSelectedRoleOptions((prevState) =>
        prevState.filter((item) => item.value !== option.value),
      );
      removeRole(index);
    },
    [removeRole],
  );

  const isTwoFA = watch('isTwoFactorAuth');

  const isTypePassword = watch('password');

  const onSubmit: SubmitHandler<CreateUserFormData> = (data) => {
    if (action === ActionsEvent.CREATE) {
      onCreate && onCreate(data as CreateUserFormData, isOptionEmail);
    }
    if (action === ActionsEvent.EDIT) {
      !isDirty
        ? onClose()
        : onEdit && onEdit(data as CreateUserFormData, isOptionEmail);
    }
  };

  const handleDeleteUser = () => {
    onDelete && onDelete(dataUserDetail!);
  };

  return (
    <Drawer
      open={open}
      className="font-primary w-[700px] !px-0 !rounded-l-[30px]"
      onClose={onClose}>
      <header
        className="px-9 rounded-tl-[30px] h-[50px] flex items-center justify-between"
        style={{
          background: showModalHeaderBackgroundColorByTime(),
        }}>
        <div className="flex text-sm items-center gap-4 text-white">
          <p className="">
            登録日{' '}
            {action === ActionsEvent.EDIT && dataUserDetail?.createdAt
              ? formatShowDateJapanese(dataUserDetail.createdAt)
              : formatShowDateJapanese(new Date())}
          </p>
        </div>
        <div className="flex gap-5 items-center">
          {action === ActionsEvent.EDIT &&
            session?.user.permissions &&
            hasPermissionInArray(
              session?.user.permissions,
              PermissionsSystem.USER_DELETE,
            ) &&
            dataUserDetail &&
            dataUserDetail.id != session.user.id && (
              <ImageRound
                className="mt-1 w-[14px] h-[17px] hover:cursor-pointer"
                src="/icons/delete-event.svg"
                name="Delete icon"
                onClick={handleDeleteUser}
              />
            )}

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
        className="w-full flex flex-col gap-4 pb-8  px-9 py-10  h-[calc(100vh_-_150px)] overflow-y-auto"
        onSubmit={handleSubmit(onSubmit)}>
        <div>
          <div className="flex items-center gap-5 bg-white">
            <div className="text-lg font-normal w-[426px]">
              <Input
                name="name"
                required
                placeholder="入力してください"
                register={register('name', {
                  required: NAME_REQUIRED_MESSAGE,
                  maxLength: {
                    value: 255,
                    message: ERROR_LONG_FIELD_MESSAGE,
                  },
                  onChange: () => {
                    setErrorMessages((prev) => {
                      return {
                        ...prev,
                        fullName: '',
                      };
                    });
                  },
                })}
                className={`h-[42px] !border-[#77858F] rounded-md !w-[426px] ${errors?.name?.message || errorMessages?.fullName ? '!border-error' : '!border-[#77858F]'}`}
              />
            </div>

            <div className="flex gap-2 items-center">
              <Button
                type="submit"
                disabled={action == ActionsEvent.EDIT && !isDirty}
                className="w-[86px] h-[34px] !text-[12px] !px-2">
                保存
              </Button>
              <Button
                variant="outline"
                type="button"
                onClick={onClose}
                className="w-[86px] !rounded-md  h-[34px] !text-[12px] !px-2">
                キャンセル
              </Button>
            </div>
          </div>
          {errorMessages?.fullName ? (
            <ErrorMessage
              error={errorMessages.fullName}
              className="mt-[5px] mb-[5px] text-xs"
            />
          ) : errors?.name ? (
            <ErrorMessage
              error={errors?.name.message}
              className="mt-[5px] mb-[5px] text-xs"
            />
          ) : (
            <></>
          )}

          {/* Options */}
          <div className="flex gap-5 mt-[38px]">
            <div
              className={`flex items-center gap-2 w-[164px] ${action == ActionsEvent.EDIT && !isOptionEmail && 'opacity-40'}`}>
              <RadioButton
                name={`create-option`}
                isChecked={isOptionEmail}
                label="メールアドレスで登録"
                classLabel="!text-black text-sm"
                disable={action == ActionsEvent.EDIT}
                onChange={() => {
                  const currentTitle = getValues('name');
                  if (action == ActionsEvent.CREATE) {
                    reset();
                    setSelectedRoleOptions([])
                    setValue('name', currentTitle);
                    setSelectedOrganizationOptions([]);
                    setOptionEmail(true);
                  }
                }}
              />
            </div>
            <div
              className={`flex items-center gap-2 w-[164px] ${action == ActionsEvent.EDIT && isOptionEmail && 'opacity-40'}`}>
              <RadioButton
                name={`create-option`}
                isChecked={!isOptionEmail}
                label="IDで登録"
                classLabel="!text-black text-sm"
                disable={action == ActionsEvent.EDIT}
                onChange={() => {
                  const currentTitle = getValues('name');

                  if (action == ActionsEvent.CREATE) {
                    reset();
                    setSelectedRoleOptions([])
                    setValue('name', currentTitle);
                    setSelectedOrganizationOptions([]);
                    setOptionEmail(false);
                  }
                }}
              />
            </div>
          </div>
          <div className=" flex flex-col gap-[35px] mt-[35px] text-sm font-medium text-black">
            {/* Change option form */}
            {!isOptionEmail && (
              <div className="flex gap-[10px]">
                <div className="w-full max-w-[110px] text-[14px] font-medium">
                  ID <span className="text-error font-bold">{`*`}</span>
                </div>
                <div className="flex flex-col w-full h-[50px]">
                  <Input
                    name="id"
                    required
                    placeholder="123456"
                    disabled={action == ActionsEvent.EDIT}
                    register={register('username', {
                      required: ID_REQUIRED_MESSAGE,
                      maxLength: {
                        value: 255,
                        message: ERROR_LONG_FIELD_MESSAGE,
                      },
                      onChange: () => {
                        setErrorMessages((prev) => {
                          return {
                            ...prev,
                            username: '',
                          };
                        });
                      },
                    })}
                    className={`h-[34px] !border-[#77858F] !w-full text-sm rounded-md !py-0 ${errors?.username?.message || errorMessages.username ? '!border-error' : '!border-[#77858F]'}`}
                  />
                  <ErrorMessage
                    error={errors?.username?.message || errorMessages.username}
                    className="mt-[5px] mb-[5px] text-xs"
                  />
                </div>
              </div>
            )}
            {/* Change option form */}
            {isOptionEmail && (
              <div className="flex gap-[10px]">
                <div className="w-full max-w-[110px] text-[14px] mt-1 font-medium">
                  メールアドレス{' '}
                  <span className="text-error font-bold">{`*`}</span>
                </div>
                <div className="flex flex-col w-full h-fit">
                  <Input
                    name="email"
                    required
                    placeholder="入力してください"
                    register={register('email', {
                      ...emailRules(true),
                      maxLength: {
                        value: 255,
                        message: ERROR_LONG_FIELD_MESSAGE,
                      },
                      onChange: () => {
                        setErrorMessages((prev) => {
                          return {
                            ...prev,
                            email: '',
                          };
                        });
                      },
                    })}
                    disabled={action == ActionsEvent.EDIT}
                    className={`h-[34px] !border-[#77858F] !w-full rounded-md !text-sm !py-0 ${errors?.email?.message || errorMessages?.email ? '!border-error' : '!border-[#77858F]'}`}
                  />
                  <ErrorMessage
                    error={errors?.email?.message || errorMessages?.email}
                    className="mt-[5px] mb-[5px] text-xs"
                  />
                </div>
              </div>
            )}
            {isTwoFA ? (
              <div className="flex gap-[10px]">
                <div className="w-full max-w-[110px] text-[14px] font-medium">
                  認証ための <span className="text-error font-bold">{`*`}</span>
                  <br />
                  メールアドレス
                </div>
                <div className="flex flex-col w-full h-fit">
                  <Input
                    required
                    placeholder="入力してください"
                    register={register('twoFactorAuthEmailRequired', {
                      ...emailRules(true),
                      onChange: () => {
                        clearErrors('twoFactorAuthEmailRequired');
                      },
                    })}
                    className={`h-[34px] !border-[#77858F] rounded-md !text-sm !py-0 ${!errors?.twoFactorAuthEmailRequired ? '!border-[#77858F]' : '!border-error'}`}
                  />
                  <ErrorMessage
                    error={errors?.twoFactorAuthEmailRequired?.message}
                    className="mt-[5px] mb-[5px] text-xs"
                  />
                </div>
              </div>
            ) : (
              <div className="flex  gap-[10px] items-center">
                <div className="w-full max-w-[110px] text-[14px] font-medium">
                  認証ための
                  <br />
                  メールアドレス
                </div>
                <div className="flex grow">
                  <Input
                    required={false}
                    placeholder="入力してください"
                    register={register('twoFactorAuthEmail', {
                      ...emailRules(false),
                      maxLength: {
                        value: 255,
                        message: ERROR_LONG_FIELD_MESSAGE,
                      },
                      onChange: () => {
                        clearErrors('twoFactorAuthEmail');
                      },
                    })}
                    className={`h-[34px] !border-[#77858F] rounded-md !text-sm !py-0 ${!errors?.twoFactorAuthEmail ? '!border-[#77858F]' : '!border-error'}`}
                  />
                </div>
              </div>
            )}
            {action === ActionsEvent.EDIT && (
              <div className={``}>
                <div className="flex gap-[10px]">
                  <div className="w-full max-w-[110px] text-[14px] mt-1 font-medium">
                    パスワード
                  </div>
                  <div className="flex flex-col w-full fit">
                    <Input
                      type={isTypePassword === '' ? 'text' : 'password'}
                      placeholder="パスワードを入力"
                      autoCompleteInput={false}
                      autoComplete="new-password"
                      register={register('password', {
                        ...passwordRegisterRules(false),
                        maxLength: {
                          value: 255,
                          message: ERROR_LONG_FIELD_MESSAGE,
                        },
                        onChange: () => {
                          setErrorMessages((prev) => {
                            return {
                              ...prev,
                              password: '',
                            };
                          });
                        },
                      })}
                      className={`h-[34px] w-full leading-[34px] !text-sm ${!errorMessages?.password && !errors?.password?.message ? '!border-[#77858F]' : '!border-error'} rounded-md px-2 custom-password-mask`}
                    />
                    <ErrorMessage
                      error={
                        errors?.password?.message || errorMessages.password
                      }
                      className="mt-[5px] mb-[5px] text-xs"
                    />
                  </div>
                </div>
              </div>
            )}
            <div>
              <Controller
                control={control}
                name="isTwoFactorAuth"
                render={({ field: { value, onChange } }) => (
                  <Checkbox
                    id="isDraftCustomer"
                    label="2段階認証を有効にする"
                    isChecked={value}
                    className="cursor-pointer"
                    onChange={onChange}
                    boxLabelClass="!ml-2"
                  />
                )}
              />
            </div>
            {/* Main team */}
            <div className="flex  gap-[10px] items-start">
              <div className="w-full max-w-[110px] mt-[6px]">メインチーム</div>
              <div className="w-full">
                <div className="flex gap-2">
                  <div className="w-full">
                    <Controller
                      control={control}
                      name={`mainOrganization`}
                      render={({ field: { value, onChange } }) => {
                        return (
                          <div className="max-w-[441px] w-[441px]">
                            <Dropdown
                              options={unSelectedOrganizationOptions}
                              selectedOption={originalOrganizationOptions.find(
                                (element) =>
                                  element.value == value?.value &&
                                  value.type == OrganizationType.MAIN,
                              )}
                              onChange={(option: OptionDropdownType) => {
                                onChange({
                                  ...option,
                                  type: OrganizationType.MAIN,
                                });
                                handleSelectedMainOrganization({
                                  ...option,
                                  type: OrganizationType.MAIN,
                                });
                              }}
                              placeholderClass="!text-black text-sm font-normal"
                              className="!h-[34px] w-[441px] !rounded-md !border text-sm font-normal !py-0 !border-[#77858F] "
                              labelTextClass="!text-[#77858F] !text-xs !font-medium"
                              classNameOption="!text-sm w-[441px]"
                            />
                          </div>
                        );
                      }}
                    />
                  </div>
                  <div className="mb-[2.5px] w-12">
                    <Button
                      sz="sm"
                      variant="outline"
                      className="w-12 h-[34px] hover:opacity-70 !border-none !px-0 !rounded-md text-[13px] !bg-[#EBF1F7]"
                      type="button"
                      name="Remove TagId"
                      onClick={() => {
                        setSelectedOrganizationOptions((prevState) =>
                          prevState.filter(
                            (item) =>
                              item.value != watch('mainOrganization')?.value,
                          ),
                        );
                        setValue('mainOrganization', undefined, {
                          shouldDirty: true,
                        });
                      }}>
                      削除
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            {/* Sub teams */}
            <div className="flex gap-[10px] items-start">
              <div className="w-full max-w-[110px] mt-2 text-[14px] font-medium">
                サブチーム
              </div>
              <div className="w-full flex flex-col gap-1 items-start ">
                {fields.map((field, index) => (
                  <div className="flex gap-2 relative w-full" key={field.id}>
                    <div className="w-full">
                      <Controller
                        control={control}
                        name={`organizations.${index}`}
                        render={({ field: { value, onChange } }) => {
                          return (
                            <div className="max-w-[441px] w-[441px]">
                              <Dropdown
                                options={unSelectedOrganizationOptions}
                                selectedOption={originalOrganizationOptions.find(
                                  (element) =>
                                    element.value == value?.value &&
                                    value.type == OrganizationType.SUB,
                                )}
                                onChange={(option: OptionDropdownType) => {
                                  onChange({
                                    ...option,
                                    type: OrganizationType.SUB,
                                  });
                                  handleSelectedOrganization(index, {
                                    ...option,
                                    type: OrganizationType.SUB,
                                  });
                                }}
                                placeholderClass="!text-black text-sm font-normal"
                                className="!h-[34px] w-[441px] !rounded-md !border text-sm font-normal !py-0 !border-[#77858F] "
                                labelTextClass="!text-[#77858F] !text-xs !font-medium"
                                classNameOption="!text-sm w-[441px]"
                              />
                            </div>
                          );
                        }}
                      />
                    </div>

                    <div className="mt-[2.5px] w-12">
                      <Button
                        sz="sm"
                        variant="outline"
                        className="w-12 h-[34px] hover:opacity-70 !border-none !px-0 !rounded-md text-[13px] !bg-[#EBF1F7]"
                        type="button"
                        name="Remove organization"
                        onClick={() =>
                          handleRemoveSelectedOrganization(
                            watch(`organizations.${index}`),
                            index,
                          )
                        }>
                        削除
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="text-right flex justify-center w-full mt-4 ">
                  <Button
                    sz="sm"
                    variant="outline"
                    className="w-6 h-6 mr-[54px] text-xs !py-0 !px-0 border-none !rounded-full !bg-[#ECF0F2] hover:opacity-70"
                    type="button"
                    onClick={async () => {
                      append({ label: '', value: '' });
                      setSelectedOrganizationOptions((prevState) => [
                        ...prevState,
                        {
                          label: '',
                          value: '',
                          type: OrganizationType.SUB,
                        },
                      ]);
                    }}>
                    <ImageRound
                      src="/icons/plus.svg"
                      name="Add organization"
                      className="h-3 w-3"
                    />
                  </Button>
                </div>
              </div>
            </div>
            {/* Role */}
            <div className="flex gap-[10px] items-start">
              <div className="w-full max-w-[110px] mt-2 text-[14px] font-medium">
                権限 <span className="text-error font-bold">{`*`}</span>
              </div>
              <div className="flex flex-col gap-1 items-start w-full">
                {fieldsRole.map((field, index) => (
                  <div className="flex gap-3 w-[500px]" key={field.id}>
                    <div className="w-[440px]">
                      <Controller
                        control={control}
                        name={`roles.${index}`}
                        rules={{ required: ROLE_REQUIRED_MESSAGE }}
                        render={({ field: { value, onChange } }) => (
                          <Dropdown
                            options={unSelectedRoleOptions}
                            selectedOption={roleUserOptions.find(
                              (element) => element.value === value?.value,
                            )}
                            onChange={(option: OptionDropdownType) => {
                              clearErrors('roles');
                              onChange(option);
                              handleSelectedRole(index, option);
                            }}
                            placeholderClass="!text-black text-sm font-normal"
                            className={`!h-[34px] !rounded-md !border text-sm font-normal !py-0 !border-[#77858F] ${!errors?.roles ? '!border-[#77858F]' : '!border-error'}`}
                            labelTextClass="!text-[#77858F] !text-xs !font-medium"
                            classNameOption="!text-sm"
                          />
                        )}
                      />
                    </div>
                    {fieldsRole.length > 1 && (
                      <div className="mt-[2.5px]">
                        <Button
                          sz="sm"
                          variant="outline"
                          className="w-12 h-[34px] hover:opacity-70 !border-none !px-0 !rounded-md text-[13px] !bg-[#EBF1F7]"
                          type="button"
                          name="Remove organization"
                          onClick={() =>
                            handleRemoveSelectedRole(
                              watch(`roles.${index}`),
                              index,
                            )
                          }>
                          削除
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                <ErrorMessage
                  error={errors?.roles ? errors.roles.root?.message : ''}
                  className="mt-[5px] mb-[5px] text-xs"
                />
                <div className="text-right flex justify-center w-full mt-4 ">
                  <Button
                    sz="sm"
                    variant="outline"
                    className="w-6 h-6 mr-[54px] text-xs !py-0 !px-0 border-none !rounded-full !bg-[#ECF0F2] hover:opacity-70"
                    type="button"
                    onClick={() => appendRole({ label: '', value: '' })}>
                    <ImageRound
                      src="/icons/plus.svg"
                      name="Add organization"
                      className="h-3 w-3"
                    />
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-center mt-8">
            {session?.user.permissions &&
              ((action === ActionsEvent.EDIT &&
                hasPermissionInArray(
                  session?.user.permissions,
                  PermissionsSystem.USER_UPDATE,
                )) ||
                (action === ActionsEvent.CREATE &&
                  hasPermissionInArray(
                    session?.user.permissions,
                    PermissionsSystem.USER_ADD,
                  ))) && (
                <Button
                  type="submit"
                  disabled={action == ActionsEvent.EDIT && !isDirty}
                  className="w-[200px] h-[46px] !text-[15px]">
                  保存
                </Button>
              )}
          </div>
        </div>
      </form>
    </Drawer>
  );
};

export default ActionsUserModal;
