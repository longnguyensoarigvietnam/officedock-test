'use client';
import { useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Controller,
  SubmitHandler,
  useFieldArray,
  useForm,
} from 'react-hook-form';
import { useMutation } from 'react-query';

import Button from '@components/common/Button';
import Dropdown from '@components/common/Dropdown';
import ImageRound from '@components/common/ImageRound';
import Input from '@components/common/Input';
import Checkbox from '@components/common/Checkbox';

import api from '@base/api';
import { OptionDropdownType } from '@interfaces/common';
import { CreateUserFormData, CreateUserFormRequest } from '@interfaces/user';
import { ResponseError } from '@interfaces/response';

import {
  ERROR_COMMON_MESSAGE,
  ERROR_CREATE_MESSAGE,
  ERROR_EMAIL_AVAILABLE_MESSAGE,
  ERROR_ID_AVAILABLE_MESSAGE,
  ID_REQUIRED_MESSAGE,
  NAME_REQUIRED_MESSAGE,
  ROLE_REQUIRED_MESSAGE,
  SUCCESS_CREATE_MESSAGE,
} from '@constants/message';
import { apiRouters, pageRouters } from '@constants/routers';
import {
  CreateUserType,
  CurrentScreen,
  ServerStatusCode,
} from '@constants/enums';

import useCreationRoleUser from '@hooks/useCreationRoleUser';
import useCreationOrganization from '@hooks/useCreationOrganization';

import { LoadingContext } from '@providers/LoadingProvider';
import { useToast } from '@providers/ToastProvider';

import { emailRules } from '@utils/validators';

const CreateUserForm = () => {
  const router = useRouter();
  const { setIsLoading } = useContext(LoadingContext);
  const { showToast } = useToast();

  const [isOptionEmail, setOptionEmail] = useState<boolean>(true);

  const [isSubmit, setIsSubmit] = useState(false);

  const [originalOrganizationOptions, setOriginalOrganizationOptions] =
    useState<OptionDropdownType[]>([]);
  const [selectedOrganizationOptions, setSelectedOrganizationOptions] =
    useState<OptionDropdownType[]>([{ label: '', value: '' }]);
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

  const { creationOrganization } = useCreationOrganization({
    current_screen: CurrentScreen.USER,
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
    }
  }, [creationOrganization]);

  const {
    register,
    control,
    watch,
    reset,
    setError,
    handleSubmit,
    formState: { errors },
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

  //Function call api create user
  const handleCreateUser = async (data: CreateUserFormRequest) => {
    setIsLoading(true);
    return await api.post(apiRouters.USER_LIST, data);
  };

  const { mutate: createUser } = useMutation(
    'postCreateUser',
    handleCreateUser,
    {
      onSuccess: () => {
        showToast({
          description: SUCCESS_CREATE_MESSAGE,
        });
        router.push(pageRouters.USERS_MANAGEMENT.href);
      },
      onError: ({
        response,
      }: ResponseError<{ username: string; email: string }>) => {
        if (response?.data.username) {
          setError('username', {
            message: ERROR_ID_AVAILABLE_MESSAGE,
          });
        }
        if (response?.data.email) {
          setError('email', {
            message: ERROR_EMAIL_AVAILABLE_MESSAGE,
          });
        }
        if (response?.status === ServerStatusCode.NOT_FOUND) {
          showToast({
            variant: 'error',
            description: ERROR_COMMON_MESSAGE,
          });
        } else {
          showToast({
            variant: 'error',
            description: ERROR_CREATE_MESSAGE,
          });
        }
        setIsSubmit(false);
      },
      onSettled: () => {
        setIsLoading(false);
      },
    },
  );

  const onSubmit: SubmitHandler<CreateUserFormData> = (data) => {
    if (!isSubmit) {
      setIsSubmit(true);
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
        createUser({
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
          password: null,
        });
      } else {
        createUser({
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
          password: null,
        });
      }
    }
  };
  const isTwoFA = watch('isTwoFactorAuth');

  return (
    <div className="flex flex-col gap-6">
      <form
        className="w-full flex flex-col gap-4 "
        onSubmit={handleSubmit(onSubmit)}>
        <div className="">
          <div className="flex gap-5 mt-4">
            <div className="flex items-center gap-2 w-1/4">
              <div className="w-5 h-5">
                <Input
                  type="radio"
                  checked={isOptionEmail}
                  onClick={() => {
                    reset();
                    setSelectedOrganizationOptions([]);
                    setOptionEmail(true);
                  }}
                  className="!py-0 !px-0 h-5 w-5 !rounded-full cursor-pointer focus:ring-offset-0"
                />
              </div>
              <p>メールアドレス</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-5 h-5">
                <Input
                  type="radio"
                  checked={!isOptionEmail}
                  onClick={() => {
                    reset();
                    setSelectedOrganizationOptions([]);
                    setOptionEmail(false);
                  }}
                  className="!py-0 !px-0 h-5 w-5 !rounded-full cursor-pointer focus:ring-offset-0"
                />
              </div>
              <p>ID</p>
            </div>
          </div>
          <div className="w-1/2 flex flex-col gap-4 mt-3">
            <Input
              label="名前"
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
                required
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
                  required
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
            <div className="grid gap-3 ">
              <label className="text-sm ">組織 正</label>
              <div className="max-w-[596px]">
                <Controller
                  control={control}
                  name={`mainOrganization`}
                  render={({ field: { onChange } }) => (
                    <Dropdown
                      isLoading={isLoadingOrganization}
                      options={unSelectedOrganizationOptions}
                      placeholder="選択してください"
                      onChange={(option: OptionDropdownType) => {
                        onChange(option);
                        handleSelectedMainOrganization(option);
                      }}
                    />
                  )}
                />
              </div>
            </div>
            <div className="grid gap-3 ">
              <label className="text-sm ">組織 副</label>
              {fields.map((field, index) => (
                <div className="flex gap-3" key={field.id}>
                  <Controller
                    control={control}
                    name={`organizations.${index}`}
                    render={({ field: { onChange } }) => (
                      <Dropdown
                        isLoading={isLoadingOrganization}
                        options={unSelectedOrganizationOptions}
                        placeholder="選択してください"
                        onChange={(option: OptionDropdownType) => {
                          onChange(option);
                          handleSelectedOrganization(index, option);
                        }}
                      />
                    )}
                  />

                  <div className="mt-[2.5px]">
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
                      { label: '', value: '' },
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
                    <div className="max-w-[485px]">
                      <Controller
                        control={control}
                        name={`roles.${index}`}
                        rules={{ required: ROLE_REQUIRED_MESSAGE }}
                        render={({ field: { onChange } }) => (
                          <Dropdown
                            isLoading={isLoadingRole}
                            options={unSelectedRoleOptions}
                            placeholder="ロールを選択してください"
                            onChange={(option: OptionDropdownType) => {
                              setError('roles', { message: '' });
                              onChange(option);
                              handleSelectedRole(index, option);
                            }}
                            error={errors.roles?.root?.message || ''}
                          />
                        )}
                      />
                    </div>
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
          <Button className="w-[426px]" type="submit">
            作成
          </Button>
          <Button
            className="w-[426px]"
            variant="secondary"
            type="button"
            onClick={() => router.back()}>
            戻る
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateUserForm;
