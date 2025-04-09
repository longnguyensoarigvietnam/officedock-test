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
import { useSession } from 'next-auth/react';
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
import TextArea from '@components/common/TextArea';
import ImageRound from '@components/common/ImageRound';
import Drawer from '@components/common/Drawers';
import MultiSelectDropdown from '@components/common/MultiSelectDropdown';

import { DEFAULT_VALUE_TODO_LIST } from '@constants/message';
import { COPY_MESSAGE, NO_OPTION_CATEGORY, UNREGISTERED } from '@constants';
import {
  ActionTask,
  EventWorkCategory,
  PermissionsSystem,
  TemplateAction,
} from '@constants/enums';

import { CategoryStructure } from '@interfaces/skills';
import { Template, TemplateFormData } from '@interfaces/template';
import { OptionDropdownType } from '@interfaces/common';
import {
  CreationDataTask,
  TaskErrorPerson,
  TaskFormData,
  TodoItem,
} from '@interfaces/task';

import { formatShowDateJapanese } from '@utils/date';
import {
  hasPermissionInArray,
  showModalHeaderBackgroundColorByTime,
} from '@utils';

import useCreationDataStatisticTeam from '@hooks/useCreationDataStatisticTeam';

export type ActionTemplateModalProps = {
  open: boolean;
  dataTemplate?: Template | null;
  action?: string;
  peopleDefaultId?: string;
  creationDataTaskData: CreationDataTask | undefined;
  disableDeleteAction?: boolean;
  onDelete?: () => void;
  onClose: () => void;
  onSubmit?: (values: TaskFormData) => void;
  onEdit?: (values: TaskFormData) => void;
  onCopy?: (values: TaskFormData) => void;
  setDataErrorTask?: Dispatch<SetStateAction<TaskErrorPerson | undefined>>;
};

const ActionsTemplateModal = ({
  open,
  action = 'CREATE',
  dataTemplate,
  creationDataTaskData,
  disableDeleteAction,
  onEdit,
  onSubmit,
  onClose,
  onDelete,
}: ActionTemplateModalProps) => {
  const { data: session } = useSession();

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
      label: NO_OPTION_CATEGORY,
      value: NO_OPTION_CATEGORY,
    },
  ]);
  const [dataOptionsCategoryMedium, setDataOptionsCategoryMedium] = useState<
    OptionDropdownType[]
  >([
    {
      label: NO_OPTION_CATEGORY,
      value: NO_OPTION_CATEGORY,
    },
  ]);
  const [dataOptionsCategoryLarge, setDataOptionsCategoryLarge] = useState<
    OptionDropdownType[]
  >([
    {
      label: NO_OPTION_CATEGORY,
      value: NO_OPTION_CATEGORY,
    },
  ]);

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

  const { refetchCreationDataStatistic } = useCreationDataStatisticTeam({
    organization_id: organizationValue ? String(organizationValue) : '',
    isTeam: true,
    onSuccess: (data) => {
      if (!data) return;

      const organizationCategories = data.organization.statisticCategories.map(
        (category) => {
          const largeCategory = category.LARGE || {
            id: NO_OPTION_CATEGORY,
            name: NO_OPTION_CATEGORY,
            uuid: '',
          };

          const mediumCategories = (category.MEDIUM || []).map(
            (mediumCategory) => {
              const mediumCategoryField = mediumCategory.MEDIUM || {
                id: NO_OPTION_CATEGORY,
                name: NO_OPTION_CATEGORY,
                uuid: '',
              };
              const smallCategories = mediumCategory.SMALL || [
                { id: NO_OPTION_CATEGORY, name: NO_OPTION_CATEGORY, uuid: '' },
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
        const largeCategories: OptionDropdownType[] = [
          {
            label: NO_OPTION_CATEGORY,
            value: NO_OPTION_CATEGORY,
          },
        ];
        data.organization.statisticCategories.map((category) => {
          if (category.LARGE) {
            largeCategories.push({
              label: category.LARGE.name,
              value: category.LARGE.id,
            });
          }
        });
        return largeCategories;
      });
      setDataOptionsTagIds(
        data.tags.map((org) => ({
          label: String(org.name),
          value: String(org.id),
        })),
      );
    },
  });

  useEffect(() => {
    if (organizationValue) {
      refetchCreationDataStatistic();
    }
  }, [organizationValue, refetchCreationDataStatistic]);

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
            : NO_OPTION_CATEGORY,
          value: firstLargeCategory
            ? (firstLargeCategory?.id as number)
            : NO_OPTION_CATEGORY,
        }),
          (value.categories.MEDIUM = {
            label: firstMediumCategory
              ? (firstMediumCategory?.name as string)
              : NO_OPTION_CATEGORY,
            value: firstMediumCategory
              ? (firstMediumCategory?.id as number)
              : NO_OPTION_CATEGORY,
          }),
          (value.categories.SMALL = {
            label: firstSmallCategory
              ? (firstSmallCategory?.name as string)
              : NO_OPTION_CATEGORY,
            value: firstSmallCategory
              ? (firstSmallCategory?.id as number)
              : NO_OPTION_CATEGORY,
          });
      }
    }
    return value;
  }, [action, dataTemplate, session?.user.id, session?.user.profile.fullName]);

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

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
          label: NO_OPTION_CATEGORY,
          value: NO_OPTION_CATEGORY,
        },
      ]);
      return;
    }

    const selectedLargeCategory = dataOrganizationCategories.find(
      (category) => category.LARGE.id == watch('categories.LARGE.value'),
    );

    const initialMediumCategory: OptionDropdownType[] = [
      {
        label: NO_OPTION_CATEGORY,
        value: NO_OPTION_CATEGORY,
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
          label: NO_OPTION_CATEGORY,
          value: NO_OPTION_CATEGORY,
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
        label: NO_OPTION_CATEGORY,
        value: NO_OPTION_CATEGORY,
      },
    ];
    if (selectedMediumCategoryOption) {
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

  // Save data from create task
  useEffect(() => {
    if (creationDataTaskData) {
      setDataOptionsOrganizations(
        creationDataTaskData.organizations.map((org) => ({
          label: org.name,
          value: org.id as number,
        })),
      );
    }
  }, [creationDataTaskData]);

  const selectedOrganization = watch('organization');

  useEffect(() => {
    if (selectedOrganization && creationDataTaskData) {
      const organizationTags =
        creationDataTaskData.organizations.find(
          (org) => org.id === selectedOrganization.value,
        )?.tags || [];

      setDataOptionsTagIds(
        organizationTags.map((tag) => ({
          label: tag.name,
          value: tag.id,
        })),
      );
    }
  }, [selectedOrganization, creationDataTaskData, setValue]);

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
        onEdit &&
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
        label: NO_OPTION_CATEGORY,
        value: NO_OPTION_CATEGORY,
      },
    ]);
    setDataOptionsCategoryMedium([
      {
        label: NO_OPTION_CATEGORY,
        value: NO_OPTION_CATEGORY,
      },
    ]);
    setDataOptionsCategorySmall([
      {
        label: NO_OPTION_CATEGORY,
        value: NO_OPTION_CATEGORY,
      },
    ]);
  };

  return (
    <Drawer
      open={open}
      className="font-primary  bg-white h-screen w-[700px] !rounded-tl-xl !p-0"
      onClose={() => {
        resetDataCategoryOptions();
        reset();
        onClose();
      }}>
      <header
        className="px-8 rounded-tl-xl h-[50px] flex items-center justify-between"
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
          />
        </div>
      </header>
      <form
        ref={modalRef}
        onSubmit={handleSubmit(onSubmitData)}
        className="px-8 pb-8 h-[calc(100%_-_150px)] overflow-y-auto">
        <header className="flex sticky z-[100] top-[0px] pb-5 pt-[30px] items-center gap-2 justify-between bg-white">
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
              })}
              error={errors.title?.message}
            />
          </div>
          <div className="flex gap-2 items-center">
            {isPermissionAdd && action === TemplateAction.CREATE && (
              <Button
                type="submit"
                className="w-[82px] h-[36px] !text-[12px] !px-2">
                保存
              </Button>
            )}
            {isPermissionUpdate && action === TemplateAction.EDIT && (
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
          {/* Organization */}
          <div className="flex gap-[10px] items-center">
            <div className="w-full max-w-[100px]"></div>
            <div className="w-full max-w-[515px]">
              <Controller
                control={control}
                name={'organization'}
                render={({ field: { value, onChange } }) => (
                  <Dropdown
                    className="h-[34px] !py-1 text-xs max-w-[515px] border-[#77858F] rounded-md !border-none !shadow-none !w-fit !pl-0"
                    classNameTextData="!text-xs !w-fit"
                    classNameOption="!text-xs !w-fit max-w-[515px]"
                    classNameError="!text-xs !w-fit"
                    placeholder="選択してください"
                    disabled={isCheckActionPermission}
                    options={dataOptionsOrganizations}
                    selectedOption={dataOptionsOrganizations.find(
                      (element) => element.value === value?.value,
                    )}
                    onChange={(e) => {
                      if (e.value != watch('organization.value')) {
                        setValue('categories.LARGE', { label: '', value: '' });
                        setValue('categories.MEDIUM', { label: '', value: '' });
                        setValue('categories.SMALL', { label: '', value: '' });
                        setDataOptionsCategoryLarge([]);
                        setDataOptionsCategorySmall([]);
                        setDataOptionsCategoryMedium([]);
                        setValue('tagIds', []);
                      }
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
            <div className="w-full max-w-[515px] flex flex-col gap-4">
              {/* Category large */}
              <Controller
                control={control}
                name={'categories.LARGE'}
                render={({ field: { value, onChange } }) => {
                  return (
                    <Dropdown
                      placeholder="大カテゴリー"
                      className="h-[34px] !py-1 text-xs !border-[#77858F] rounded-md"
                      classNameTextData="!text-xs"
                      classNameOption="!text-xs"
                      classNameError="!text-xs"
                      disabled={isCheckActionPermission}
                      options={dataOptionsCategoryLarge}
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
                        onChange(e);
                      }}
                      error={errors.categories?.LARGE?.message}
                    />
                  );
                }}
              />
              {/* Category medium */}
              <Controller
                control={control}
                name={'categories.MEDIUM'}
                render={({ field: { value, onChange } }) => {
                  return (
                    <Dropdown
                      placeholder="中カテゴリ"
                      className="h-[34px] !py-1 text-xs"
                      classNameTextData="!text-xs"
                      classNameOption="!text-xs"
                      classNameError="!text-xs"
                      disabled={isCheckActionPermission}
                      options={dataOptionsCategoryMedium}
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
                        onChange(e);
                      }}
                      error={errors.categories?.MEDIUM?.message}
                    />
                  );
                }}
              />

              {/* Category small */}
              <Controller
                control={control}
                name={'categories.SMALL'}
                render={({ field: { value, onChange } }) => (
                  <Dropdown
                    className="h-[34px] !py-1 text-xs"
                    classNameTextData="!text-xs"
                    classNameOption="!text-xs"
                    classNameError="!text-xs"
                    disabled={isCheckActionPermission}
                    options={dataOptionsCategorySmall}
                    selectedOption={dataOptionsCategorySmall.find(
                      (element) => element.value === value?.value,
                    )}
                    placeholder="小カテゴリ"
                    onChange={(e) => {
                      onChange(e);
                    }}
                    error={errors.categories?.SMALL?.message}
                  />
                )}
              />
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
                  className="flex gap-2 items-center bg-[#EBF1F7] p-2 rounded-md mb-3 hover:cursor-pointer"
                  onClick={() => setShowDescriptionSection(false)}>
                  <ImageRound
                    className="w-[17px] h-[17px] hover:cursor-pointer"
                    src="/icons/collapse-description.svg"
                    name="Collapse description icon"
                  />
                  <p className="text-[#0068B6]">タスクについての詳細</p>
                </div>
                <TextArea
                  disabled={isCheckActionPermission}
                  register={Object.assign(register('description'))}
                  className="resize-none"
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
                <p className="text-[#0068B6]">タスクについての詳細</p>
              </div>
            )}
          </div>
          {/* Todo list */}
          <div className="mb-3">
            {showTodoSection ? (
              <>
                <div
                  className="flex gap-2 items-center bg-[#EBF1F7] p-2 rounded-md mb-3 hover:cursor-pointer"
                  onClick={() => setShowTodoSection(false)}>
                  <ImageRound
                    className="w-[17px] h-[17px] hover:cursor-pointer"
                    src="/icons/collapse-description.svg"
                    name="Collapse description icon"
                  />
                  <p className="text-[#0068B6]">To Do リストを作成</p>
                </div>
                <div>
                  <div className="mb-4">
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
                                      className={`mb-2 gap-3 flex items-center px-2.5 rounded-md bg-[#F8FAFC] ${snapshot.isDragging ? 'dragging' : ''}`}
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
                                        className="resize-none focus:outline-none focus:shadow-none focus:border-none focus:ring-0 placeholder-gray-300 border-[#F8FAFC] bg-[#F8FAFC] shadow-none w-full rounded-md"
                                      />
                                      <div className="mt-[2.5px] ml-2 flex items-center">
                                        {!isCheckActionPermission && (
                                          <ImageRound
                                            className="w-[16px] h-[10px] opacity-40 hover:cursor-pointer"
                                            src="/icons/zoom-out.svg"
                                            name="remove icon"
                                            onClick={() => {
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
                                  ? ReactDOM.createPortal(
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
                <p className="text-[#0068B6]">To Do リストを作成</p>
              </div>
            )}
          </div>
          {isPermissionAdd &&
            (action === ActionTask.COPY || action === ActionTask.CREATE) && (
              <div className="flex justify-center">
                <Button
                  type="submit"
                  className="w-[200px] !rounded-md h-[46] !text-[15px] !px-2">
                  保存
                </Button>
              </div>
            )}
          {isPermissionUpdate && action === ActionTask.EDIT && (
            <div className="flex justify-center">
              <Button
                type="submit"
                className="w-[200px] !rounded-md h-[46] !text-[15px] !px-2">
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
