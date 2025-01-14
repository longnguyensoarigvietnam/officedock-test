'use client';
import React, {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Controller,
  SubmitHandler,
  useFieldArray,
  useForm,
  useWatch,
} from 'react-hook-form';
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
import Switch from '@components/common/Switch';
import Checkbox from '@components/common/Checkbox';
import Drawer from '@components/common/Drawers';

import { DEFAULT_VALUE_TODO_LIST } from '@constants/message';
import { COPY_MESSAGE, NO_OPTION_CATEGORY } from '@constants';
import {
  ActionTask,
  EventWorkCategory,
  PermissionsSystem,
  TemplateAction,
} from '@constants/enums';
import { OptionDropdownType } from '@interfaces/common';
import {
  CreationDataTask,
  TaskErrorPerson,
  TaskFormData,
  TodoItem,
} from '@interfaces/task';

import { formatShowDateJapanese } from '@utils/date';
import { hasPermissionInArray } from '@utils';
import useOrganizationStatisticCategories from '@hooks/useOrganizationStatisticCategories';
import { CategoryStructure } from '@interfaces/skills';
import { Template, TemplateFormData } from '@interfaces/template';

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
  peopleDefaultId,
  creationDataTaskData,
  disableDeleteAction = false,
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

  const [selectedTagIdsOptions, setSelectedTagIdsOptions] = useState<
    OptionDropdownType[]
  >([]);
  const [unSelectedTagIdsOptions, setUnSelectedTagIdsOptions] = useState<
    OptionDropdownType[]
  >([]);

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

  const { refetchOrganizationStatisticCategories } =
    useOrganizationStatisticCategories({
      organizationId: Number(organizationValue),
      condition: [Boolean(organizationValue)],
      onSuccess: (data) => {
        const organizationCategories = data.map((category) => {
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
        });

        setDataOrganizationCategories(organizationCategories);
        setDataOptionsCategoryLarge(() => {
          const largeCategories: OptionDropdownType[] = [
            {
              label: NO_OPTION_CATEGORY,
              value: NO_OPTION_CATEGORY,
            },
          ];
          data.map((category) => {
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
    if (organizationValue) {
      refetchOrganizationStatisticCategories();
    }
  }, [organizationValue, refetchOrganizationStatisticCategories]);

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
  const {
    fields: projectFields,
    append: appendProject,
    remove: removeProject,
  } = useFieldArray({
    control,
    name: 'tagIds',
  });

  // If have option selected or remove option selected, update option for unselected options tagId
  useEffect(() => {
    const selectedValues = selectedTagIdsOptions.map(
      (element) => element.value,
    );
    const unSelectedOptions = dataOptionsTagIds.filter(
      (option) => !selectedValues.includes(option.value),
    );
    setUnSelectedTagIdsOptions(unSelectedOptions);
  }, [dataOptionsTagIds, selectedTagIdsOptions]);

  // Save data from create task
  useEffect(() => {
    if (creationDataTaskData) {
      setDataOptionsOrganizations(
        creationDataTaskData.organizations.map((org) => ({
          label: org.name,
          value: org.id as number,
        })),
      );
      setDataOptionsTagIds(
        creationDataTaskData.tags.map((org) => ({
          label: org.name,
          value: org.id,
        })),
      );
    }
  }, [creationDataTaskData]);

  useEffect(() => {
    if (dataTemplate) {
      if (dataTemplate.tags && dataTemplate.tags.length) {
        dataTemplate.tags.map((element) =>
          appendProject({
            label: element.name,
            value: element.id,
          }),
        );
      } else {
        appendProject({
          label: '',
          value: '',
        });
      }
    }
  }, [appendProject, dataTemplate, peopleDefaultId]);

  useEffect(() => {
    if (dataTemplate && dataTemplate.tags) {
      setSelectedTagIdsOptions(
        dataTemplate.tags.map((org) => ({
          label: org.name,
          value: org.id,
        })),
      );
    }
  }, [creationDataTaskData?.tags, dataTemplate, dataTemplate?.tags]);

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

  // Function handle selected option tagId
  const handleSelectedTagIds = useCallback(
    (index: number, option: OptionDropdownType) => {
      setSelectedTagIdsOptions((prevState) => {
        const existingElement = prevState?.[index];
        if (existingElement) {
          prevState.splice(index, 1);
        }
        return [...prevState, option];
      });
    },
    [],
  );

  // Function handle remove selected option Tag id
  const handleRemoveSelectedTagId = useCallback(
    (option: OptionDropdownType, index: number) => {
      setSelectedTagIdsOptions((prevState) =>
        prevState.filter((item) => item.value !== option.value),
      );
      removeProject(index);
    },
    [removeProject],
  );

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
      onClose={() => {}}>
      <header className="px-8 rounded-tl-xl h-[50px] bg-[#EBF1F4] flex items-center justify-between">
        <div className="flex text-sm items-center gap-4 text-[#A3B3BE]">
          <p className="">
            登録日{' '}
            {action === ActionTask.EDIT && dataTemplate?.createdAt
              ? formatShowDateJapanese(dataTemplate.createdAt)
              : formatShowDateJapanese(new Date())}
          </p>
        </div>
        <div className="flex gap-5 items-center ">
          <ImageRound
            className="mt-1 w-[13px] h-[15px] hover:cursor-pointer"
            src="/icons/share.svg"
            name="Close modal"
          />
          <ImageRound
            className="mt-1 h-[3px] w-[17px] hover:cursor-pointer"
            src="/icons/more.svg"
            name="Close modal"
          />
          <ImageRound
            className="mt-1 w-3 h-[14px] hover:cursor-pointer"
            src="/icons/drawer-close.svg"
            name="Close modal"
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
              className="shadow-none text-2xl  leading-[56px] font-bold !pl-3 flex items-centers !py-0 h-[46px] focus:!shadow-none focus:border border-[#77858F] rounded-md"
              register={register('title', {
                required: watch('title') !== null ? true : false,
              })}
              error={errors.title?.message}
            />
          </div>
          <div className="flex gap-2 items-center">
            <Button
              variant="secondary"
              type="button"
              onClick={onClose}
              className="w-[82px] !rounded-md  h-[34px] !text-[10px] !px-2">
              キャンセル
            </Button>
            {isPermissionAdd && action === TemplateAction.CREATE && (
              <Button
                type="submit"
                className="w-[48px] h-[34px] !text-[10px] !px-2">
                保存
              </Button>
            )}
            {isPermissionUpdate && action === TemplateAction.EDIT && (
              <Button
                type="submit"
                className="w-[48px] h-[34px] !text-[10px] !px-2">
                保存
              </Button>
            )}

            {!disableDeleteAction &&
              action === TemplateAction.EDIT &&
              session?.user.permissions &&
              hasPermissionInArray(
                session?.user.permissions,
                PermissionsSystem.MY_TASK_DELETE,
              ) && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onDelete}
                  className="w-[48px] h-8 !text-[10px] !px-2">
                  削除
                </Button>
              )}
          </div>
        </header>
        <div className="text-xs font-normal flex flex-col gap-4">
          {/* Organization */}
          <div className="flex gap-[10px] items-center">
            <div className="w-full max-w-[100px]">組織</div>
            <div className="w-full max-w-[515px]">
              <Controller
                control={control}
                name={'organization'}
                render={({ field: { value, onChange } }) => (
                  <Dropdown
                    className="h-[34px] !py-1 text-xs border-[#77858F] rounded-md"
                    classNameTextData="!text-xs"
                    classNameOption="!text-xs"
                    classNameError="!text-xs"
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
                      placeholder="大カテゴリ"
                      className="h-[34px] !py-1 text-xs border-[#77858F] rounded-md"
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
            <div className="w-full max-w-[100px] mt-2">集計タグ</div>
            <div className="w-full max-w-[518px]">
              {projectFields.map((field, index) => (
                <div className="flex gap-2 max-w-[518px]" key={field.id}>
                  <div className="w-[461px]">
                    <Controller
                      control={control}
                      name={`tagIds.${index}`}
                      render={({ field: { value, onChange } }) => {
                        return (
                          <Dropdown
                            placeholder="選択してください"
                            className="h-[34px] !py-1 text-xs border-[#77858F] rounded-mds"
                            classNameOption="!text-xs"
                            classNameTextData="!text-xs"
                            options={unSelectedTagIdsOptions}
                            disabled={isCheckActionPermission}
                            selectedOption={dataOptionsTagIds.find(
                              (element) => element.value === value?.value,
                            )}
                            onChange={(option: OptionDropdownType) => {
                              onChange(option);
                              handleSelectedTagIds(index, option);
                            }}
                            error={errors.tagIds?.[index]?.value?.message}
                          />
                        );
                      }}
                    />
                  </div>
                  <div className="mb-[2.5px] w-12">
                    {!isCheckActionPermission && (
                      <Button
                        sz="sm"
                        variant="outline"
                        className="w-12 h-[34px] hover:opacity-70 !border-none !px-0 !rounded-md text-[13px] !bg-[#DFE6EA]"
                        type="button"
                        name="Remove TagId"
                        onClick={() => {
                          handleRemoveSelectedTagId(
                            watch(`tagIds.${index}`),
                            index,
                          );
                        }}>
                        削除
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {!isCheckActionPermission && (
                <div className="text-right mt-4 flex justify-center">
                  <Button
                    sz="sm"
                    variant="outline"
                    className="w-6 h-6 text-xs mr-[54px] !py-0 !px-0 border-none !rounded-full !bg-[#ECF0F2] hover:opacity-70"
                    type="button"
                    onClick={() => appendProject({ label: '', value: '' })}>
                    <ImageRound
                      src="/icons/plus.svg"
                      name="Add organization"
                      className=" h-3 w-3"
                    />
                  </Button>
                </div>
              )}
            </div>
          </div>
          {/* isImportant */}
          <div className="flex  gap-[10px] items-center">
            <div className="w-full max-w-[100px]">重要</div>
            <div className="w-full max-w-48 ">
              <Controller
                control={control}
                name="isImportant"
                render={({ field: { value, onChange } }) => {
                  return (
                    <Switch
                      disabled={isCheckActionPermission}
                      customTranslate="!translate-x-[115%]"
                      enable={value}
                      onChange={(e) => {
                        onChange(e);
                      }}
                    />
                  );
                }}
              />
            </div>
          </div>
          {/* Description */}
          <div>
            <TextArea
              disabled={isCheckActionPermission}
              register={register('description')}
              label="タスクについての詳細"
            />
          </div>
          {/* Todo list */}
          <div>
            <div className="mb-4">
              <Button
                disabled={isCheckActionPermission}
                type="button"
                variant="outline"
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
                                className={`mb-2 gap-3 flex items-start ${snapshot.isDragging ? 'dragging' : ''}`}
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
                                <div className="w-3 h-3 mt-2">
                                  <Checkbox
                                    isChecked={todo.isChecked}
                                    disable={isCheckActionPermission}
                                    onChange={() => {
                                      handleCheck(index);
                                    }}
                                  />
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
                                  className="resize-none focus:outline-none focus:shadow-sm focus:border-focus focus:ring-0 placeholder-gray-300 border-gray-200 w-full rounded-md"
                                />
                                <div className="mt-[2.5px] ml-2 flex items-center">
                                  <Button
                                    sz="sm"
                                    variant="outline"
                                    className="w-20 h-[34px] text-xs ml-2"
                                    type="button"
                                    disabled={isCheckActionPermission}
                                    name="Remove organization"
                                    onClick={() => {
                                      if (todo.customId) {
                                        const listData = todoList.filter(
                                          (item) =>
                                            item.customId !== todo.customId,
                                        );
                                        setTodoList([...listData]);
                                      } else if (todo.id) {
                                        const listData = todoList.filter(
                                          (item) => item.id !== todo.id,
                                        );
                                        setTodoList([...listData]);
                                      }
                                    }}>
                                    削除
                                  </Button>
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
