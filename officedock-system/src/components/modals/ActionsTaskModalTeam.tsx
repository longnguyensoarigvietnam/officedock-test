'use client';
import {
  ChangeEvent,
  Dispatch,
  SetStateAction,
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
import { useSessionCache } from '@providers/SessionCacheProvider';

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
import ImageRound from '@components/common/ImageRound';
import ErrorMessage from '@components/common/ErrorMessage';
import PeopleDropdown from '@components/common/Dropdown/PeopleDropdown';
import Switch from '@components/common/Switch';
import TextAreaLink from '@components/common/TextAreaLink';
import Drawer from '@components/common/Drawers';
import DatePickerCustom from '@components/common/DatePicker/DatePickerCustom';
import MultiSelectDropdown from '@components/common/MultiSelectDropdown';

import {
  DEFAULT_VALUE_TODO_LIST,
  END_DATE_WRONG_SELECTED,
  ERROR_LONG_FIELD_MESSAGE,
  ERROR_PERSON_IN_CHART_START,
  ORGANIZATION_REQUIRED_MESSAGE,
  PEOPLE_IN_CHART_REQUIRED_MESSAGE,
  START_DATE_REQUIRED_SELECTED,
  STATUS_REQUIRED_MESSAGE,
} from '@constants/message';
import {
  COLUMN_ID_TASK,
  COPY_MESSAGE,
  DAY_OPTIONS,
  MONTH_OPTIONS,
  NO_SETTING,
  REPEAT_INTERVAL_OPTIONS,
  TASK_REPETITIVE_OPTIONS,
  UNREGISTERED,
  WEEKDAY_OPTIONS,
} from '@constants';
import {
  ActionTask,
  EventWorkCategory,
  PermissionsSystem,
  StatusValueTask,
  TaskRepetitiveType,
  TimeType,
} from '@constants/enums';
import { OptionDropdownType } from '@interfaces/common';
import {
  Task,
  TaskErrorPerson,
  TaskFormData,
  TodoItem,
} from '@interfaces/task';
import { CategoryStructure } from '@interfaces/skills';

import {
  convertDateToStartDate,
  convertToMinutes,
  convertToTimeString,
  formatShowDateJapanese,
  formatTime,
  formatTimeInput,
  generateTimeOptionsAsObjects,
} from '@utils/date';
import {
  generateOptionsCount,
  hasPermissionInArray,
  showModalHeaderBackgroundColorByTime,
} from '@utils';
import useCreationDataCommon from '@hooks/common/useCreationDataCommon';

export type ActionTaskModalProps = {
  open: boolean;
  dataTask?: Task | null;
  errorPerson?: TaskErrorPerson;
  action?: string;
  peopleDefaultId?: string;
  listMemberTeam: {
    id: number;
    fullName: string;
    color: string;
    avatarUrl: string;
  }[];
  organizationId: string | null;
  organizationTeamList: OptionDropdownType[];
  disableDeleteAction?: boolean;
  onDelete?: () => void;
  onClose: () => void;
  onWarning?: any;
  onSubmit?: (values: TaskFormData) => void;
  onEdit?: (values: TaskFormData) => void;
  onCopy?: (values: TaskFormData) => void;
  setDataErrorTask?: Dispatch<SetStateAction<TaskErrorPerson | undefined>>;
};

const ActionsTaskModalTeam = ({
  open,
  action = ActionTask.CREATE,
  dataTask,
  errorPerson,
  organizationId,
  peopleDefaultId,
  listMemberTeam,
  organizationTeamList,
  disableDeleteAction = false,
  onEdit,
  onSubmit,
  onClose,
  onCopy,
  onDelete,
  onWarning,
}: ActionTaskModalProps) => {
  const [minDatePlans, setMinDatePlans] = useState<{
    [key: number]: Date | null;
  }>({});
  const { data: session } = useSessionCache();

  const modalRef = useRef<HTMLFormElement | null>(null);

  const [todoList, setTodoList] = useState<TodoItem[]>([]);
  const textareaRefs = useRef<(HTMLTextAreaElement | null)[]>([]);

  const [dataOptionsStatus, setDataOptionsStatus] = useState<
    OptionDropdownType[]
  >([]);
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

  const [dataOptionsPeopleInCharge, setDataOptionsPeopleInCharge] = useState<
    OptionDropdownType[]
  >([]);

  const [selectedPersonInChargeOptions, setSelectedPersonInChargeOptions] =
    useState<OptionDropdownType[]>([]);

  const [showDescriptionSection, setShowDescriptionSection] =
    useState<boolean>(false);
  const [showAdvancedSettings, setShowAdvancedSettings] =
    useState<boolean>(false);
  const [showTodoSection, setShowTodoSection] = useState<boolean>(false);
  const [showDeadlineTimeSetting, setShowDeadlineTimeSetting] =
    useState<boolean>(false);
  const [isFormTouched, setIsFormTouched] = useState<boolean>(false);

  const [dataOptionsTagIds, setDataOptionsTagIds] = useState<
    OptionDropdownType[]
  >([]);

  const [isShowFieldRemind, setIsShowFieldRemind] = useState(false);

  const [isSubmit, setIsSubmit] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const optionsCountType = Object.keys(TimeType).map((key) => ({
    label: TimeType[key as keyof typeof TimeType],
    value: key,
  }));
  const optionsCountDown = generateOptionsCount(10);

  const {
    register,
    control,
    watch,
    reset,
    trigger,
    getValues,
    setValue,
    setError,
    handleSubmit,
    formState: { errors },
  } = useForm<TaskFormData>({
    mode: 'onSubmit',
    defaultValues: {
      peopleInChargeIds: dataTask ? [] : [{ label: '', value: '' }],
      tagIds: dataTask ? [] : [{ label: '', value: '' }],
      plans: [
        {
          planStartDate: null,
          planEndTime: '',
          planEndDate: null,
          planStartTime: '',
        },
      ],
      isImportant: dataTask?.isImportant || false,
    },
  });
  const currentDate = new Date();
  const optionTimeInput = generateTimeOptionsAsObjects();
  const organizationValue = useWatch({
    control,
    name: 'organization.value',
  });

  const defaultValues = useMemo<TaskFormData>(() => {
    const value: TaskFormData = {
      peopleInChargeIds: dataTask
        ? []
        : [
            {
              label: session?.user.profile.fullName || '',
              value: session?.user.id || '',
            },
          ],
      planEndDate: null,
      title: '',
      planStartDate: null,
      planStartTime: '',
      planEndTime: '',
      actualStartDate: null,
      actualStartTime: '',
      actualEndDate: null,
      actualEndTime: '',
      description: '',
      tagIds: dataTask ? [] : [{ label: '', value: '' }],
      deadlineDate: null,
      deadlineTime: '',
      deadlineRemindCountdown: {
        label: '1',
        value: 1,
      },

      deadlineRemindType: optionsCountType[0],
      type: {
        label: '',
        value: '',
      },
      statusId: null,
      priority: {
        label: '',
        value: '',
      },
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
      plans: [],

      repeatType: {
        label: TaskRepetitiveType.ONCE,
        value: String(
          TASK_REPETITIVE_OPTIONS.find(
            (option) => option.label == TaskRepetitiveType.ONCE,
          )?.value,
        ),
      },
      repeatInterval: undefined,
      repeatStartTime: '',
      repeatEndTime: '',
      month: undefined,
      monthDay: undefined,
      weekDay: undefined,
    };
    if (dataTask) {
      (value.id = `${dataTask.id}`),
        (value.title =
          action === ActionTask.COPY
            ? `${`${dataTask.title ? dataTask.title : ''}` + COPY_MESSAGE}`
            : dataTask.title),
        (value.description = dataTask.description),
        (value.isImportant = dataTask.isImportant || false),
        (value.type = {
          label: dataTask.type,
          value: dataTask.type,
        }),
        (value.statusId = {
          label: dataTask.status ? dataTask.status.name : '',
          value: dataTask.status ? (dataTask.status.id as number) : '',
        }),
        (value.organization = dataTask.organization
          ? {
              label: dataTask.organization.name,
              value: dataTask.organization.id as number,
            }
          : undefined),
        (value.priority = {
          label: dataTask.priority || '',
          value: dataTask.priority || '',
        }),
        (value.deadlineRemindCountdown = dataTask.remindCountdown
          ? {
              label: dataTask.remindCountdown,
              value: dataTask.remindCountdown || '',
            }
          : optionsCountDown[0]),
        (value.deadlineRemindType = dataTask.remindType
          ? {
              label: dataTask.remindType,
              value: dataTask.remindType,
            }
          : optionsCountType[0]),
        (value.deadlineDate = dataTask.deadline
          ? new Date(dataTask.deadline)
          : null),
        (value.deadlineTime =
          dataTask.deadline && dataTask.showDeadlineTime
            ? convertToTimeString(dataTask.deadline)
            : null);
      value.description = dataTask.description || '';

      value.repeatInterval = dataTask.repeatInterval
        ? {
            label: `${dataTask.repeatInterval}`,
            value: dataTask.repeatInterval,
          }
        : undefined;

      value.repeatType = dataTask.repeatType
        ? {
            label:
              TASK_REPETITIVE_OPTIONS.find(
                (option) => option.value == dataTask.repeatType,
              )?.label || '',
            value: dataTask.repeatType,
          }
        : undefined;

      value.repeatStartTime = dataTask.planStartDate
        ? convertToTimeString(dataTask.planStartDate)
        : '';
      value.repeatEndTime = dataTask.planEndDate
        ? convertToTimeString(dataTask.planEndDate)
        : '';

      value.month = dataTask.month
        ? {
            label: `${dataTask.month}`,
            value: dataTask.month,
          }
        : undefined;

      value.monthDay = dataTask.monthDay
        ? {
            label: `${dataTask.monthDay}`,
            value: dataTask.monthDay,
          }
        : undefined;

      value.weekDay =
        dataTask.weekDay != undefined && dataTask.weekDay != null
          ? {
              label: `${dataTask.weekDay}`,
              value: dataTask.weekDay,
            }
          : undefined;

      if (dataTask.tags) {
        value.tagIds = dataTask.tags.map((tag) => {
          return {
            label: String(tag.name),
            value: String(tag.id),
          };
        });
      }

      if (dataTask.peopleInCharge && dataTask.peopleInCharge.length > 0) {
        value.peopleInChart = {
          label: dataTask.peopleInCharge[0].fullName,
          value: dataTask.peopleInCharge[0].id,
        };
      } else {
        value.peopleInChart = {
          label: '担当者なし',
          value: '',
        };
      }

      if (dataTask.categories) {
        const firstLargeCategory = dataTask.categories.find(
          (item) => item.type === EventWorkCategory.LARGE,
        );
        const firstMediumCategory = dataTask.categories.find(
          (item) => item.type === EventWorkCategory.MEDIUM,
        );
        const firstSmallCategory = dataTask.categories.find(
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
    return value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, dataTask, session?.user.id, session?.user.profile.fullName]);

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);
  // Update columnId when create in column

  useEffect(() => {
    if (organizationId) {
      const valueOrganization = dataOptionsOrganizations.find(
        (element) => String(element.value) == organizationId,
      );
      if (valueOrganization && !dataTask) {
        setValue('organization', valueOrganization);
      }
    }
  }, [organizationId, dataTask, dataOptionsOrganizations, setValue]);

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

    const initialMediumCategory: OptionDropdownType[] = [];

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

    const initialSmallCategory: OptionDropdownType[] = [];
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

  const { fields, append } = useFieldArray({
    control,
    name: 'peopleInChargeIds',
  });
  const {
    fields: planFields,
    append: appendPlanField,
    remove: removePlanField,
  } = useFieldArray({
    control,
    name: 'plans',
  });

  // Save data people in charge from list member

  useEffect(() => {
    if (listMemberTeam) {
      setDataOptionsPeopleInCharge([
        {
          label: '担当者なし',
          value: '',
        },
        ...listMemberTeam.map((org) => ({
          label: org.fullName,
          value: org.id,
          imgUrl: org.avatarUrl,
          iconColor: org.color,
        })),
      ]);
    }
  }, [listMemberTeam]);
  useEffect(() => {
    if (dataOptionsStatus && !dataTask) {
      setValue('statusId', dataOptionsStatus[0]);
    }
  }, [dataOptionsStatus, dataTask, setValue]);

  // Default people
  useEffect(() => {
    if (peopleDefaultId && dataOptionsPeopleInCharge) {
      const newPeople = dataOptionsPeopleInCharge.find(
        (user) => String(user.value) == peopleDefaultId,
      );
      if (newPeople) {
        setValue('peopleInChart', newPeople);
      }
      if (peopleDefaultId === COLUMN_ID_TASK) {
        setValue('peopleInChart', {
          label: '担当者なし',
          value: '',
        });
      }
    }
  }, [peopleDefaultId, dataOptionsPeopleInCharge, setValue]);

  useEffect(() => {
    if (organizationTeamList) {
      setDataOptionsOrganizations(
        organizationTeamList.map((item) => ({
          label: item.label,
          value: item.value,
        })),
      );
    }
  }, [organizationTeamList]);

  useEffect(() => {
    if (dataTask) {
      if (dataTask.taskSchedules?.length) {
        dataTask.taskSchedules.map((plan) =>
          appendPlanField({
            scheduleId: plan.id || null,
            planStartDate: plan.planStartDate
              ? new Date(convertDateToStartDate(plan.planStartDate))
              : null,
            planStartTime: plan.planStartDate
              ? convertToTimeString(plan.planStartDate)
              : null,
            planEndDate: plan.planEndDate
              ? new Date(convertDateToStartDate(plan.planEndDate))
              : null,
            planEndTime: plan.planEndDate
              ? convertToTimeString(plan.planEndDate)
              : null,
          }),
        );
      } else {
        appendPlanField({
          planStartDate: null,
          planEndTime: '',
          planEndDate: null,
          planStartTime: '',
        });
      }

      if (dataTask.remindType && dataTask.remindType) {
        setIsShowFieldRemind(true);
      }
      if (dataTask.showDeadlineTime) {
        setShowDeadlineTimeSetting(true);
      }
      // Default focus input fake
      if (dataTask.peopleInCharge.length) {
        dataTask.peopleInCharge.map((element) =>
          append({
            label: element.fullName,
            value: element.id,
          }),
        );
      }
    } else {
      appendPlanField({
        planStartDate: null,
        planEndTime: '',
        planEndDate: null,
        planStartTime: '',
      });
    }
  }, [append, appendPlanField, dataTask]);

  const { isFetchingCreationDataCommon } = useCreationDataCommon({
    condition: [!!organizationValue],
    organizationId: organizationValue
      ? String(organizationValue)
      : organizationId || '',
    options: {
      get_task_status: true,
      get_organization_with_categories: true,
      get_tags: true,
    },
    onSuccess: (data) => {
      const listTag =
        data?.tags?.map((tag) => ({
          label: tag.name,
          value: tag.id,
        })) || [];

      setDataOptionsTagIds(listTag);
      setDataOptionsStatus(
        data.taskStatus?.map((org) => ({
          label: org.name,
          value: org.id as number,
        })) || [],
      );

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

  //Update option data people in charge when default data
  useEffect(() => {
    if (dataTask?.peopleInCharge) {
      setSelectedPersonInChargeOptions(
        dataTask.peopleInCharge.map((org) => ({
          label: org.fullName,
          value: org.id,
        })),
      );
    }
  }, [dataTask, dataTask?.tags]);

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
      if (planFields.length === 0 && !dataTask) {
        appendPlanField({
          planStartDate: null,
          planEndTime: '',
          planEndDate: null,
          planStartTime: '',
        });
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

  //Update error when error person
  useEffect(() => {
    if (errorPerson) {
      const index = selectedPersonInChargeOptions.findIndex(
        (field) => field.value == errorPerson.id,
      );
      if (index !== -1) {
        setError(`peopleInChargeIds.${index}.value`, {
          type: 'manual',
          message: ERROR_PERSON_IN_CHART_START,
        });
      }
    }
  }, [errorPerson, fields, selectedPersonInChargeOptions, setError]);

  const [time, setTime] = useState<string>('');

  type PlanFieldKeys =
    | `plans.${number}.planStartTime`
    | `plans.${number}.planEndTime`;

  const handleChange = (
    e: ChangeEvent<HTMLInputElement>,
    field: keyof TaskFormData | PlanFieldKeys,
  ): void => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 4) {
      value = value.substring(0, 4);
    }
    setTime(value);
    setValue(field, value);
  };
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
    if (dataTask && dataTask.todoList) {
      const newTodoList = dataTask.todoList.map((item) => {
        return {
          ...item,
          isChecked: item.checkedAt ? true : false,
        };
      });
      setTodoList(newTodoList);
    }
  }, [dataTask]);
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

  // Update minDate for plans
  const updateMinDatePlan = (index: number, date: Date | null) => {
    setMinDatePlans((prev) => ({
      ...prev,
      [index]: date,
    }));
  };
  const handleOnDragEnd = (result: DropResult): void => {
    if (!result.destination) return;
    setIsFormTouched(true);

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
              oldIdStatus: `${dataTask?.status?.id}`,
              oldNameStatus: `${dataTask?.status?.name}`,
              oldIdPeople:
                dataTask?.peopleInCharge && dataTask.peopleInCharge.length > 0
                  ? String(dataTask.peopleInCharge[0].id)
                  : '',
              deadlineRemindType: isShowFieldRemind
                ? data.deadlineRemindType
                : null,
              deadlineRemindCountdown: isShowFieldRemind
                ? data.deadlineRemindCountdown
                : null,
              showDeadlineTime: Boolean(watch('deadlineTime')),
            });
      }
      if (action === ActionTask.CREATE) {
        onSubmit &&
          onSubmit({
            ...data,
            todoList: todoList,
            tagIds: filteredTagIds,
            oldIdStatus: `${dataTask?.status?.id}`,
            deadlineRemindType: isShowFieldRemind
              ? data.deadlineRemindType
              : null,
            deadlineRemindCountdown: isShowFieldRemind
              ? data.deadlineRemindCountdown
              : null,
            showDeadlineTime: Boolean(watch('deadlineTime')),
          });
      }
      if (action === ActionTask.COPY) {
        onCopy &&
          onCopy({
            ...data,
            todoList: todoList,
            tagIds: filteredTagIds,
            oldIdStatus: `${dataTask?.status?.id}`,
            oldIdPeople:
              dataTask?.peopleInCharge && dataTask.peopleInCharge.length > 0
                ? String(dataTask.peopleInCharge[0].id)
                : '',
            deadlineRemindType: isShowFieldRemind
              ? data.deadlineRemindType
              : null,
            deadlineRemindCountdown: isShowFieldRemind
              ? data.deadlineRemindCountdown
              : null,
            showDeadlineTime: Boolean(watch('deadlineTime')),
          });
      }
    }
    setIsSubmit(false);
  };

  const isPermissionAdd = session?.user.permissions;
  const isPermissionUpdate = session?.user.permissions;

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
  const isRoutineTaskModal =
    dataTask && dataTask.status?.id === StatusValueTask.MY_ROUTINE;

  return (
    <Drawer
      open={open}
      className="font-primary  bg-white w-[700px] !rounded-l-[30px] !p-0"
      onClose={async () => {
        const isValid = await trigger();
        if (!isFormTouched) {
          resetDataCategoryOptions();
          reset();
          onClose();
        } else if (isValid) {
          const data = getValues();
          const filteredTagIds = (getValues('tagIds') || []).filter(
            (item): item is OptionDropdownType => item !== undefined,
          );
          let taskData = { ...data };
          if (action === ActionTask.EDIT) {
            taskData = {
              ...data,
              todoList: todoList,
              tagIds: filteredTagIds,
              oldIdStatus: `${dataTask?.status?.id}`,
              oldNameStatus: `${dataTask?.status?.name}`,
              oldIdPeople:
                dataTask?.peopleInCharge && dataTask.peopleInCharge.length > 0
                  ? String(dataTask.peopleInCharge[0].id)
                  : '',
              deadlineRemindType: isShowFieldRemind
                ? data.deadlineRemindType
                : null,
              deadlineRemindCountdown: isShowFieldRemind
                ? data.deadlineRemindCountdown
                : null,
              showDeadlineTime: Boolean(watch('deadlineTime')),
            };
          } else if (action === ActionTask.CREATE) {
            taskData = {
              ...data,
              todoList: todoList,
              tagIds: filteredTagIds,
              oldIdStatus: `${dataTask?.status?.id}`,
              deadlineRemindType: isShowFieldRemind
                ? data.deadlineRemindType
                : null,
              deadlineRemindCountdown: isShowFieldRemind
                ? data.deadlineRemindCountdown
                : null,
              showDeadlineTime: Boolean(watch('deadlineTime')),
            };
          } else if (action === ActionTask.COPY) {
            taskData = {
              ...data,
              todoList: todoList,
              tagIds: filteredTagIds,
              oldIdStatus: `${dataTask?.status?.id}`,
              oldIdPeople:
                dataTask?.peopleInCharge && dataTask.peopleInCharge.length > 0
                  ? String(dataTask.peopleInCharge[0].id)
                  : '',
              deadlineRemindType: isShowFieldRemind
                ? data.deadlineRemindType
                : null,
              deadlineRemindCountdown: isShowFieldRemind
                ? data.deadlineRemindCountdown
                : null,
              showDeadlineTime: Boolean(watch('deadlineTime')),
            };
          }
          onWarning &&
            onWarning({
              reset,
              resetDataCategoryOptions,
              taskData: {
                ...taskData,
                todoList: todoList,
                tagIds: filteredTagIds,
                oldIdStatus: `${dataTask?.status?.id}`,
                deadlineRemindType: isShowFieldRemind
                  ? taskData.deadlineRemindType
                  : null,
                deadlineRemindCountdown: isShowFieldRemind
                  ? taskData.deadlineRemindCountdown
                  : null,
                showDeadlineTime: Boolean(watch('deadlineTime')),
              },
              action,
            });
        }
      }}>
      <header
        className="px-8 rounded-tl-[30px] h-[50px] flex items-center justify-between"
        style={{
          background: showModalHeaderBackgroundColorByTime(),
        }}>
        <div className="flex text-sm items-center gap-4 text-white">
          <p className="">
            登録日{' '}
            {action === ActionTask.EDIT && dataTask?.createdAt
              ? formatShowDateJapanese(dataTask.createdAt)
              : formatShowDateJapanese(new Date())}
          </p>
          <div className=" h-3 mt-[2px] border-solid  border-r border-white"></div>
          <p className="">
            実施時間{' '}
            {action === 'EDIT' && dataTask?.taskDuration
              ? dataTask.taskDuration
              : formatTime(0)}
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
            action === 'EDIT' &&
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
        className="px-9 pb-8 h-[calc(100vh_-_150px)] overflow-y-auto">
        <header className="flex sticky z-[999] top-[0px] pb-[35px] pt-10 items-center gap-5 justify-between bg-white">
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
              className={`shadow-none text-2xl leading-[56px] font-bold !pl-3 flex items-center !py-0 h-[46px] focus:!shadow-none focus:border !border-[1px] rounded-md  ${!errors?.title ? '!border-[#77858F]' : '!border-error'}`}
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
            {isPermissionAdd &&
              (action === ActionTask.COPY || action === ActionTask.CREATE) && (
                <Button
                  type="submit"
                  disabled={!isFormTouched}
                  className="w-[86px] h-[36px] !text-sm !px-2">
                  保存
                </Button>
              )}
            {isPermissionUpdate && action === ActionTask.EDIT && (
              <Button
                type="submit"
                disabled={!isFormTouched}
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
          {/* People  */}
          <div className="flex gap-[10px] items-center">
            <div className="w-full max-w-[100px] text-[14px] font-medium">
              担当者
            </div>
            <div className="w-full max-w-[518px]">
              <Controller
                control={control}
                name={'peopleInChart'}
                render={({ field: { value, onChange } }) => (
                  <PeopleDropdown
                    className="h-[34px] !py-1 text-sm !border-[1px] !border-[#77858F] rounded-md"
                    classNameTextData="!text-sm"
                    classNameOption="!text-sm"
                    classNameError="!text-xs"
                    disabled={
                      dataTask?.isStart ||
                      (dataTask
                        ? dataTask.status?.id === StatusValueTask.COMPLETED
                        : false)
                    }
                    options={dataOptionsPeopleInCharge}
                    selectedOption={dataOptionsPeopleInCharge.find(
                      (element) => element.value === value?.value,
                    )}
                    onChange={(e) => {
                      setIsFormTouched(true);
                      onChange(e);
                    }}
                    error={errors.peopleInChart?.message}
                  />
                )}
                rules={{ required: PEOPLE_IN_CHART_REQUIRED_MESSAGE }}
              />
            </div>
          </div>
          <div className="flex flex-col gap-[10px]">
            {/* Organization */}
            <div className="flex gap-[10px] items-center">
              <div className="w-full max-w-[100px]"></div>
              <div className="w-full max-w-[525px]">
                <Controller
                  control={control}
                  name={'organization'}
                  rules={{ required: ORGANIZATION_REQUIRED_MESSAGE }}
                  render={({ field: { value, onChange } }) => (
                    <Dropdown
                      className="h-[34px] !py-1 text-sm max-w-[525px] rounded-md !border-none !shadow-none !w-fit !pl-0"
                      classNameTextData="!text-sm !w-fit"
                      classNameOption="!text-sm !w-fit max-w-[525px] !z-[998]"
                      classNameError="!text-xs !w-fit"
                      placeholder="選択してください"
                      disabled
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
                        }
                        setIsFormTouched(true);
                        setValue('tagIds', []);
                        onChange(e);
                      }}
                    />
                  )}
                />
                <ErrorMessage
                  error={errors.organization?.message}
                  className="text-xs"
                />
              </div>
            </div>
            {/* Category */}
            <div className="flex  gap-[10px] items-start">
              <div className="w-full max-w-[100px] mt-2 text-[14px] font-medium">
                業務の種類
              </div>
              <div className="w-full max-w-[525px] flex flex-col gap-2">
                {/* Category large */}
                <Controller
                  control={control}
                  name={'categories.LARGE'}
                  render={({ field: { value, onChange } }) => {
                    return (
                      <Dropdown
                        placeholder="大カテゴリ"
                        className="h-[34px] !py-1 text-sm !border-[1px] !shadow-none !border-[#77858F] rounded-md"
                        classNameTextData="!text-sm"
                        classNameOption="!text-sm !z-[998]"
                        classNameError="!text-xs"
                        isLoading={isFetchingCreationDataCommon}
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
                            className="h-[34px] !py-1 text-sm !shadow-none "
                            classNameTextData="!text-sm"
                            classNameOption="!text-sm !z-[998]"
                            classNameError="!text-xs"
                            isLoading={isFetchingCreationDataCommon}
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
                          classNameOption="!text-sm !z-[998]"
                          classNameError="!text-xs"
                          isLoading={isFetchingCreationDataCommon}
                          disabled={isCheckActionPermission}
                          options={dataOptionsCategorySmall}
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
            <div className="w-full max-w-[100px] mt-2 text-[14px] font-medium">
              タグ
            </div>
            <div className="w-full max-w-[518px]">
              <div className="flex gap-2 max-w-[518px]">
                <div className="w-[454px]">
                  <MultiSelectDropdown
                    className="!h-[34px]"
                    labelClass="!min-h-0 !text-sm"
                    valueClassName="!border-[1px] !border-[#77858F] !py-0 flex items-center"
                    optionClassName="!border-[1px] !border-[#77858F]"
                    disabled={isCheckActionPermission}
                    isLoading={isFetchingCreationDataCommon}
                    options={dataOptionsTagIds}
                    customLabel={
                      (watch('tagIds') ?? []).filter((tag) => tag.value)
                        .length > 0
                        ? `${(watch('tagIds') ?? []).filter((tag) => tag.value).length}件選択中`
                        : UNREGISTERED
                    }
                    noDataClass="w-[454px]"
                    labelOptionClass="break-words w-[410px]"
                    selectedOptions={watch('tagIds') ?? []}
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
                  <div className="flex flex-wrap gap-[10px] mt-2">
                    {watch('tagIds')?.filter((tag) => tag.value) &&
                      watch('tagIds')
                        ?.filter((tag) => !!tag.value)
                        ?.map((tag) => {
                          return (
                            <div
                              key={tag.value}
                              className="rounded-[20px] max-w-[525px] bg-[#EBF2F7] px-2.5 py-[7.5px] flex gap-[6px] items-center">
                              <p className="text-black text-xs font-medium leading-[1] w-full break-all">
                                {tag.label}
                              </p>
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
                                <ImageRound
                                  src={`/icons/close.svg`}
                                  name="Close icon"
                                  className="w-3 h-3"
                                />
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
          {/* Status */}
          {!isRoutineTaskModal && (
            <div
              style={{ zIndex: planFields.length + 2 }}
              className="flex gap-[10px] items-center">
              <div className="w-full max-w-[100px] text-[14px] font-medium">
                ステータス
              </div>
              <div className="w-full max-w-[180px]">
                <Controller
                  control={control}
                  name={'statusId'}
                  render={({ field: { value, onChange } }) => (
                    <Dropdown
                      className="h-[34px] !py-1 text-sm !border-[1px] !border-[#77858F] rounded-md"
                      classNameTextData="!text-sm"
                      classNameOption="!text-sm"
                      classNameError="!text-xs"
                      disabled={
                        isCheckActionPermission ||
                        (dataTask
                          ? dataTask.status?.id === StatusValueTask.MY_ROUTINE
                          : false) ||
                        (dataTask
                          ? dataTask.status?.id === StatusValueTask.COMPLETED
                          : false) ||
                        !!dataTask?.archivedAt
                      }
                      options={
                        dataTask?.status?.id !== StatusValueTask.COMPLETED
                          ? action === ActionTask.EDIT
                            ? dataOptionsStatus.filter(
                                (item) =>
                                  item.value !== StatusValueTask.MY_ROUTINE &&
                                  item.value !== StatusValueTask.COMPLETED,
                              )
                            : dataOptionsStatus.filter(
                                (item) =>
                                  item.value !== StatusValueTask.MY_ROUTINE,
                              )
                          : dataOptionsStatus.filter(
                              (item) =>
                                item.value !== StatusValueTask.MY_ROUTINE,
                            )
                      }
                      selectedOption={dataOptionsStatus.find(
                        (element) => element.value === value?.value,
                      )}
                      onChange={(e) => {
                        setIsFormTouched(true);
                        onChange(e);
                        if (e.value === StatusValueTask.MY_ROUTINE) {
                          setValue('deadlineDate', null);
                          setValue('deadlineTime', '');
                        }
                      }}
                      error={errors.statusId?.message}
                    />
                  )}
                  rules={{ required: STATUS_REQUIRED_MESSAGE }}
                />
              </div>
            </div>
          )}

          {/* isImportant */}
          <div className="flex  gap-[10px] items-center">
            <div className="w-full max-w-[100px] text-[14px] font-medium">
              重要
            </div>
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
                        setIsFormTouched(true);
                        onChange(e);
                      }}
                    />
                  );
                }}
              />
            </div>
          </div>
          {/* Deadline */}
          {!isRoutineTaskModal && (
            <div
              style={{ zIndex: planFields.length + 1 }}
              className="flex  relative gap-[10px] items-center">
              <div className="w-full max-w-[100px] text-[14px] font-medium">
                締切日時
              </div>
              <div className="w-full max-w-[525px] items-start flex gap-1 justify-between">
                <div className="max-w-[315px]">
                  <div className="flex gap-1 items-center">
                    <div className="w-[140px]">
                      <Controller
                        control={control}
                        name="deadlineDate"
                        render={({ field: { value, onChange } }) => (
                          <DatePickerCustom
                            disabled={isCheckActionPermission}
                            className="h-[34px] !px-2 !pl-[30px] !border-[1px] !border-[#77858F] rounded-md !text-xs !pt-2 text-center"
                            selected={value ? new Date(value) : null}
                            onChange={(e) => {
                              setIsFormTouched(true);
                              onChange(e);
                            }}
                          />
                        )}
                      />
                    </div>
                    {showDeadlineTimeSetting ? (
                      <div className="w-[72px] relative z-20">
                        <Input
                          isShowClockIcon={true}
                          type="text"
                          disabled={isCheckActionPermission}
                          valueInput={watch(`deadlineTime`)}
                          register={register('deadlineTime', {
                            required: Boolean(
                              isShowFieldRemind &&
                                watch('deadlineRemindCountdown') &&
                                watch('deadlineRemindType'),
                            ),
                            onChange: (e) => {
                              setIsFormTouched(true);
                              handleChange(e, 'deadlineTime');
                              if (getValues('deadlineDate') === null) {
                                setValue(
                                  'deadlineDate',
                                  (() => {
                                    const today: Date = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    return today;
                                  })(),
                                );
                              }
                            },
                            onBlur: () => {
                              if (time) {
                                setValue('deadlineTime', formatTimeInput(time));
                              }
                              setTime('');
                            },
                          })}
                          options={optionTimeInput}
                          onChangeDropdown={(e) => {
                            setIsFormTouched(true);
                            setValue('deadlineTime', e.label);
                            if (getValues('deadlineDate') === null) {
                              setValue(
                                'deadlineDate',
                                (() => {
                                  const today: Date = new Date();
                                  today.setHours(0, 0, 0, 0);
                                  return today;
                                })(),
                              );
                            }
                          }}
                          className={`h-[34px] !text-xs !pr-1 !pl-7 !border-[1px] rounded-md  ${!errors?.deadlineTime ? '!border-[#77858F]' : '!border-error'}`}
                        />
                      </div>
                    ) : (
                      <div
                        className="flex gap-1 items-center hover:cursor-pointer"
                        onClick={() => {
                          setShowDeadlineTimeSetting(true);
                        }}>
                        <ImageRound
                          className="h-[14px] w-[15px] hover:cursor-pointer"
                          src="/icons/clock-time.svg"
                          name="Clock icon"
                        />
                        <p className="text-[#77858F] text-xs font-medium">
                          締切時間を追加
                        </p>
                      </div>
                    )}

                    <div>
                      <ImageRound
                        onClick={() => {
                          setIsFormTouched(true);
                          setIsShowFieldRemind(!isShowFieldRemind);
                          if (!isShowFieldRemind) {
                            setShowDeadlineTimeSetting(true);
                          }
                        }}
                        src={`/icons/${isShowFieldRemind ? 'bell.svg' : 'bell-white.svg'}`}
                        name="Bell icon"
                        className="h-4 w-4"
                      />
                    </div>
                  </div>
                  <ErrorMessage
                    error={errors.deadlineTime?.message}
                    className="mt-[6px] text-xs"
                  />
                </div>
                {isShowFieldRemind ? (
                  <div>
                    <div className="flex items-center gap-1">
                      <div className="w-[56px]">
                        <Controller
                          control={control}
                          name="deadlineRemindCountdown"
                          render={({ field: { value, onChange } }) => (
                            <Dropdown
                              className="h-[34px] !py-1 !px-0 text-xs !border-[#77858F] rounded-md"
                              classNameTextData="!text-xs !ml-0"
                              labelOptionClass="!ml-0 !px-0 !pl-2 text-start w-full "
                              classNameOption="!text-xs !border border-[#77858F] !rounded-md"
                              classNameError="!text-xs"
                              classActive="justify-between"
                              labelClass="w-[80%]"
                              disabled={
                                isCheckActionPermission ||
                                watch('statusId')?.value ===
                                  StatusValueTask.MY_ROUTINE
                              }
                              options={optionsCountDown}
                              selectedOption={optionsCountDown.find(
                                (element) => element.value === value?.value,
                              )}
                              onChange={(e) => {
                                setIsFormTouched(true);
                                onChange(e);
                              }}
                              error={errors.statusId?.message}
                            />
                          )}
                        />
                      </div>
                      <div className="w-[82px] ">
                        <Controller
                          control={control}
                          name="deadlineRemindType"
                          render={({ field: { value, onChange } }) => (
                            <Dropdown
                              className="h-[34px] !py-1 !pr-2 text-xs !border-[#77858F] rounded-md"
                              classNameTextData="!text-xs"
                              classNameOption="!text-xs !ml-0 !border border-[#77858F] !rounded-md"
                              classNameError="!text-xs"
                              labelOptionClass="!ml-0 !px-0 !pl-2 text-start w-full  "
                              classActive=" justify-between"
                              labelClass="w-[80%]"
                              disabled={
                                isCheckActionPermission ||
                                watch('statusId')?.value ===
                                  StatusValueTask.MY_ROUTINE
                              }
                              options={optionsCountType}
                              selectedOption={optionsCountType.find(
                                (element) => element.value === value?.value,
                              )}
                              onChange={(e) => {
                                setIsFormTouched(true);
                                onChange(e);
                              }}
                              error={errors.statusId?.message}
                            />
                          )}
                        />
                      </div>
                      <p>に通知</p>
                    </div>
                    <ErrorMessage
                      error={errors.deadlineTime?.message}
                      className="mt-[6px] text-xs"
                    />
                  </div>
                ) : (
                  <div className="w-fit"></div>
                )}

                <div>
                  {!isCheckActionPermission && (
                    <Button
                      sz="sm"
                      variant="outline"
                      className="w-[48px] h-[34px] hover:opacity-70 !border-none !px-0 !rounded-md text-[13px] !bg-[#EBF1F7]"
                      type="button"
                      name="Remove deadline"
                      onClick={() => {
                        setIsFormTouched(true);
                        setValue('deadlineTime', '');
                        setValue('deadlineDate', null);
                        setValue('deadlineRemindCountdown', null);
                        setValue('deadlineRemindType', null);
                      }}>
                      削除
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
          <div className="flex gap-2 items-center">
            <div className="h-[1px] bg-[#D2DBE1] w-[calc((100%_-_125px)/2)]"></div>
            <div
              className="flex items-center w-[125px] justify-between hover:cursor-pointer"
              onClick={() => {
                setShowAdvancedSettings((prev) => !prev);
              }}>
              <p className="text-[#77858F] text-xs font-medium">
                {showAdvancedSettings
                  ? '詳細の設定を閉じる'
                  : '詳細の設定を表示'}
              </p>
              <div>
                <ImageRound
                  name="Arrow down icon"
                  src={'/icons/arrow-down.svg'}
                  className={`w-3 h-4 cursor-pointer ${showAdvancedSettings && 'rotate-180'} opacity-70`}
                />
              </div>
            </div>
            <div className="h-[1px] bg-[#D2DBE1] w-[calc((100%_-_122px)/2)]"></div>
          </div>
          {showAdvancedSettings && (
            <>
              {/* Plan date */}
              {!isRoutineTaskModal && (
                <div className="flex gap-[10px] items-start">
                  <div className="w-full max-w-[100px] mt-2 text-[14px] font-medium">
                    実施予定日時
                  </div>
                  <div className="w-full max-w-[525px] flex flex-col gap-1 items-start ">
                    {planFields.map((field, index) => {
                      return (
                        <div
                          key={field.id}
                          style={{ zIndex: planFields.length - index }}
                          className="w-full max-w-[525px] flex gap-2 items-start">
                          <div className="max-w-[220px]">
                            <div className="flex gap-1">
                              <div className="w-[140px]">
                                <Controller
                                  control={control}
                                  name={`plans.${index}.planStartDate`}
                                  rules={{
                                    required: watch(
                                      `plans.${index}.planEndDate`,
                                    )
                                      ? START_DATE_REQUIRED_SELECTED
                                      : false,
                                  }}
                                  render={({ field: { value, onChange } }) => {
                                    return (
                                      <DatePickerCustom
                                        className="h-[34px] !border-[1px] !border-[#77858F] rounded-md !px-2  !pl-[30px] !text-xs !pt-2 text-center"
                                        selected={
                                          value
                                            ? new Date(value)
                                            : watch(
                                                `plans.${index}.planStartDate`,
                                              )
                                        }
                                        disabled={
                                          isCheckActionPermission ||
                                          !!dataTask?.archivedAt
                                        }
                                        onChange={(e) => {
                                          setIsFormTouched(true);
                                          onChange(e);
                                          if (e !== null) {
                                            const newDate = new Date(
                                              e.getTime(),
                                            );
                                            updateMinDatePlan(index, newDate);
                                          } else {
                                            updateMinDatePlan(index, null);
                                          }
                                          if (
                                            !getValues(
                                              `plans.${index}.planStartTime`,
                                            )
                                          ) {
                                            setValue(
                                              `plans.${index}.planStartTime`,
                                              convertToTimeString(
                                                `${currentDate}`,
                                              ),
                                            );
                                          }
                                          setValue(
                                            `plans.${index}.planEndDate`,
                                            null,
                                          );
                                          setValue(
                                            `plans.${index}.planEndTime`,
                                            '',
                                          );
                                        }}
                                      />
                                    );
                                  }}
                                />
                              </div>
                              <div className="w-[72px] relative">
                                <Input
                                  isShowClockIcon={true}
                                  autoFocus={false}
                                  disabled={
                                    isCheckActionPermission ||
                                    !!dataTask?.archivedAt
                                  }
                                  valueInput={watch(
                                    `plans.${index}.planStartTime`,
                                  )}
                                  register={register(
                                    `plans.${index}.planStartTime`,
                                    {
                                      required:
                                        watch(
                                          `plans.${index}.planStartDate`,
                                        ) !== null
                                          ? true
                                          : false,
                                      onChange: (e) => {
                                        setIsFormTouched(true);
                                        handleChange(
                                          e,
                                          `plans.${index}.planStartTime`,
                                        );
                                        if (
                                          getValues(
                                            `plans.${index}.planStartDate`,
                                          ) === null
                                        ) {
                                          setValue(
                                            `plans.${index}.planStartDate`,
                                            (() => {
                                              const today: Date = new Date();
                                              today.setHours(0, 0, 0, 0);
                                              return today;
                                            })(),
                                          );
                                          setValue(
                                            `plans.${index}.planEndDate`,
                                            null,
                                          );
                                          setValue(
                                            `plans.${index}.planEndTime`,
                                            '',
                                          );
                                          updateMinDatePlan(index, new Date());
                                        }
                                      },
                                      onBlur: () => {
                                        if (time) {
                                          setValue(
                                            `plans.${index}.planStartTime`,
                                            formatTimeInput(time),
                                          );
                                        }
                                        setTime('');
                                      },
                                    },
                                  )}
                                  type="text"
                                  options={optionTimeInput}
                                  onChangeDropdown={(e) => {
                                    setIsFormTouched(true);
                                    setValue(
                                      `plans.${index}.planStartTime`,
                                      e.label,
                                    );
                                    if (
                                      getValues(
                                        `plans.${index}.planStartDate`,
                                      ) === null
                                    ) {
                                      setValue(
                                        `plans.${index}.planStartDate`,
                                        (() => {
                                          const today: Date = new Date();
                                          today.setHours(0, 0, 0, 0);
                                          return today;
                                        })(),
                                      );

                                      updateMinDatePlan(index, new Date());
                                    }
                                  }}
                                  className="h-[34px] !text-xs !pr-1 !pl-7 !border-[1px] !border-[#77858F] rounded-md"
                                />
                              </div>
                            </div>
                            <ErrorMessage
                              error={errors.planStartDate?.message}
                              className="mt-[6px] text-xs"
                            />
                          </div>
                          <div className="h-[34px] flex items-center">〜</div>
                          <div className="max-w-[220px]">
                            <div className="flex gap-1">
                              <div className="w-[140px]">
                                <Controller
                                  rules={{
                                    required: watch(
                                      `plans.${index}.planStartDate`,
                                    )
                                      ? END_DATE_WRONG_SELECTED
                                      : false,
                                  }}
                                  control={control}
                                  name={`plans.${index}.planEndDate`}
                                  render={({ field: { value, onChange } }) => (
                                    <DatePickerCustom
                                      className="h-[34px] !border-[1px] !border-[#77858F] rounded-md !px-2 !pl-[30px] !text-xs !pt-2 text-center"
                                      selected={
                                        value
                                          ? new Date(value)
                                          : watch(`plans.${index}.planEndDate`)
                                      }
                                      disabled={
                                        isCheckActionPermission ||
                                        !!dataTask?.archivedAt
                                      }
                                      minDate={
                                        watch(`plans.${index}.planStartDate`) ||
                                        minDatePlans[index]
                                      }
                                      onChange={(e) => {
                                        setIsFormTouched(true);
                                        onChange(e);
                                        if (
                                          !getValues(
                                            `plans.${index}.planEndTime`,
                                          )
                                        ) {
                                          setValue(
                                            `plans.${index}.planEndTime`,
                                            convertToTimeString(
                                              `${currentDate}`,
                                            ),
                                          );
                                        }
                                      }}
                                    />
                                  )}
                                />
                              </div>
                              <div className="w-[72px] relative">
                                <Input
                                  isShowClockIcon={true}
                                  disabled={
                                    isCheckActionPermission ||
                                    !!dataTask?.archivedAt
                                  }
                                  valueInput={watch(
                                    `plans.${index}.planEndTime`,
                                  )}
                                  register={register(
                                    `plans.${index}.planEndTime`,
                                    {
                                      required:
                                        watch(`plans.${index}.planEndDate`) !==
                                        null
                                          ? true
                                          : false,
                                      validate: (value) => {
                                        if (
                                          watch(
                                            `plans.${index}.planEndDate`,
                                          )?.getTime() ===
                                            watch(
                                              `plans.${index}.planStartDate`,
                                            )?.getTime() &&
                                          watch(
                                            `plans.${index}.planEndDate`,
                                          ) !== null
                                        ) {
                                          return (
                                            (value &&
                                              watch(
                                                `plans.${index}.planStartTime`,
                                              ) &&
                                              convertToMinutes(value) >
                                                convertToMinutes(
                                                  `${watch(`plans.${index}.planStartTime`)}`,
                                                )) ||
                                            END_DATE_WRONG_SELECTED
                                          );
                                        }
                                        return true;
                                      },
                                      onChange: (e) => {
                                        setIsFormTouched(true);
                                        handleChange(
                                          e,
                                          `plans.${index}.planEndTime`,
                                        );
                                        if (
                                          getValues(
                                            `plans.${index}.planEndDate`,
                                          ) === null
                                        ) {
                                          if (
                                            getValues(
                                              `plans.${index}.planStartDate`,
                                            ) !== null
                                          ) {
                                            setValue(
                                              `plans.${index}.planEndDate`,
                                              getValues(
                                                `plans.${index}.planStartDate`,
                                              ),
                                            );
                                          } else {
                                            setValue(
                                              `plans.${index}.planEndDate`,
                                              (() => {
                                                const today: Date = new Date();
                                                today.setHours(0, 0, 0, 0);
                                                return today;
                                              })(),
                                            );
                                          }
                                        }
                                      },
                                      onBlur: (e) => {
                                        if (time) {
                                          setValue(
                                            `plans.${index}.planEndTime`,
                                            formatTimeInput(time),
                                          );
                                        }
                                        if (
                                          watch(
                                            `plans.${index}.planEndDate`,
                                          )?.getTime() ===
                                            watch(
                                              `plans.${index}.planStartDate`,
                                            )?.getTime() &&
                                          watch(
                                            `plans.${index}.planEndDate`,
                                          ) !== null
                                        ) {
                                          if (
                                            e.target.value &&
                                            watch(
                                              `plans.${index}.planStartTime`,
                                            ) &&
                                            convertToMinutes(e.target.value) >
                                              convertToMinutes(
                                                `${watch(`plans.${index}.planStartTime`)}`,
                                              )
                                          ) {
                                            setError(
                                              `plans.${index}.planEndTime`,
                                              {
                                                message: '',
                                              },
                                            );
                                          } else {
                                            setError(
                                              `plans.${index}.planEndTime`,
                                              {
                                                message:
                                                  END_DATE_WRONG_SELECTED,
                                              },
                                            );
                                          }
                                        }

                                        setTime('');
                                      },
                                    },
                                  )}
                                  options={optionTimeInput}
                                  onChangeDropdown={(e) => {
                                    setIsFormTouched(true);
                                    setValue(
                                      `plans.${index}.planEndTime`,
                                      e.label,
                                    );
                                    if (
                                      getValues(
                                        `plans.${index}.planEndDate`,
                                      ) === null
                                    ) {
                                      if (
                                        getValues(
                                          `plans.${index}.planStartDate`,
                                        ) !== null
                                      ) {
                                        setValue(
                                          `plans.${index}.planEndDate`,
                                          getValues(
                                            `plans.${index}.planStartDate`,
                                          ),
                                        );
                                      } else {
                                        setValue(
                                          `plans.${index}.planEndDate`,
                                          (() => {
                                            const today: Date = new Date();
                                            today.setHours(0, 0, 0, 0);
                                            return today;
                                          })(),
                                        );
                                      }
                                    }
                                    if (
                                      watch(
                                        `plans.${index}.planEndDate`,
                                      )?.getTime() ===
                                        watch(
                                          `plans.${index}.planStartDate`,
                                        )?.getTime() &&
                                      watch(`plans.${index}.planEndDate`) !==
                                        null
                                    ) {
                                      if (
                                        e.label &&
                                        watch(`plans.${index}.planStartTime`) &&
                                        convertToMinutes(e.label) >
                                          convertToMinutes(
                                            `${watch(`plans.${index}.planStartTime`)}`,
                                          )
                                      ) {
                                        setError(`plans.${index}.planEndTime`, {
                                          message: '',
                                        });
                                      } else {
                                        setError(`plans.${index}.planEndTime`, {
                                          message: END_DATE_WRONG_SELECTED,
                                        });
                                      }
                                    }
                                  }}
                                  type="text"
                                  className="h-[34px] !text-xs !pr-1 !pl-7 !border-[1px] !border-[#77858F] rounded-md"
                                />
                              </div>
                            </div>
                            <ErrorMessage
                              error={
                                errors?.plans?.[index]?.planEndTime?.message ||
                                errors?.plans?.[index]?.planEndDate?.message
                              }
                              className="mt-[6px] text-xs"
                            />
                          </div>
                          <div>
                            {!isCheckActionPermission &&
                              !dataTask?.archivedAt && (
                                <Button
                                  sz="sm"
                                  variant="outline"
                                  className="w-[48px] h-[34px] hover:opacity-70 !border-none !px-0 !rounded-md text-[13px] !bg-[#EBF1F7]"
                                  type="button"
                                  name="Remove plan"
                                  onClick={() => {
                                    setIsFormTouched(true);
                                    removePlanField(index);
                                  }}>
                                  削除
                                </Button>
                              )}
                          </div>
                        </div>
                      );
                    })}
                    {!isCheckActionPermission && !dataTask?.archivedAt && (
                      <div className="text-right flex justify-center w-full mt-2 ">
                        <Button
                          sz="sm"
                          variant="outline"
                          className="w-6 h-6 mr-[54px] text-xs !py-0 !px-0 border-none !rounded-full !bg-[#ECF0F2] hover:opacity-70"
                          type="button"
                          onClick={async () => {
                            setIsFormTouched(true);
                            await appendPlanField({
                              planStartDate: null,
                              planStartTime: '',
                              planEndDate: null,
                              planEndTime: '',
                            });
                          }}>
                          <ImageRound
                            src="/icons/plus.svg"
                            name="Add organization"
                            className="h-3 w-3"
                          />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {isRoutineTaskModal && (
                <div className="flex gap-[10px] items-start">
                  <div className="w-full max-w-[100px] mt-2 text-[14px] font-medium">
                    実施予定日時
                  </div>
                  <div className="w-full max-w-[525px] flex flex-col gap-3 items-start">
                    <div className="w-full flex justify-between">
                      <div className="flex gap-3">
                        <div className="w-[140px]" style={{ zIndex: 500 }}>
                          <Controller
                            control={control}
                            name={'repeatType'}
                            rules={{
                              required: true,
                            }}
                            render={({ field: { onChange } }) => (
                              <Dropdown
                                className="h-[34px] !py-1 text-xs !border-[#77858F]"
                                classNameTextData="!text-xs"
                                classNameOption="!text-xs"
                                classNameError="!text-xs"
                                labelOptionClass="!pr-0"
                                disabled={isCheckActionPermission}
                                options={TASK_REPETITIVE_OPTIONS}
                                selectedOption={TASK_REPETITIVE_OPTIONS.find(
                                  (element) =>
                                    element.value ===
                                    watch('repeatType')?.value,
                                )}
                                onChange={(e) => {
                                  setIsFormTouched(true);
                                  onChange(e);
                                  setValue('repeatInterval', undefined);
                                  setValue('weekDay', undefined);
                                  setValue('monthDay', undefined);
                                  setValue('month', undefined);
                                  setValue('plans', [
                                    {
                                      planStartDate: null,
                                      planEndTime: '',
                                      planEndDate: null,
                                      planStartTime: '',
                                    },
                                  ]);
                                }}
                              />
                            )}
                          />
                        </div>
                        {watch('repeatType') &&
                          watch('repeatType')?.label ==
                            TaskRepetitiveType.DAILY && (
                            <div className="flex gap-2 items-center">
                              <Controller
                                control={control}
                                name={'repeatInterval'}
                                rules={{
                                  required: true,
                                }}
                                render={({ field: { onChange } }) => (
                                  <Dropdown
                                    className={`h-[34px] !w-[56px] !py-1 !pr-0 text-xs ${!errors?.repeatInterval ? '!border-[#77858F]' : '!border-error'}`}
                                    classNameTextData="!text-xs"
                                    classNameOption="!text-xs"
                                    classNameError="!text-xs"
                                    labelOptionClass="!pr-0"
                                    disabled={isCheckActionPermission}
                                    options={REPEAT_INTERVAL_OPTIONS}
                                    selectedOption={REPEAT_INTERVAL_OPTIONS.find(
                                      (element) =>
                                        element.value ===
                                        watch('repeatInterval')?.value,
                                    )}
                                    onChange={(e) => {
                                      setIsFormTouched(true);
                                      onChange(e);
                                    }}
                                  />
                                )}
                              />
                              <p className="text-sm font-normal whitespace-nowrap">
                                日ごと
                              </p>
                              <ErrorMessage
                                error={errors?.repeatInterval?.message}
                                className="mt-[-10px] text-xs"
                              />
                            </div>
                          )}
                        {watch('repeatType') &&
                          watch('repeatType')?.label ==
                            TaskRepetitiveType.WEEKLY && (
                            <div className="flex gap-2 items-center">
                              <Controller
                                control={control}
                                name={'weekDay'}
                                rules={{
                                  required: true,
                                }}
                                render={({ field: { onChange } }) => (
                                  <Dropdown
                                    className={`h-[34px] !w-[56px] !py-1 !pr-0 text-xs ${!errors?.weekDay ? '!border-[#77858F]' : '!border-error'}`}
                                    classNameTextData="!text-xs"
                                    classNameOption="!text-xs"
                                    classNameError="!text-xs"
                                    labelOptionClass="!pr-0"
                                    disabled={isCheckActionPermission}
                                    options={WEEKDAY_OPTIONS}
                                    selectedOption={
                                      watch('weekDay')?.value != null &&
                                      watch('weekDay')?.value != undefined
                                        ? WEEKDAY_OPTIONS.find(
                                            (element) =>
                                              element.value ===
                                              watch('weekDay')?.value,
                                          )
                                        : undefined
                                    }
                                    onChange={(e) => {
                                      setIsFormTouched(true);
                                      onChange(e);
                                    }}
                                  />
                                )}
                              />
                              <p className="text-sm font-normal whitespace-nowrap">
                                曜日
                              </p>
                              <Controller
                                control={control}
                                name={'repeatInterval'}
                                rules={{
                                  required: true,
                                }}
                                render={({ field: { onChange } }) => (
                                  <Dropdown
                                    className={`h-[34px] !w-[56px] !py-1 !pr-0 text-xs ${!errors?.repeatInterval ? '!border-[#77858F]' : '!border-error'}`}
                                    classNameTextData="!text-xs"
                                    classNameOption="!text-xs"
                                    classNameError="!text-xs"
                                    labelOptionClass="!pr-0"
                                    disabled={isCheckActionPermission}
                                    options={REPEAT_INTERVAL_OPTIONS}
                                    selectedOption={REPEAT_INTERVAL_OPTIONS.find(
                                      (element) =>
                                        element.value ===
                                        watch('repeatInterval')?.value,
                                    )}
                                    onChange={(e) => {
                                      setIsFormTouched(true);
                                      onChange(e);
                                    }}
                                  />
                                )}
                              />
                              <p className="text-sm font-normal whitespace-nowrap">
                                週間ごと
                              </p>
                            </div>
                          )}
                        {watch('repeatType') &&
                          watch('repeatType')?.label ==
                            TaskRepetitiveType.MONTHLY && (
                            <div className="flex gap-2 items-center">
                              <Controller
                                control={control}
                                name={'monthDay'}
                                rules={{
                                  required: true,
                                }}
                                render={({ field: { onChange } }) => (
                                  <Dropdown
                                    className={`h-[34px] !w-[56px] !py-1 !pr-0 text-xs ${!errors?.monthDay ? '!border-[#77858F]' : '!border-error'}`}
                                    classNameTextData="!text-xs"
                                    classNameOption="!text-xs"
                                    classNameError="!text-xs"
                                    labelOptionClass="!pr-0"
                                    disabled={isCheckActionPermission}
                                    options={DAY_OPTIONS}
                                    selectedOption={DAY_OPTIONS.find(
                                      (element) =>
                                        element.value ===
                                        watch('monthDay')?.value,
                                    )}
                                    onChange={(e) => {
                                      setIsFormTouched(true);
                                      onChange(e);
                                    }}
                                  />
                                )}
                              />
                              <p className="text-sm font-normal whitespace-nowrap">
                                日
                              </p>
                              <Controller
                                control={control}
                                name={'repeatInterval'}
                                rules={{
                                  required: true,
                                }}
                                render={({ field: { onChange } }) => (
                                  <Dropdown
                                    className={`h-[34px] !w-[56px] !py-1 !pr-0 text-xs ${!errors?.repeatInterval ? '!border-[#77858F]' : '!border-error'}`}
                                    classNameTextData="!text-xs"
                                    classNameOption="!text-xs"
                                    classNameError="!text-xs"
                                    labelOptionClass="!pr-0"
                                    disabled={isCheckActionPermission}
                                    options={REPEAT_INTERVAL_OPTIONS}
                                    selectedOption={REPEAT_INTERVAL_OPTIONS.find(
                                      (element) =>
                                        element.value ===
                                        watch('repeatInterval')?.value,
                                    )}
                                    onChange={(e) => {
                                      setIsFormTouched(true);
                                      onChange(e);
                                    }}
                                  />
                                )}
                              />
                              <p className="text-sm font-normal whitespace-nowrap">
                                ヶ月ごと
                              </p>
                            </div>
                          )}
                        {watch('repeatType') &&
                          watch('repeatType')?.label ==
                            TaskRepetitiveType.YEARLY && (
                            <div className="flex gap-2 items-center">
                              <Controller
                                control={control}
                                name={'month'}
                                rules={{
                                  required: true,
                                }}
                                render={({ field: { onChange } }) => (
                                  <Dropdown
                                    className={`h-[34px] !w-[56px] !py-1 !pr-0 text-xs ${!errors?.month ? '!border-[#77858F]' : '!border-error'}`}
                                    classNameTextData="!text-xs"
                                    classNameOption="!text-xs"
                                    classNameError="!text-xs"
                                    labelOptionClass="!pr-0"
                                    disabled={isCheckActionPermission}
                                    options={MONTH_OPTIONS}
                                    selectedOption={MONTH_OPTIONS.find(
                                      (element) =>
                                        element.value === watch('month')?.value,
                                    )}
                                    onChange={(e) => {
                                      setIsFormTouched(true);
                                      onChange(e);
                                    }}
                                  />
                                )}
                              />
                              <p className="text-sm font-normal whitespace-nowrap">
                                月
                              </p>
                              <Controller
                                control={control}
                                name={'monthDay'}
                                rules={{
                                  required: true,
                                }}
                                render={({ field: { onChange } }) => (
                                  <Dropdown
                                    className={`h-[34px] !w-[56px] !py-1 !pr-0 text-xs ${!errors?.monthDay ? '!border-[#77858F]' : '!border-error'}`}
                                    classNameTextData="!text-xs"
                                    classNameOption="!text-xs"
                                    classNameError="!text-xs"
                                    labelOptionClass="!pr-0"
                                    disabled={isCheckActionPermission}
                                    options={DAY_OPTIONS}
                                    selectedOption={DAY_OPTIONS.find(
                                      (element) =>
                                        element.value ===
                                        watch('monthDay')?.value,
                                    )}
                                    onChange={(e) => {
                                      setIsFormTouched(true);
                                      onChange(e);
                                    }}
                                  />
                                )}
                              />
                              <p className="text-sm font-normal whitespace-nowrap">
                                日
                              </p>
                              <Controller
                                control={control}
                                name={'repeatInterval'}
                                rules={{
                                  required: true,
                                }}
                                render={({ field: { onChange } }) => (
                                  <Dropdown
                                    className={`h-[34px] !w-[56px] !py-1 !pr-0 text-xs ${!errors?.repeatInterval ? '!border-[#77858F]' : '!border-error'}`}
                                    classNameTextData="!text-xs"
                                    classNameOption="!text-xs"
                                    classNameError="!text-xs"
                                    labelOptionClass="!pr-0"
                                    disabled={isCheckActionPermission}
                                    options={REPEAT_INTERVAL_OPTIONS}
                                    selectedOption={REPEAT_INTERVAL_OPTIONS.find(
                                      (element) =>
                                        element.value ===
                                        watch('repeatInterval')?.value,
                                    )}
                                    onChange={(e) => {
                                      setIsFormTouched(true);
                                      onChange(e);
                                    }}
                                  />
                                )}
                              />
                              <p className="text-sm font-normal whitespace-nowrap">
                                年ごと
                              </p>
                            </div>
                          )}
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
                              setValue('repeatType', undefined);
                              setValue('repeatInterval', undefined);
                              setValue('weekDay', undefined);
                              setValue('monthDay', undefined);
                              setValue('month', undefined);
                            }}>
                            削除
                          </Button>
                        )}
                      </div>
                    </div>
                    {watch('repeatType') &&
                    watch('repeatType')?.label == TaskRepetitiveType.ONCE ? (
                      <div className="w-full max-w-[525px] flex flex-col gap-1 items-start ">
                        {planFields.map((field, index) => {
                          return (
                            <div
                              key={field.id}
                              style={{ zIndex: planFields.length - index }}
                              className="w-full max-w-[525px] flex gap-2 items-start">
                              <div className="max-w-[220px]">
                                <div className="flex gap-1">
                                  <div className="w-[140px]">
                                    <Controller
                                      control={control}
                                      name={`plans.${index}.planStartDate`}
                                      rules={{
                                        required: watch(
                                          `plans.${index}.planEndDate`,
                                        )
                                          ? START_DATE_REQUIRED_SELECTED
                                          : false,
                                      }}
                                      render={({
                                        field: { value, onChange },
                                      }) => {
                                        return (
                                          <DatePickerCustom
                                            className="h-[34px] !border-[1px] !border-[#77858F] rounded-md !px-2 !pl-[30px] !text-xs !pt-2 text-center"
                                            selected={
                                              value
                                                ? new Date(value)
                                                : watch(
                                                    `plans.${index}.planStartDate`,
                                                  )
                                            }
                                            disabled={isCheckActionPermission}
                                            onChange={(e) => {
                                              setIsFormTouched(true);
                                              onChange(e);
                                              if (e !== null) {
                                                const newDate = new Date(
                                                  e.getTime(),
                                                );
                                                updateMinDatePlan(
                                                  index,
                                                  newDate,
                                                );
                                              } else {
                                                updateMinDatePlan(index, null);
                                              }
                                              if (
                                                !getValues(
                                                  `plans.${index}.planStartTime`,
                                                )
                                              ) {
                                                setValue(
                                                  `plans.${index}.planStartTime`,
                                                  convertToTimeString(
                                                    `${currentDate}`,
                                                  ),
                                                );
                                              }
                                              setValue(
                                                `plans.${index}.planEndDate`,
                                                null,
                                              );
                                              setValue(
                                                `plans.${index}.planEndTime`,
                                                '',
                                              );
                                            }}
                                          />
                                        );
                                      }}
                                    />
                                  </div>
                                  <div className="w-[72px] relative">
                                    <Input
                                      isShowClockIcon={true}
                                      autoFocus={false}
                                      disabled={isCheckActionPermission}
                                      valueInput={watch(
                                        `plans.${index}.planStartTime`,
                                      )}
                                      register={register(
                                        `plans.${index}.planStartTime`,
                                        {
                                          required:
                                            watch(
                                              `plans.${index}.planStartDate`,
                                            ) !== null
                                              ? true
                                              : false,
                                          onChange: (e) => {
                                            setIsFormTouched(true);
                                            handleChange(
                                              e,
                                              `plans.${index}.planStartTime`,
                                            );
                                            if (
                                              getValues(
                                                `plans.${index}.planStartDate`,
                                              ) === null
                                            ) {
                                              setValue(
                                                `plans.${index}.planStartDate`,
                                                (() => {
                                                  const today: Date =
                                                    new Date();
                                                  today.setHours(0, 0, 0, 0);
                                                  return today;
                                                })(),
                                              );
                                              setValue(
                                                `plans.${index}.planEndDate`,
                                                null,
                                              );
                                              setValue(
                                                `plans.${index}.planEndTime`,
                                                '',
                                              );
                                              updateMinDatePlan(
                                                index,
                                                new Date(),
                                              );
                                            }
                                          },
                                          onBlur: () => {
                                            if (time) {
                                              setValue(
                                                `plans.${index}.planStartTime`,
                                                formatTimeInput(time),
                                              );
                                            }
                                            setTime('');
                                          },
                                        },
                                      )}
                                      type="text"
                                      options={optionTimeInput}
                                      onChangeDropdown={(e) => {
                                        setIsFormTouched(true);
                                        setValue(
                                          `plans.${index}.planStartTime`,
                                          e.label,
                                        );
                                        if (
                                          getValues(
                                            `plans.${index}.planStartDate`,
                                          ) === null
                                        ) {
                                          setValue(
                                            `plans.${index}.planStartDate`,
                                            (() => {
                                              const today: Date = new Date();
                                              today.setHours(0, 0, 0, 0);
                                              return today;
                                            })(),
                                          );

                                          updateMinDatePlan(index, new Date());
                                        }
                                      }}
                                      className="h-[34px] !text-xs !pr-1 !pl-7 !border-[1px] !border-[#77858F] rounded-md"
                                    />
                                  </div>
                                </div>
                                <ErrorMessage
                                  error={errors.planStartDate?.message}
                                  className="mt-[6px] text-xs"
                                />
                              </div>
                              <div className="h-[34px] flex items-center">
                                〜
                              </div>
                              <div className="max-w-[220px]">
                                <div className="flex gap-1">
                                  <div className="w-[140px]">
                                    <Controller
                                      rules={{
                                        required: watch(
                                          `plans.${index}.planStartDate`,
                                        )
                                          ? END_DATE_WRONG_SELECTED
                                          : false,
                                      }}
                                      control={control}
                                      name={`plans.${index}.planEndDate`}
                                      render={({
                                        field: { value, onChange },
                                      }) => (
                                        <DatePickerCustom
                                          className="h-[34px] !border-[1px] !border-[#77858F] rounded-md !px-2 !pl-[30px] !text-xs !pt-2 text-center"
                                          selected={
                                            value
                                              ? new Date(value)
                                              : watch(
                                                  `plans.${index}.planEndDate`,
                                                )
                                          }
                                          disabled={isCheckActionPermission}
                                          minDate={
                                            watch(
                                              `plans.${index}.planStartDate`,
                                            ) || minDatePlans[index]
                                          }
                                          onChange={(e) => {
                                            setIsFormTouched(true);
                                            onChange(e);
                                            if (
                                              !getValues(
                                                `plans.${index}.planEndTime`,
                                              )
                                            ) {
                                              setValue(
                                                `plans.${index}.planEndTime`,
                                                convertToTimeString(
                                                  `${currentDate}`,
                                                ),
                                              );
                                            }
                                          }}
                                        />
                                      )}
                                    />
                                  </div>
                                  <div className="w-[72px] relative">
                                    <Input
                                      isShowClockIcon={true}
                                      disabled={isCheckActionPermission}
                                      valueInput={watch(
                                        `plans.${index}.planEndTime`,
                                      )}
                                      register={register(
                                        `plans.${index}.planEndTime`,
                                        {
                                          required:
                                            watch(
                                              `plans.${index}.planEndDate`,
                                            ) !== null
                                              ? true
                                              : false,
                                          validate: (value) => {
                                            if (
                                              watch(
                                                `plans.${index}.planEndDate`,
                                              )?.getTime() ===
                                                watch(
                                                  `plans.${index}.planStartDate`,
                                                )?.getTime() &&
                                              watch(
                                                `plans.${index}.planEndDate`,
                                              ) !== null
                                            ) {
                                              return (
                                                (value &&
                                                  watch(
                                                    `plans.${index}.planStartTime`,
                                                  ) &&
                                                  convertToMinutes(value) >
                                                    convertToMinutes(
                                                      `${watch(`plans.${index}.planStartTime`)}`,
                                                    )) ||
                                                END_DATE_WRONG_SELECTED
                                              );
                                            }
                                            return true;
                                          },
                                          onChange: (e) => {
                                            setIsFormTouched(true);
                                            handleChange(
                                              e,
                                              `plans.${index}.planEndTime`,
                                            );
                                            if (
                                              getValues(
                                                `plans.${index}.planEndDate`,
                                              ) === null
                                            ) {
                                              if (
                                                getValues(
                                                  `plans.${index}.planStartDate`,
                                                ) !== null
                                              ) {
                                                setValue(
                                                  `plans.${index}.planEndDate`,
                                                  getValues(
                                                    `plans.${index}.planStartDate`,
                                                  ),
                                                );
                                              } else {
                                                setValue(
                                                  `plans.${index}.planEndDate`,
                                                  (() => {
                                                    const today: Date =
                                                      new Date();
                                                    today.setHours(0, 0, 0, 0);
                                                    return today;
                                                  })(),
                                                );
                                              }
                                            }
                                          },
                                          onBlur: (e) => {
                                            if (time) {
                                              setValue(
                                                `plans.${index}.planEndTime`,
                                                formatTimeInput(time),
                                              );
                                            }
                                            if (
                                              watch(
                                                `plans.${index}.planEndDate`,
                                              )?.getTime() ===
                                                watch(
                                                  `plans.${index}.planStartDate`,
                                                )?.getTime() &&
                                              watch(
                                                `plans.${index}.planEndDate`,
                                              ) !== null
                                            ) {
                                              if (
                                                e.target.value &&
                                                watch(
                                                  `plans.${index}.planStartTime`,
                                                ) &&
                                                convertToMinutes(
                                                  e.target.value,
                                                ) >
                                                  convertToMinutes(
                                                    `${watch(`plans.${index}.planStartTime`)}`,
                                                  )
                                              ) {
                                                setError(
                                                  `plans.${index}.planEndTime`,
                                                  {
                                                    message: '',
                                                  },
                                                );
                                              } else {
                                                setError(
                                                  `plans.${index}.planEndTime`,
                                                  {
                                                    message:
                                                      END_DATE_WRONG_SELECTED,
                                                  },
                                                );
                                              }
                                            }

                                            setTime('');
                                          },
                                        },
                                      )}
                                      options={optionTimeInput}
                                      onChangeDropdown={(e) => {
                                        setIsFormTouched(true);
                                        setValue(
                                          `plans.${index}.planEndTime`,
                                          e.label,
                                        );
                                        if (
                                          getValues(
                                            `plans.${index}.planEndDate`,
                                          ) === null
                                        ) {
                                          if (
                                            getValues(
                                              `plans.${index}.planStartDate`,
                                            ) !== null
                                          ) {
                                            setValue(
                                              `plans.${index}.planEndDate`,
                                              getValues(
                                                `plans.${index}.planStartDate`,
                                              ),
                                            );
                                          } else {
                                            setValue(
                                              `plans.${index}.planEndDate`,
                                              (() => {
                                                const today: Date = new Date();
                                                today.setHours(0, 0, 0, 0);
                                                return today;
                                              })(),
                                            );
                                          }
                                        }
                                        if (
                                          watch(
                                            `plans.${index}.planEndDate`,
                                          )?.getTime() ===
                                            watch(
                                              `plans.${index}.planStartDate`,
                                            )?.getTime() &&
                                          watch(
                                            `plans.${index}.planEndDate`,
                                          ) !== null
                                        ) {
                                          if (
                                            e.label &&
                                            watch(
                                              `plans.${index}.planStartTime`,
                                            ) &&
                                            convertToMinutes(e.label) >
                                              convertToMinutes(
                                                `${watch(`plans.${index}.planStartTime`)}`,
                                              )
                                          ) {
                                            setError(
                                              `plans.${index}.planEndTime`,
                                              {
                                                message: '',
                                              },
                                            );
                                          } else {
                                            setError(
                                              `plans.${index}.planEndTime`,
                                              {
                                                message:
                                                  END_DATE_WRONG_SELECTED,
                                              },
                                            );
                                          }
                                        }
                                      }}
                                      type="text"
                                      className="h-[34px] !text-xs !pr-1 !pl-7 !border-[1px] !border-[#77858F] rounded-md"
                                    />
                                  </div>
                                </div>
                                <ErrorMessage
                                  error={
                                    errors?.plans?.[index]?.planEndTime
                                      ?.message ||
                                    errors?.plans?.[index]?.planEndDate?.message
                                  }
                                  className="mt-[6px] text-xs"
                                />
                              </div>
                              <div>
                                {!isCheckActionPermission && (
                                  <Button
                                    sz="sm"
                                    variant="outline"
                                    className="w-[48px] h-[34px] hover:opacity-70 !border-none !px-0 !rounded-md text-[13px] !bg-[#EBF1F7]"
                                    type="button"
                                    name="Remove plan"
                                    onClick={() => {
                                      setIsFormTouched(true);
                                      removePlanField(index);
                                    }}>
                                    削除
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {!isCheckActionPermission && (
                          <div className="text-right flex justify-center w-full mt-2 ">
                            <Button
                              sz="sm"
                              variant="outline"
                              className="w-6 h-6 mr-[54px] text-xs !py-0 !px-0 border-none !rounded-full !bg-[#ECF0F2] hover:opacity-70"
                              type="button"
                              onClick={async () => {
                                setIsFormTouched(true);
                                await appendPlanField({
                                  planStartDate: null,
                                  planStartTime: '',
                                  planEndDate: null,
                                  planEndTime: '',
                                });
                              }}>
                              <ImageRound
                                src="/icons/plus.svg"
                                name="Add organization"
                                className="h-3 w-3"
                              />
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-full flex justify-between">
                        <div className="flex gap-2">
                          <div className="w-[72px] relative">
                            <Input
                              isShowClockIcon={true}
                              autoFocus={false}
                              disabled={isCheckActionPermission}
                              type="text"
                              options={optionTimeInput}
                              valueInput={watch(`repeatStartTime`)}
                              register={register('repeatStartTime', {
                                onChange: (e) => {
                                  setIsFormTouched(true);
                                  handleChange(e, 'repeatStartTime');
                                },
                                onBlur: () => {
                                  if (time) {
                                    setValue(
                                      'repeatStartTime',
                                      formatTimeInput(time),
                                    );
                                  }
                                  setTime('');
                                },
                              })}
                              className="h-[34px] !text-xs !pr-1 !pl-7 !border-[1px] !border-[#77858F] rounded-md"
                              onChangeDropdown={(e) => {
                                setIsFormTouched(true);
                                setValue('repeatStartTime', e.label);
                              }}
                            />
                          </div>
                          <div className="h-[34px] flex items-center">〜</div>
                          <div className="w-[72px] relative">
                            <Input
                              isShowClockIcon={true}
                              autoFocus={false}
                              disabled={isCheckActionPermission}
                              type="text"
                              options={optionTimeInput}
                              valueInput={watch(`repeatEndTime`)}
                              register={register('repeatEndTime', {
                                onChange: (e) => {
                                  setIsFormTouched(true);
                                  handleChange(e, 'repeatEndTime');
                                },
                                onBlur: () => {
                                  if (time) {
                                    setValue(
                                      'repeatEndTime',
                                      formatTimeInput(time),
                                    );
                                  }
                                  setTime('');
                                },
                                validate: (value) => {
                                  if (
                                    watch('repeatType') &&
                                    !watch('repeatType')?.value
                                  )
                                    return true;
                                  return (
                                    convertToMinutes(String(value)) >
                                      convertToMinutes(
                                        `${watch('repeatStartTime')}`,
                                      ) || END_DATE_WRONG_SELECTED
                                  );
                                },
                              })}
                              className="h-[34px] !text-xs !pr-1 !pl-7 !border-[1px] !border-[#77858F] rounded-md"
                              onChangeDropdown={(e) => {
                                setIsFormTouched(true);
                                setValue('repeatEndTime', e.label);
                              }}
                            />
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
                                setValue('repeatStartTime', '');
                                setValue('repeatEndTime', '');
                              }}>
                              削除
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                    <ErrorMessage
                      error={errors?.repeatEndTime?.message}
                      className="mt-[-10px] text-xs"
                    />
                  </div>
                </div>
              )}
              {/* Description  */}
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
                      <p className="text-primary text-sm">
                        タスクについての詳細
                      </p>
                    </div>

                    {/* Description */}
                    <TextAreaLink
                      initialValue={getValues('description') || ''}
                      classNameCustom
                      onChange={(data) => {
                        setValue('description', data);
                        setIsFormTouched(true);
                      }}
                    />
                  </>
                ) : (
                  <div
                    className="flex gap-2 items-center bg-[#EBF1F7] p-2 rounded-md mb-[14px] hover:cursor-pointer"
                    onClick={() => setShowDescriptionSection(true)}>
                    <ImageRound
                      className="w-[17px] h-[17px] hover:cursor-pointer"
                      src="/icons/open-description.svg"
                      name="Open description icon"
                    />
                    <p className="text-primary text-sm">タスクについての詳細</p>
                  </div>
                )}
              </div>
              {/* Todo list */}
              {!isRoutineTaskModal && (
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
                        <p className="text-primary text-sm">
                          To Do リストを作成
                        </p>
                      </div>
                      <div>
                        <div className="[14px]">
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
                                      todo.id
                                        ? `${todo.id}`
                                        : `${todo.customId}`
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
                                                  className="w-fit h-fit cursor-grab !rounded-none hover:cursor-pointer"
                                                  src="/icons/complete-blue.svg"
                                                  name="complete item"
                                                  onClick={() => {
                                                    handleCheck(index);
                                                  }}
                                                />
                                              ) : (
                                                <ImageRound
                                                  className="w-fit h-fit cursor-grab !rounded-none hover:cursor-pointer"
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
                                                textareaRefs.current[index] =
                                                  el;
                                              }}
                                              disabled={isCheckActionPermission}
                                              placeholder={
                                                DEFAULT_VALUE_TODO_LIST
                                              }
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
                                              className={`resize-none ${todo.isChecked && 'line-through'} focus:outline-none focus:shadow-none focus:border-none focus:ring-0 placeholder-gray-300 border-[#F8FAFC] bg-[#F8FAFC] shadow-none w-full rounded-md`}
                                            />
                                            <div className="mt-[2.5px] ml-2 flex items-center">
                                              {!isCheckActionPermission && (
                                                <div
                                                  onClick={() => {
                                                    setIsFormTouched(true);
                                                    if (todo.customId) {
                                                      const listData =
                                                        todoList.filter(
                                                          (item) =>
                                                            item.customId !==
                                                            todo.customId,
                                                        );
                                                      setTodoList([
                                                        ...listData,
                                                      ]);
                                                    } else if (todo.id) {
                                                      const listData =
                                                        todoList.filter(
                                                          (item) =>
                                                            item.id !== todo.id,
                                                        );
                                                      setTodoList([
                                                        ...listData,
                                                      ]);
                                                    }
                                                  }}
                                                  className="h-3 flex items-center hover:cursor-pointer">
                                                  <ImageRound
                                                    className="!w-fit !h-fit"
                                                    src="/icons/remove-item.svg"
                                                    name="remove icon"
                                                  />
                                                </div>
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
                      <p className="text-primary text-sm">To Do リストを作成</p>
                    </div>
                  )}
                </div>
              )}
              {/* Submit button */}
              {isPermissionAdd &&
                (action === ActionTask.COPY ||
                  action === ActionTask.CREATE) && (
                  <div className="flex justify-center">
                    <Button
                      type="submit"
                      disabled={!isFormTouched}
                      className="w-[200px] !rounded-md h-[46] !text-sm !px-2">
                      保存
                    </Button>
                  </div>
                )}
              {isPermissionUpdate && action === ActionTask.EDIT && (
                <div className="flex justify-center">
                  <Button
                    type="submit"
                    disabled={!isFormTouched}
                    className="w-[200px] !rounded-md h-[46] !text-sm !px-2">
                    保存
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </form>
    </Drawer>
  );
};

export default ActionsTaskModalTeam;
