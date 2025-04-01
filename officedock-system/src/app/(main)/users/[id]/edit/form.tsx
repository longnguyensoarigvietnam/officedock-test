'use client';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Controller,
  SubmitHandler,
  useFieldArray,
  useForm,
} from 'react-hook-form';
import { useMutation } from 'react-query';
import { signOut, useSession } from 'next-auth/react';
import { AxiosError } from 'axios';

import Button from '@components/common/Button';
import Dropdown from '@components/common/Dropdown';
import ImageRound from '@components/common/ImageRound';
import Input from '@components/common/Input';
import Checkbox from '@components/common/Checkbox';

import api from '@base/api';
import { OptionDropdownType } from '@interfaces/common';
import {
  CreateUserFormData,
  CreateUserFormRequest,
  UserRoleType,
} from '@interfaces/user';

import {
  ERROR_COMMON_MESSAGE,
  ERROR_UPDATE_MESSAGE,
  ID_REQUIRED_MESSAGE,
  NAME_REQUIRED_MESSAGE,
  ROLE_REQUIRED_MESSAGE,
  SUCCESS_UPDATE_MESSAGE,
} from '@constants/message';
import { apiRouters, pageRouters } from '@constants/routers';
import {
  ServerStatusCode,
  CreateUserType,
  OrganizationType,
} from '@constants/enums';

import useCreationRoleUser from '@hooks/useCreationRoleUser';
import useCreationOrganization from '@hooks/useCreationOrganization';
import useUserDetail from '@hooks/useUserDetail';

import { UserStateContext } from '@providers/UserProvider';
import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';

import { emailRules, passwordRegisterRules } from '@utils/validators';
import { generatePassword } from '@utils';
import { useErrorToast } from '@hooks/useErrorToast';

const EditUserForm = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const showErrorToast = useErrorToast();

  const { setIsLoading } = useContext(LoadingContext);
  const { dataUserDetail, setDataUserDetail } = useContext(UserStateContext);

  const { showToast } = useToast();
  const [isOptionEmail, setOptionEmail] = useState<boolean>(true);

  const [originalOrganizationOptions, setOriginalOrganizationOptions] =
    useState<OptionDropdownType[]>([]);
  const [selectedOrganizationOptions, setSelectedOrganizationOptions] =
    useState<OptionDropdownType[]>([]);
  const [unSelectedOrganizationOptions, setUnSelectedOrganizationOptions] =
    useState<OptionDropdownType[]>([]);

  // Role
  const [roleUserOptions, setRoleUserOptions] = useState<OptionDropdownType[]>(
    [],
  );
  const [selectedRoleOptions, setSelectedRoleOptions] = useState<
    OptionDropdownType[]
  >([]);
  const [unSelectedRoleOptions, setUnSelectedRoleOptions] = useState<
    OptionDropdownType[]
  >([]);

  // Loading dropdown
  const [isLoadingOrganization, setIsLoadingOrganization] =
    useState<boolean>(true);
  const [isLoadingRole, setIsLoadingRole] = useState<boolean>(true);

  const { userDetail } = useUserDetail({
    userId: params.id,
    onError: (error: AxiosError) => {
      if (error.response?.status === ServerStatusCode.NOT_FOUND) {
        router.push(pageRouters.USERS_MANAGEMENT.href);
        showToast({
          variant: 'error',
          description: ERROR_COMMON_MESSAGE,
        });
      }
    },
  });
  useEffect(() => {
    if (userDetail) {
      setDataUserDetail(userDetail);
    }
  }, [setDataUserDetail, userDetail]);
  useEffect(() => {
    if (!dataUserDetail) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataUserDetail]);
  const { creationOrganization } = useCreationOrganization({
    onSettled: () => {
      setIsLoadingOrganization(false);
    },
  });
  const { creationRoleUserData } = useCreationRoleUser({
    onSettled: () => {
      setIsLoadingRole(false);
    },
  });

  useEffect(() => {
    if (creationRoleUserData) {
      setRoleUserOptions(
        creationRoleUserData.map((org) => ({
          label: org.name,
          value: org.id,
        })),
      );
    }
  }, [creationRoleUserData]);

  useEffect(() => {
    if (creationOrganization) {
      setOriginalOrganizationOptions(
        creationOrganization.map((org) => ({
          label: org.name,
          value: org.id,
        })),
      );

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
                  value: mainOrganization.id,
                  type: OrganizationType.MAIN,
                },
              ]
            : [{ label: '', value: '', type: OrganizationType.MAIN }]),
          ...subOrganizations.map((org) => {
            return {
              label: org.name,
              value: org.id,
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
    creationOrganization,
    dataUserDetail?.organizations,
    dataUserDetail?.roles,
  ]);

  const {
    register,
    control,
    reset,
    setValue,
    watch,
    setError,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateUserFormData>({
    mode: 'onSubmit',
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
    append({ label: '', value: '' });
  }, [append]);
  useEffect(() => {
    if (!dataUserDetail) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataUserDetail]);

  const defaultValues = useMemo<CreateUserFormData>(() => {
    const value: CreateUserFormData = {
      name: '',
      email: '',
      organizations: [],
      roles: [],
      username: '',
      password: '',
      twoFactorAuthEmail: '',
      isTwoFactorAuth: false,
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
      value.organizations = dataUserDetail.organizations
        .filter((organization) => !organization.isMain)
        .map((element) => ({
          label: element.name,
          value: element.id,
          type: OrganizationType.SUB,
        }));
      value.mainOrganization = dataUserDetail.organizations.find(
        (element) => element.isMain,
      )
        ? {
            label: dataUserDetail.organizations.find(
              (element) => element.isMain == true,
            )?.name as string,
            value: dataUserDetail.organizations.find(
              (element) => element.isMain == true,
            )?.id as number,
            type: OrganizationType.MAIN as string,
          }
        : { label: '', value: '', type: OrganizationType.MAIN as string };

      setOptionEmail(dataUserDetail.loginType === CreateUserType.EMAIL);
    }

    return value;
  }, [dataUserDetail]);

  // Update default value
  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  // If have option selected or remove option selected, update option for unselected options
  useEffect(() => {
    const selectedValues = selectedOrganizationOptions.map(
      (element) => element.value,
    );
    const unSelectedOptions = originalOrganizationOptions.filter(
      (option) => !selectedValues.includes(option.value),
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

  // Handle generate password
  const handleGeneratePassword = () => {
    const password = generatePassword();
    setValue('password', password);
  };

  function areArraysEqual(
    arrayA: UserRoleType[],
    arrayB: UserRoleType[],
  ): boolean {
    if (arrayA.length !== arrayB.length) {
      return false;
    }

    for (let i = 0; i < arrayA.length; i++) {
      const itemA = arrayA[i];
      const itemB = arrayB[i];
      if (
        itemA.id !== itemB.id ||
        itemA.name !== itemB.name ||
        itemA.systemRole !== itemB.systemRole
      ) {
        return false;
      }
    }

    return true;
  }

  // Handle submit edit user
  const handleEditUser = async (data: CreateUserFormRequest) => {
    setIsLoading(true);
    return await api.patch(apiRouters.USER_DETAIL(params.id), data);
  };

  const { mutate: editUser } = useMutation('postEditUser', handleEditUser, {
    onSuccess: async ({ data }) => {
      showToast({
        description: SUCCESS_UPDATE_MESSAGE,
      });

      if (
        dataUserDetail?.roles &&
        !areArraysEqual(data.roles, dataUserDetail?.roles) &&
        params.id === `${session?.user.id}`
      ) {
        await signOut({
          redirect: false,
        });
        router.push(pageRouters.LOGIN.href);
      } else {
        router.push(pageRouters.USERS_MANAGEMENT.href);
      }
    },
    onError: (error: AxiosError<any>) => {
      showErrorToast(error, ERROR_UPDATE_MESSAGE);
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const onSubmit: SubmitHandler<CreateUserFormData> = (data) => {
    const organizationIds = data.organizations
      .filter((item) => item.value !== '')
      .map((item) => ({ organizationId: item.value, isMain: false }));
    if (data.mainOrganization?.value) {
      organizationIds.push({
        organizationId: data.mainOrganization.value,
        isMain: true,
      });
    }
    const roleListId = data.roles
      .filter((item) => item.value !== '')
      .map((item) => item.value as number);

    if (isOptionEmail) {
      editUser({
        email: data.email,
        profile: {
          fullName: data.name,
        },
        organizationIds: organizationIds,
        roleIds: roleListId,
        loginType: CreateUserType.EMAIL,
        isTwoFactorAuth: data.isTwoFactorAuth,
        twoFactorAuthEmail: data.isTwoFactorAuth
          ? data.twoFactorAuthEmailRequired
          : data.twoFactorAuthEmail,
        password: data.password !== '' ? data.password : null,
      });
    } else {
      editUser({
        username: data.username,
        profile: {
          fullName: data.name,
        },
        organizationIds: organizationIds,
        roleIds: roleListId,
        loginType: CreateUserType.USERNAME,
        isTwoFactorAuth: data.isTwoFactorAuth,
        twoFactorAuthEmail: data.isTwoFactorAuth
          ? data.twoFactorAuthEmailRequired
          : data.twoFactorAuthEmail,
        password: data.password !== '' ? data.password : null,
      });
    }
  };
  const isTwoFA = watch('isTwoFactorAuth');

  const isTypePassword = watch('password');

  return (
    <div className="flex flex-col gap-6">
      <form
        className="w-full flex flex-col gap-4"
        onSubmit={handleSubmit(onSubmit)}>
        <div className="">
          <div className="flex gap-5 mt-4">
            <div
              className={`flex items-center gap-2 w-1/4 ${!isOptionEmail && 'opacity-40'}`}>
              <div className="w-5 h-5">
                <Input
                  type="radio"
                  checked={isOptionEmail}
                  className="!py-0 !px-0 h-5 w-5 !rounded-full cursor-pointer focus:ring-offset-0"
                />
              </div>
              <p>メールアドレス</p>
            </div>
            <div
              className={`flex items-center gap-4 ${isOptionEmail && 'opacity-40'}`}>
              <div className="w-5 h-5">
                <Input
                  type="radio"
                  checked={!isOptionEmail}
                  className="!py-0 !px-0 h-5 w-5 !rounded-full cursor-pointer focus:ring-offset-0"
                />
              </div>
              <p>ID</p>
            </div>
          </div>
          <div className="w-1/2 max-w-[50%] flex flex-col gap-4">
            <Input
              label="名前"
              name="name"
              required
              placeholder="入力してください"
              error={errors?.name?.message}
              register={register('name', {
                required: NAME_REQUIRED_MESSAGE,
              })}
            />
            {/* Change option form */}
            {!isOptionEmail && (
              <Input
                label="ID"
                name="ID"
                required
                disabled
                placeholder="123456"
                error={errors?.username?.message}
                register={register('username', {
                  required: ID_REQUIRED_MESSAGE,
                })}
              />
            )}
            {/* Change option form */}
            {isOptionEmail && (
              <>
                <Input
                  label="メールアドレス"
                  name="email"
                  required
                  disabled
                  placeholder="入力してください"
                  error={errors?.email?.message}
                  register={register('email', emailRules(true))}
                />
              </>
            )}
            {isTwoFA ? (
              <Input
                label="認証ためのメールアドレス"
                required
                placeholder="入力してください"
                error={errors?.twoFactorAuthEmailRequired?.message}
                register={register(
                  'twoFactorAuthEmailRequired',
                  emailRules(true),
                )}
              />
            ) : (
              <Input
                label="認証ためのメールアドレス"
                required={false}
                placeholder="入力してください"
                error={errors?.twoFactorAuthEmail?.message}
                register={register('twoFactorAuthEmail', emailRules(false))}
              />
            )}
            <div>
              <Controller
                control={control}
                name="isTwoFactorAuth"
                render={({ field: { value, onChange } }) => (
                  <Checkbox
                    id="isDraftCustomer"
                    label="二要素認証を有効にする"
                    isChecked={value}
                    className="cursor-pointer"
                    onChange={onChange}
                  />
                )}
              />
            </div>
            <div
              className={`flex gap-3 ${errors.password?.message ? 'items-center' : 'items-end'}`}>
              <Input
                label="パスワード"
                type={isTypePassword === '' ? 'text' : 'password'}
                placeholder="パスワードを入力"
                error={errors?.password?.message}
                register={register('password', {
                  ...passwordRegisterRules(false),
                })}
              />
              <Button
                type="button"
                onClick={handleGeneratePassword}
                className="h-[46px] w-full max-w-[99px]">
                再設定
              </Button>
            </div>
            <div className="grid gap-3 flex-1 min-w-0">
              <label className="text-sm ">組織 正</label>
              <Controller
                control={control}
                name={`mainOrganization`}
                render={({ field: { value, onChange } }) => {
                  return (
                    <div className="flex-1 min-w-0">
                      <Dropdown
                        isLoading={isLoadingOrganization}
                        options={unSelectedOrganizationOptions}
                        placeholder="選択してください"
                        selectedOption={originalOrganizationOptions.find(
                          (element) =>
                            element.value == value?.value &&
                            value.type == OrganizationType.MAIN,
                        )}
                        onChange={(option: OptionDropdownType) => {
                          onChange({ ...option, type: OrganizationType.MAIN });
                          handleSelectedMainOrganization({
                            ...option,
                            type: OrganizationType.MAIN,
                          });
                        }}
                      />
                    </div>
                  );
                }}
              />
            </div>
            <div className="grid gap-3 mt-3 w-full">
              <label className="text-sm ">組織 副</label>
              {fields.map((field, index) => (
                <div
                  className="flex gap-3 relative max-w-[calc(100%)]"
                  key={field.id}>
                  <div className="flex-1 min-w-0">
                    <Controller
                      control={control}
                      name={`organizations.${index}`}
                      render={({ field: { value, onChange } }) => {
                        return (
                          <div className="max-w-[485px]">
                            <Dropdown
                              classActive="max-w-[100%]"
                              isLoading={isLoadingOrganization}
                              options={unSelectedOrganizationOptions}
                              placeholder="選択してください"
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
                            />
                          </div>
                        );
                      }}
                    />
                  </div>

                  <div className="mt-[2.5px]  flex-shrink-0">
                    <Button
                      sz="sm"
                      variant="outline"
                      className="w-[99px]"
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
              <div className="text-right">
                <Button
                  sz="sm"
                  variant="outline"
                  className="w-[99px]"
                  type="button"
                  onClick={() => {
                    append({ label: '', value: '' });
                    setSelectedOrganizationOptions((prevState) => [
                      ...prevState,
                      { label: '', value: '', type: OrganizationType.SUB },
                    ]);
                  }}>
                  <ImageRound
                    src="/icons/plus.svg"
                    name="Add organization"
                    className="mr-3 h-4 w-4"
                  />
                  追加
                </Button>
              </div>
            </div>
            <div className="grid gap-3 ">
              <label className={`text-sm`}>
                ロール
                <>
                  <span className="text-error font-bold">{`*`}</span>
                </>
              </label>
              <div className="grid gap-3">
                {fieldsRole.map((field, index) => (
                  <div className="flex gap-3" key={field.id}>
                    <Controller
                      control={control}
                      name={`roles.${index}`}
                      rules={{ required: ROLE_REQUIRED_MESSAGE }}
                      render={({ field: { value, onChange } }) => (
                        <Dropdown
                          isLoading={isLoadingRole}
                          options={unSelectedRoleOptions}
                          placeholder="ロールを選択してください"
                          selectedOption={roleUserOptions.find(
                            (element) => element.value === value?.value,
                          )}
                          onChange={(option: OptionDropdownType) => {
                            setError('roles', { message: '' });
                            onChange(option);
                            handleSelectedRole(index, option);
                          }}
                          error={errors.roles?.root?.message || ''}
                        />
                      )}
                    />
                    {fieldsRole.length > 1 && (
                      <div className="mt-[2.5px]">
                        <Button
                          sz="sm"
                          variant="outline"
                          className="w-[99px]"
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
              </div>
              <div className="text-right">
                <Button
                  sz="sm"
                  variant="outline"
                  className="w-[99px]"
                  type="button"
                  onClick={() => appendRole({ label: '', value: '' })}>
                  <ImageRound
                    src="/icons/plus.svg"
                    name="Add role"
                    className="mr-3 h-4 w-4"
                  />
                  追加
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div className="w-full flex items-center gap-2 mt-8 flex-col mb-3">
          <Button type="submit" className="w-[426px]">
            編集
          </Button>
          <Button
            variant="secondary"
            type="button"
            className="w-[426px]"
            onClick={() => router.back()}>
            戻る
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EditUserForm;
