'use client';
import {
  Dispatch,
  SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Controller, SubmitHandler, useForm, useWatch } from 'react-hook-form';
import {
  DragDropContext,
  Draggable,
  Droppable,
  DropResult,
} from '@hello-pangea/dnd';
import ReactDOM from 'react-dom';
import { v4 as uuidv4 } from 'uuid';
import TextareaAutosize from 'react-textarea-autosize';

import Button from '@components/common/Button';
import Dropdown from '@components/common/Dropdown';
import Input from '@components/common/Input';
import TextAreaLink from '@components/common/TextAreaLink';
import ImageRound from '@components/common/ImageRound';
import Drawer from '@components/common/Drawers';
import MultiSelectDropdown from '@components/common/MultiSelectDropdown';

import { useSessionCache } from '@providers/SessionCacheProvider';

import {
  DEFAULT_VALUE_TODO_LIST,
  ERROR_LONG_FIELD_MESSAGE,
} from '@constants/message';
import { COPY_MESSAGE, NO_SETTING, UNREGISTERED } from '@constants';
import {
  ActionTask,
  EventWorkCategory,
  PermissionsSystem,
  TemplateAction,
} from '@constants/enums';

import { CategoryStructure } from '@interfaces/skills';
import { Template, TemplateFormData } from '@interfaces/template';
import { OptionDropdownType } from '@interfaces/common';
import { TaskErrorPerson, TaskFormData, TodoItem } from '@interfaces/task';

import { formatShowDateJapanese } from '@utils/date';
import {
  hasPermissionInArray,
  removeDuplicateOptions,
  showModalHeaderBackgroundColorByTime,
} from '@utils';
import useCreationDataCommon from '@hooks/common/useCreationDataCommon';
import { Organizations } from '@interfaces/organization';

export type ActionTemplateModalProps = {
  open: boolean;
  dataTemplate?: Template | null;
  action?: string;
  peopleDefaultId?: string;
  disableDeleteAction?: boolean;
  orgUserList?: Organizations[] | undefined;

  onDelete?: () => void;
  onClose: () => void;
  onSubmit?: (values: TaskFormData) => void;
  onEdit?: (values: TaskFormData) => void;
  onCopy?: (values: TaskFormData) => void;
  setDataErrorTask?: Dispatch<SetStateAction<TaskErrorPerson | undefined>>;
};

const ActionsTemplateModal = ({
  open,
  orgUserList,
  action = ActionTask.CREATE,
  dataTemplate,
  disableDeleteAction,
  onEdit,
  onSubmit,
  onClose,
  onDelete,
}: ActionTemplateModalProps) => {
  const { data: session } = useSessionCache();

  const modalRef = useRef<HTMLFormElement | null>(null);

  const [todoList, setTodoList] = useState<TodoItem[]>([]);
  const textareaRefs = useRef<(HTMLTextAreaElement | null)[]>([]);

  const [dataOptionsOrganizations, setDataOptionsOrganizations] = useState<
    OptionDropdownType[]
  >([]);
  const [dataOrganizationCategories, setDataOrganizationCategories] = useState<
    CategoryStructure[]
  >([]);
  const [dataOptionsCategorySmall, setDataOptionsCategorySmall] = useState<
    OptionDropdownType[]
  >([
    {
      label: NO_SETTING,
      value: NO_SETTING,
    },
  ]);
  const [dataOptionsCategoryMedium, setDataOptionsCategoryMedium] = useState<
    OptionDropdownType[]
  >([
    {
      label: NO_SETTING,
      value: NO_SETTING,
    },
  ]);
  const [dataOptionsCategoryLarge, setDataOptionsCategoryLarge] = useState<
    OptionDropdownType[]
  >([
    {
      label: NO_SETTING,
      value: NO_SETTING,
    },
  ]);
  const [isFormTouched, setIsFormTouched] = useState<boolean>(false);

  const [dataOptionsTagIds, setDataOptionsTagIds] = useState<
    OptionDropdownType[]
  >([]);
  const [showDescriptionSection, setShowDescriptionSection] =
    useState<boolean>(false);

  const [showTodoSection, setShowTodoSection] = useState<boolean>(false);

  const [isSubmit, setIsSubmit] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    control,
    watch,
    reset,
    trigger,
    getValues,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<TaskFormData>({
    mode: 'onSubmit',
    defaultValues: {
      peopleInChargeIds: dataTemplate ? [] : [{ label: '', value: '' }],
      tagIds: dataTemplate ? [] : [{ label: '', value: '' }],
      isImportant: dataTemplate?.isImportant || false,
    },
  });
  const organizationValue = useWatch({
    control,
    name: 'organization.value',
  });

  const defaultValues = useMemo<TemplateFormData>(() => {
    const value: TemplateFormData = {
      peopleInChargeIds: [
        {
          label: session?.user.profile.fullName || '',
          value: session?.user.id || '',
        },
      ],
      title: '',
      description: '',
      tagIds: dataTemplate ? [] : [{ label: '', value: '' }],
      categories: {
        LARGE: {
          label: '',
          value: '',
        },
        MEDIUM: {
          label: '',
          value: '',
        },
        SMALL: {
          label: '',
          value: '',
        },
      },
      isImportant: false,
    };
    if (dataTemplate) {
      (value.id = `${dataTemplate.id}`),
        (value.title =
          action === ActionTask.COPY
            ? `${`${dataTemplate.title ? dataTemplate.title : ''}` + COPY_MESSAGE}`
            : dataTemplate.title),
        (value.description = dataTemplate.description),
        (value.isImportant = dataTemplate.isImportant || false),
        (value.type = {
          label: dataTemplate.type ? dataTemplate.type : '',
          value: dataTemplate.type ? dataTemplate.type : '',
        }),
        (value.organization = dataTemplate.organization
          ? {
              label: dataTemplate.organization.name,
              value: dataTemplate.organization.id as number,
            }
          : undefined),
        (value.description = dataTemplate.description || '');

      if (dataTemplate.tags) {
        value.tagIds = dataTemplate.tags.map((tag) => {
          return {
            value: String(tag.id),
            label: String(tag.name),
          };
        });
      }

      if (dataTemplate.categories) {
        const firstLargeCategory = dataTemplate.categories.find(
          (item) => item.type === EventWorkCategory.LARGE,
        );
        const firstMediumCategory = dataTemplate.categories.find(
          (item) => item.type === EventWorkCategory.MEDIUM,
        );
        const firstSmallCategory = dataTemplate.categories.find(
          (item) => item.type === EventWorkCategory.SMALL,
        );

        (value.categories.LARGE = {
          label: firstLargeCategory
            ? (firstLargeCategory?.name as string)
            : NO_SETTING,
          value: firstLargeCategory
            ? (firstLargeCategory?.id as number)
            : NO_SETTING,
        }),
          (value.categories.MEDIUM = {
            label: firstMediumCategory
              ? (firstMediumCategory?.name as string)
              : NO_SETTING,
            value: firstMediumCategory
              ? (firstMediumCategory?.id as number)
              : NO_SETTING,
          }),
          (value.categories.SMALL = {
            label: firstSmallCategory
              ? (firstSmallCategory?.name as string)
              : NO_SETTING,
            value: firstSmallCategory
              ? (firstSmallCategory?.id as number)
              : NO_SETTING,
          });
      }
    }
    if (orgUserList && action == ActionTask.CREATE) {
      value.organization = orgUserList.find(
        (organization) => organization.isMain,
      )
        ? {
            label:
              orgUserList.find((organization) => organization.isMain)?.name ||
              '',
            value:
              orgUserList.find((organization) => organization.isMain)?.id || '',
          }
        : null;
    }
    return value;
  }, [
    action,
    dataTemplate,
    orgUserList,
    session?.user.id,
    session?.user.profile.fullName,
  ]);

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  useCreationDataCommon({
    condition: [!!organizationValue],
    organizationId: organizationValue
      ? String(organizationValue)
      : orgUserList &&
          orgUserList?.find((organization) => organization.isMain)?.id
        ? String(orgUserList?.find((organization) => organization.isMain)?.id)
        : '',
    options: {
      get_tags: true,
      get_organization_with_categories: true,
    },
    onSuccess: (data) => {
      const listTag =
        data?.tags?.map((tag) => ({
          label: tag.name,
          value: tag.id,
        })) || [];

      setDataOptionsTagIds(listTag);
      const mainItem =
        data.organizationCategories.find(
          (item) => String(item.id) === String(organizationValue),
        ) || data.organizationCategories[0];

      const organizationCategories = mainItem.statisticCategories.map(
        (category) => {
          const largeCategory = category.LARGE || {
            id: NO_SETTING,
            name: NO_SETTING,
            uuid: '',
          };

          const mediumCategories = (category.MEDIUM || []).map(
            (mediumCategory) => {
              const mediumCategoryField = mediumCategory.MEDIUM || {
                id: NO_SETTING,
                name: NO_SETTING,
                uuid: '',
              };
              const smallCategories = mediumCategory.SMALL || [
                { id: NO_SETTING, name: NO_SETTING, uuid: '' },
              ];

              return {
                MEDIUM: mediumCategoryField,
                SMALL: smallCategories,
              };
            },
          );

          return {
            LARGE: largeCategory,
            MEDIUM: mediumCategories,
          };
        },
      );

      setDataOrganizationCategories(organizationCategories);
      setDataOptionsCategoryLarge(() => {
        const largeCategories: OptionDropdownType[] = [];
        mainItem.statisticCategories.map((category) => {
          if (category.LARGE) {
            largeCategories.push({
              label: category.LARGE.name,
              value: category.LARGE.id,
            });
          }
        });
        return largeCategories;
      });
    },
  });

  useEffect(() => {
    if (orgUserList) {
      setDataOptionsOrganizations(
        orgUserList.map((org) => ({
          label: org.name,
          value: org.id as number,
        })) || [],
      );
    }
  }, [orgUserList]);

  // Watch the form fields dynamically
  const largeCategoryValue = useWatch({
    control,
    name: 'categories.LARGE.value',
  });

  const mediumCategoryValue = useWatch({
    control,
    name: 'categories.MEDIUM.value',
  });

  // Dynamically compute dropdown options
  useMemo(() => {
    if (!dataOrganizationCategories || !watch('categories.LARGE.value')) {
      setDataOptionsCategoryMedium([
        {
          label: NO_SETTING,
          value: NO_SETTING,
        },
      ]);
      return;
    }

    const selectedLargeCategory = dataOrganizationCategories.find(
      (category) => category.LARGE.id == watch('categories.LARGE.value'),
    );

    const initialMediumCategory: OptionDropdownType[] = [
      {
        label: NO_SETTING,
        value: NO_SETTING,
      },
    ];
    if (selectedLargeCategory) {
      selectedLargeCategory.MEDIUM.map((mediumCategory) => {
        if (
          !initialMediumCategory.find(
            (item) => item.value == mediumCategory.MEDIUM.id,
          )
        ) {
          initialMediumCategory.push({
            label: mediumCategory.MEDIUM.name,
            value: mediumCategory.MEDIUM.id,
          });
        }
      });
    }
    setDataOptionsCategoryMedium(initialMediumCategory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataOrganizationCategories, largeCategoryValue, watch]);

  useMemo(() => {
    if (!dataOrganizationCategories || !watch('categories.MEDIUM.value')) {
      setDataOptionsCategorySmall([
        {
          label: NO_SETTING,
          value: NO_SETTING,
        },
      ]);
      return;
    }

    const selectedLargeCategoryOption = dataOrganizationCategories.find(
      (category) => category.LARGE.id == watch('categories.LARGE.value'),
    );

    const selectedMediumCategoryOption =
      selectedLargeCategoryOption?.MEDIUM.find(
        (category) => category.MEDIUM.id == watch('categories.MEDIUM.value'),
      );

    const initialSmallCategory: OptionDropdownType[] = [
      {
        label: NO_SETTING,
        value: NO_SETTING,
      },
    ];
    if (selectedMediumCategoryOption) {
      selectedMediumCategoryOption.SMALL &&
        selectedMediumCategoryOption.SMALL.map((smallCategory) => {
          if (
            !initialSmallCategory.find((item) => item.value == smallCategory.id)
          ) {
            initialSmallCategory.push({
              label: smallCategory.name,
              value: smallCategory.id,
            });
          }
        });
    }

    setDataOptionsCategorySmall(initialSmallCategory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dataOrganizationCategories,
    largeCategoryValue,
    mediumCategoryValue,
    watch,
  ]);

  useEffect(() => {
    if (open === false) {
      reset();
      setTodoList([]);
      resetDataCategoryOptions();
      setIsSubmit(false);
    } else {
      if (modalRef.current) {
        modalRef.current.scrollTop = 0;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reset]);
  useEffect(() => {
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 0);
  }, [open]);

  const [newlyAddedId, setNewlyAddedId] = useState<string | null>(null);
  useEffect(() => {
    if (newlyAddedId) {
      const newIndex = todoList.findIndex(
        (todo) => todo.customId === newlyAddedId,
      );
      if (newIndex !== -1) {
        textareaRefs.current[newIndex]?.focus();
        setNewlyAddedId(null);
      }
    }
  }, [todoList, newlyAddedId]);

  const handleAddItem = () => {
    setIsFormTouched(true);
    const newId = uuidv4();
    setTodoList((prevTodoList) => {
      const newData = [
        ...prevTodoList,
        {
          customId: newId,
          content: '',
          isChecked: false,
          index: prevTodoList.length
            ? prevTodoList[prevTodoList.length - 1].index + 1
            : 1,
        },
      ];
      return newData;
    });
    setNewlyAddedId(newId);
  };

  const handleCheck = (index: number) => {
    setIsFormTouched(true);
    const updatedTodos = todoList.map((todo, i) =>
      i === index ? { ...todo, isChecked: !todo.isChecked } : todo,
    );
    setTodoList(updatedTodos);
  };
  useEffect(() => {
    if (dataTemplate && dataTemplate.todoList) {
      const newTodoList = dataTemplate.todoList.map((item) => {
        return {
          ...item,
          isChecked: item.checkedAt ? true : false,
        };
      });
      setTodoList(newTodoList);
    }
  }, [dataTemplate]);
  const handleBlur = ({
    id,
    customId,
    content,
  }: {
    id?: number;
    customId?: string;
    content: string;
  }) => {
    setIsFormTouched(true);
    const newData = todoList.map((todo) => {
      if (id && todo.id && todo.id === id) {
        return { ...todo, content };
      }
      if (customId && `${todo.customId}` === `${customId}`) {
        return { ...todo, content };
      }

      return todo;
    });
    setTodoList(newData);
  };

  const handleOnDragEnd = (result: DropResult): void => {
    setIsFormTouched(true);
    if (!result.destination) return;

    const items = Array.from(todoList);

    const [reorderedItem] = items.splice(result.source.index, 1);

    items.splice(result.destination.index, 0, reorderedItem);
    const updatedTasks = items.map((task, idx) => ({
      ...task,
      index: idx + 1,
    }));

    setTodoList(updatedTasks);
  };
  // Save data when change
  const onSubmitData: SubmitHandler<TaskFormData> = async (data) => {
    if (isSubmit || !open) return;
    setIsSubmit(true);
    const filteredTagIds = (getValues('tagIds') || []).filter(
      (item): item is OptionDropdownType => item !== undefined,
    );
    const isValid = await trigger();

    if (isValid) {
      if (action === ActionTask.EDIT) {
        !isFormTouched
          ? onClose()
          : onEdit &&
            onEdit({
              ...data,
              todoList: todoList,
              tagIds: filteredTagIds,
            });
      }
      if (action === ActionTask.CREATE) {
        onSubmit &&
          onSubmit({
            ...data,
            todoList: todoList,
            tagIds: filteredTagIds,
          });
      }
    }
    setIsSubmit(false);
  };

  const isPermissionAdd =
    session?.user.permissions &&
    hasPermissionInArray(
      session?.user.permissions,
      PermissionsSystem.MY_TASK_ADD,
    );
  const isPermissionUpdate =
    session?.user.permissions &&
    hasPermissionInArray(
      session?.user.permissions,
      PermissionsSystem.MY_TASK_UPDATE,
    );

  const isCheckActionPermission =
    (action === ActionTask.EDIT && !isPermissionUpdate) ||
    ((action === ActionTask.CREATE || action === ActionTask.COPY) &&
      !isPermissionAdd);

  const resetDataCategoryOptions = () => {
    setDataOptionsCategoryLarge([
      {
        label: NO_SETTING,
        value: NO_SETTING,
      },
    ]);
    setDataOptionsCategoryMedium([
      {
        label: NO_SETTING,
        value: NO_SETTING,
      },
    ]);
    setDataOptionsCategorySmall([
      {
        label: NO_SETTING,
        value: NO_SETTING,
      },
    ]);
  };

  return (
    <Drawer
      open={open}
      className="font-primary bg-white w-[700px] !rounded-l-[30px] !p-0"
      onClose={() => {
        resetDataCategoryOptions();
        reset();
        onClose();
      }}>
      <header
        className="px-8 rounded-tl-[30px] h-[50px] flex items-center justify-between"
        style={{
          background: showModalHeaderBackgroundColorByTime(),
        }}>
        <div className="flex text-sm items-center gap-4 text-white">
          <p className="">
            登録日{' '}
            {action === ActionTask.EDIT && dataTemplate?.createdAt
              ? formatShowDateJapanese(dataTemplate.createdAt)
              : formatShowDateJapanese(new Date())}
          </p>
        </div>
        <div className="flex gap-5 items-center ">
          <ImageRound
            className="scale-[0.5] rotate-90 mt-1 text-xs mr-[-10px] hover:cursor-pointer"
            src="/icons/three-dots-white.svg"
            border="full"
            name="Three dots white"
          />
          {!disableDeleteAction &&
            action === TemplateAction.EDIT &&
            session?.user.permissions &&
            hasPermissionInArray(
              session?.user.permissions,
              PermissionsSystem.MY_TASK_DELETE,
            ) && (
              <ImageRound
                className="mt-1 w-[14px] h-[17px] hover:cursor-pointer"
                src="/icons/delete-event.svg"
                name="Delete icon"
                onClick={onDelete}
              />
            )}
          <ImageRound
            className="mt-1 w-3 h-[14px] hover:cursor-pointer"
            src="/icons/drawer-close-white.svg"
            name="Close icon"
            onClick={() => {
              resetDataCategoryOptions();
              reset();
              onClose();
            }}
          />
        </div>
      </header>
      <form
        ref={modalRef}
        onSubmit={handleSubmit(onSubmitData)}
        className="px-9 pb-8 !h-[calc(100vh_-_150px)] overflow-y-auto">
        <header className="flex sticky z-[100] top-[0px] pb-[35px] pt-10 items-center gap-2 justify-between bg-white">
          {/* Prevent default focus with fake input */}
          <input
            id="someOtherElement"
            className="opacity-0 someOtherElement absolute top-0 w-0 h-0"
            ref={inputRef}
          />
          <div className="flex-grow text-lg font-normal">
            <Input
              disabled={isCheckActionPermission}
              autoCompleteInput
              placeholder="タスクのタイトル"
              className="shadow-none text-2xl  leading-[56px] font-bold !pl-3 flex items-centers !py-0 h-[46px] focus:!shadow-none focus:border !border-[#77858F] rounded-md"
              register={register('title', {
                required: watch('title') !== null ? true : false,
                maxLength: {
                  value: 255,
                  message: ERROR_LONG_FIELD_MESSAGE,
                },
                onChange: () => {
                  setIsFormTouched(true);
                },
              })}
              error={errors.title?.message}
            />
          </div>
          <div className="flex gap-2 items-center">
            {((isPermissionAdd && action === TemplateAction.CREATE) ||
              (isPermissionUpdate && action === TemplateAction.EDIT)) && (
              <Button
                type="submit"
                disabled={action === TemplateAction.EDIT && !isFormTouched}
                className="w-[86px] h-[36px] !text-sm !px-0">
                保存
              </Button>
            )}
            <Button
              variant="outline"
              type="button"
              onClick={onClose}
              className="w-[86px] !rounded-md  h-[34px] !text-sm !px-0">
              キャンセル
            </Button>
          </div>
        </header>
        <div className="text-xs font-normal flex flex-col gap-[35px]">
          <div className="flex flex-col gap-[10px]">
            {/* Organization */}
            <div className="flex gap-[10px] items-center">
              <div className="w-full max-w-[100px]"></div>
              <div className="w-full max-w-[515px]">
                <Controller
                  control={control}
                  name={'organization'}
                  render={({ field: { value, onChange } }) => (
                    <Dropdown
                      className="h-[34px] !py-1 text-sm max-w-[515px] border-[#77858F] rounded-md !border-none !shadow-none !w-fit !pl-0"
                      classNameTextData="!text-sm !w-fit"
                      classNameOption="!text-sm !w-fit max-w-[515px]"
                      classNameError="!text-xs !w-fit"
                      placeholder="選択してください"
                      disabled={isCheckActionPermission}
                      options={dataOptionsOrganizations}
                      selectedOption={dataOptionsOrganizations.find(
                        (element) => element.value === value?.value,
                      )}
                      onChange={(e) => {
                        if (e.value != watch('organization.value')) {
                          setValue('categories.LARGE', {
                            label: '',
                            value: '',
                          });
                          setValue('categories.MEDIUM', {
                            label: '',
                            value: '',
                          });
                          setValue('categories.SMALL', {
                            label: '',
                            value: '',
                          });
                          setDataOptionsCategoryLarge([]);
                          setDataOptionsCategorySmall([]);
                          setDataOptionsCategoryMedium([]);
                          setValue('tagIds', []);
                        }
                        setIsFormTouched(true);
                        onChange(e);
                      }}
                    />
                  )}
                />
              </div>
            </div>
            {/* Category */}
            <div className="flex  gap-[10px] items-start">
              <div className="w-full max-w-[100px] mt-2">業務の種類</div>
              <div className="w-full max-w-[515px] flex flex-col gap-2">
                {/* Category large */}
                <Controller
                  control={control}
                  name={'categories.LARGE'}
                  render={({ field: { value, onChange } }) => {
                    return (
                      <Dropdown
                        placeholder="大カテゴリ"
                        className="h-[34px] !py-1 text-sm !border-[#77858F] rounded-md !shadow-none"
                        classNameTextData="!text-sm"
                        classNameOption="!text-sm"
                        classNameError="!text-xs"
                        disabled={isCheckActionPermission}
                        options={removeDuplicateOptions(
                          dataOptionsCategoryLarge,
                        )}
                        selectedOption={dataOptionsCategoryLarge.find(
                          (element) => element.value === value?.value,
                        )}
                        onChange={(e) => {
                          if (e.value != watch('categories.LARGE.value')) {
                            setValue('categories.MEDIUM', {
                              label: '',
                              value: '',
                            });
                            setValue('categories.SMALL', {
                              label: '',
                              value: '',
                            });
                          }
                          setIsFormTouched(true);
                          onChange(e);
                        }}
                        error={errors.categories?.LARGE?.message}
                      />
                    );
                  }}
                />
                {/* Category medium */}
                {watch('organization')?.value &&
                  watch('categories.LARGE')?.value && (
                    <Controller
                      control={control}
                      name={'categories.MEDIUM'}
                      render={({ field: { value, onChange } }) => {
                        return (
                          <Dropdown
                            placeholder="中カテゴリ"
                            className="h-[34px] !py-1 text-sm !shadow-none"
                            classNameTextData="!text-sm"
                            classNameOption="!text-sm"
                            classNameError="!text-xs"
                            disabled={isCheckActionPermission}
                            options={removeDuplicateOptions(
                              dataOptionsCategoryMedium,
                            )}
                            selectedOption={dataOptionsCategoryMedium.find(
                              (element) => element.value === value?.value,
                            )}
                            onChange={(e) => {
                              if (e.value != watch('categories.MEDIUM.value')) {
                                setValue('categories.SMALL', {
                                  label: '',
                                  value: '',
                                });
                              }
                              setIsFormTouched(true);
                              onChange(e);
                            }}
                            error={errors.categories?.MEDIUM?.message}
                          />
                        );
                      }}
                    />
                  )}

                {/* Category small */}
                {watch('organization')?.value &&
                  watch('categories.MEDIUM')?.value && (
                    <Controller
                      control={control}
                      name={'categories.SMALL'}
                      render={({ field: { value, onChange } }) => (
                        <Dropdown
                          className="h-[34px] !py-1 text-sm !shadow-none"
                          classNameTextData="!text-sm"
                          classNameOption="!text-sm"
                          classNameError="!text-xs"
                          disabled={isCheckActionPermission}
                          options={removeDuplicateOptions(
                            dataOptionsCategorySmall,
                          )}
                          selectedOption={dataOptionsCategorySmall.find(
                            (element) => element.value === value?.value,
                          )}
                          placeholder="小カテゴリ"
                          onChange={(e) => {
                            setIsFormTouched(true);
                            onChange(e);
                          }}
                          error={errors.categories?.SMALL?.message}
                        />
                      )}
                    />
                  )}
              </div>
            </div>
          </div>
          {/* Tag */}
          <div className="flex  gap-[10px] items-start">
            <div className="w-full max-w-[100px] mt-2">タグ</div>
            <div className="w-full max-w-[518px]">
              <div className="flex gap-2 max-w-[518px]">
                <div className="w-[461px]">
                  <MultiSelectDropdown
                    className="!h-[34px]"
                    labelClass="!min-h-0 !text-sm"
                    valueClassName="!border-[#77858F]"
                    disabled={isCheckActionPermission}
                    options={dataOptionsTagIds}
                    customLabel={
                      (watch('tagIds') ?? []).filter((tag) => tag.value)
                        .length > 0
                        ? `${(watch('tagIds') ?? []).filter((tag) => tag.value).length}件選択中`
                        : UNREGISTERED
                    }
                    labelOptionClass="break-words w-[410px]"
                    selectedOptions={watch('tagIds') ?? []}
                    noDataClass="w-[461px]"
                    onChange={(selected) => {
                      let updatedTagIds = [];
                      const currentTagIds = getValues('tagIds') || [];
                      const foundItemIndex = currentTagIds.findIndex(
                        (tag) => tag.value == selected.value,
                      );
                      if (foundItemIndex == -1) {
                        updatedTagIds = [...currentTagIds, selected];
                      } else {
                        updatedTagIds = currentTagIds.filter(
                          (tag) => tag.value != selected.value,
                        );
                      }
                      setIsFormTouched(true);
                      setValue('tagIds', updatedTagIds);
                    }}
                  />
                  <div className="flex flex-wrap  gap-2 mt-2">
                    {watch('tagIds')?.filter((tag) => tag.value) &&
                      watch('tagIds')
                        ?.filter((tag) => !!tag.value)
                        ?.map((tag) => {
                          return (
                            <div
                              key={tag.value}
                              className="rounded-xl bg-[#EBF2F7] px-2.5 py-1.5 flex gap-2">
                              <p>{tag.label}</p>
                              <button
                                type="button"
                                className="text-gray-700 hover:text-gray-900"
                                onClick={() => {
                                  const currentTagIds =
                                    getValues('tagIds') || [];

                                  const updatedTagIds = [
                                    ...currentTagIds,
                                  ].filter(
                                    (item) =>
                                      Number(item.value) != Number(tag.value),
                                  );

                                  setIsFormTouched(true);
                                  setValue('tagIds', updatedTagIds);
                                }}>
                                ✕
                              </button>
                            </div>
                          );
                        })}
                  </div>
                </div>
                <div className="mb-[2.5px] w-12">
                  {!isCheckActionPermission && (
                    <Button
                      sz="sm"
                      variant="outline"
                      className="w-12 h-[34px] hover:opacity-70 !border-none !px-0 !rounded-md text-[13px] !bg-[#EBF1F7]"
                      type="button"
                      name="Remove TagId"
                      onClick={() => {
                        setIsFormTouched(true);
                        setValue('tagIds', []);
                      }}>
                      削除
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* Description */}
          <div>
            {showDescriptionSection ? (
              <>
                <div
                  className="flex gap-2 items-center bg-[#EBF1F7] p-2 rounded-md mb-[14px] hover:cursor-pointer"
                  onClick={() => setShowDescriptionSection(false)}>
                  <ImageRound
                    className="w-[17px] h-[17px] hover:cursor-pointer"
                    src="/icons/collapse-description.svg"
                    name="Collapse description icon"
                  />
                  <p className="text-primary">タスクについての詳細</p>
                </div>
                <TextAreaLink
                  disabled={isCheckActionPermission}
                  classNameCustom
                  initialValue={getValues('description') || ''}
                  onChange={(data) => {
                    setValue('description', data);
                    setIsFormTouched(true);
                  }}
                />
              </>
            ) : (
              <div
                className="flex gap-2 items-center bg-[#EBF1F7] p-2 rounded-md mb-3 hover:cursor-pointer"
                onClick={() => setShowDescriptionSection(true)}>
                <ImageRound
                  className="w-[17px] h-[17px] hover:cursor-pointer"
                  src="/icons/open-description.svg"
                  name="Open description icon"
                />
                <p className="text-primary">タスクについての詳細</p>
              </div>
            )}
          </div>
          {/* Todo list */}
          <div className="mb-3">
            {showTodoSection ? (
              <>
                <div
                  className="flex gap-2 items-center bg-[#EBF1F7] p-2 rounded-md mb-[14px] hover:cursor-pointer"
                  onClick={() => setShowTodoSection(false)}>
                  <ImageRound
                    className="w-[17px] h-[17px] hover:cursor-pointer"
                    src="/icons/collapse-description.svg"
                    name="Collapse description icon"
                  />
                  <p className="text-primary">To Do リストを作成</p>
                </div>
                <div>
                  <div className="mb-[14px]">
                    <Button
                      disabled={isCheckActionPermission}
                      type="button"
                      variant="outline"
                      className="!px-2 !py-1 !text-sm"
                      onClick={handleAddItem}>
                      To Do リストを作成
                    </Button>
                  </div>
                  <DragDropContext onDragEnd={handleOnDragEnd}>
                    <Droppable droppableId="todo-list">
                      {(provided) => (
                        <ul
                          className="flex flex-col "
                          {...provided.droppableProps}
                          ref={provided.innerRef}>
                          {todoList.map((todo, index) => (
                            <Draggable
                              isDragDisabled={isCheckActionPermission}
                              key={todo.id ? todo.id : todo.customId}
                              draggableId={
                                todo.id ? `${todo.id}` : `${todo.customId}`
                              }
                              index={index}>
                              {(provided, snapshot) => {
                                const draggableElement = (
                                  <>
                                    <li
                                      className={`mb-[6px] gap-3 flex items-center px-2.5 rounded-md bg-[#F8FAFC] ${snapshot.isDragging ? 'dragging' : ''}`}
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}>
                                      <div
                                        className="w-4 h-[42px] flex items-center justify-center"
                                        {...provided.dragHandleProps}>
                                        <ImageRound
                                          className="w-[6px] h-[10px] cursor-grab hover:cursor-pointer"
                                          src="/icons/drag.svg"
                                          name="drag item"
                                        />
                                      </div>
                                      <div className="w-5">
                                        {!isCheckActionPermission &&
                                        todo.isChecked ? (
                                          <ImageRound
                                            className="w-[19px] h-[17px] cursor-grab hover:cursor-pointer"
                                            src="/icons/complete-blue.svg"
                                            name="complete item"
                                            onClick={() => {
                                              handleCheck(index);
                                            }}
                                          />
                                        ) : (
                                          <ImageRound
                                            className="w-[19px] h-[17px] cursor-grab hover:cursor-pointer"
                                            src="/icons/complete.svg"
                                            name="complete item"
                                            onClick={() => {
                                              handleCheck(index);
                                            }}
                                          />
                                        )}
                                      </div>
                                      <TextareaAutosize
                                        defaultValue={todo.content}
                                        ref={(el) => {
                                          textareaRefs.current[index] = el;
                                        }}
                                        disabled={isCheckActionPermission}
                                        placeholder={DEFAULT_VALUE_TODO_LIST}
                                        onBlur={(
                                          e: React.ChangeEvent<HTMLTextAreaElement>,
                                        ) => {
                                          if (todo.id) {
                                            handleBlur({
                                              id: todo.id,
                                              content: e.target.value,
                                            });
                                          } else {
                                            handleBlur({
                                              customId: todo.customId,
                                              content: e.target.value,
                                            });
                                          }
                                        }}
                                        rows={3}
                                        className={`resize-none focus:outline-none ${todo.isChecked && 'line-through'} focus:shadow-none focus:border-none focus:ring-0 placeholder-gray-300 border-[#F8FAFC] bg-[#F8FAFC] shadow-none w-full rounded-md`}
                                      />
                                      <div className="mt-[2.5px]  ml-2 flex items-center">
                                        {!isCheckActionPermission && (
                                          <ImageRound
                                            className="!w-fit !h-fit hover:cursor-pointer"
                                            src="/icons/remove-item.svg"
                                            name="remove icon"
                                            onClick={() => {
                                              setIsFormTouched(true);
                                              if (todo.customId) {
                                                const listData =
                                                  todoList.filter(
                                                    (item) =>
                                                      item.customId !==
                                                      todo.customId,
                                                  );
                                                setTodoList([...listData]);
                                              } else if (todo.id) {
                                                const listData =
                                                  todoList.filter(
                                                    (item) =>
                                                      item.id !== todo.id,
                                                  );
                                                setTodoList([...listData]);
                                              }
                                            }}
                                          />
                                        )}
                                      </div>
                                    </li>
                                  </>
                                );
                                return snapshot.isDragging
                                  ? // eslint-disable-next-line import/no-named-as-default-member
                                    ReactDOM.createPortal(
                                      draggableElement,
                                      document.body,
                                    )
                                  : draggableElement;
                              }}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </ul>
                      )}
                    </Droppable>
                  </DragDropContext>
                </div>
              </>
            ) : (
              <div
                className="flex gap-2 items-center bg-[#EBF1F7] p-2 rounded-md mb-3 hover:cursor-pointer"
                onClick={() => setShowTodoSection(true)}>
                <ImageRound
                  className="w-[17px] h-[17px] hover:cursor-pointer"
                  src="/icons/open-description.svg"
                  name="Open description icon"
                />
                <p className="text-primary">To Do リストを作成</p>
              </div>
            )}
          </div>
          {((isPermissionAdd &&
            (action === ActionTask.COPY || action === ActionTask.CREATE)) ||
            (isPermissionUpdate && action === ActionTask.EDIT)) && (
            <div className="flex justify-center">
              <Button
                type="submit"
                disabled={action === ActionTask.EDIT && !isFormTouched}
                className="w-[200px] !rounded-md h-[46px] !text-sm !px-2">
                保存
              </Button>
            </div>
          )}
        </div>
      </form>
    </Drawer>
  );
};

export default ActionsTemplateModal;
