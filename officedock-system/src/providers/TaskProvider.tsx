'use client';
import {
  ReactNode,
  createContext,
  useState,
  Dispatch,
  SetStateAction,
  useEffect,
} from 'react';

import {
  TaskActualCalculationType,
  TaskDuration,
  TaskFieldActionStart,
  TaskFieldStart,
} from '@interfaces/task';
import { OptionDropdownType } from '@interfaces/common';
import { EventCalendarProps } from '@interfaces/calendar';
import { usePathname } from 'next/navigation';
import { StatusValueTask } from '@constants/enums';
interface ContextValue {
  dataActualAddSchedule: TaskActualCalculationType | undefined;
  tagSelected: string | number;
  memberSelected: string | number;
  searchValue: string;
  taskSelected: OptionDropdownType;
  dataEventEdit: OptionDropdownType;
  dataTaskEditKanban: OptionDropdownType;
  selectedOptionZoom: OptionDropdownType;

  taskSelectedToStart: TaskFieldStart | EventCalendarProps | null;
  taskSelectedAction: TaskFieldActionStart | null;
  statusTaskSelected: TaskDuration;
  idTaskEditSelected: string;
  idEventDelete: string;
  idTaskDelete: string;
  idTaskStarting: {
    id: string;
    type: string;
  };
  dataRunning: {
    id: string;
    type: string;
  };
  dataClickTask: {
    id: string;
    type: string;
  };
  showEditTaskModal: boolean;
  orderingRequest: string;
  currentDate: Date;
  showWarningStartTaskModal: boolean;
  isLoadingDataTask: boolean;
  widthCalendar: number;
  columnWidth: number;
  extendByStatus: {
    id: StatusValueTask;
    status: boolean;
  }[];
  setColumnWidth: Dispatch<SetStateAction<number>>;
  setWidthCalendar: Dispatch<SetStateAction<number>>;
  setIsLoadingDataTask: (isLoading: boolean) => void;
  setTagSelected: Dispatch<SetStateAction<string | number>>;
  setIdTaskStarting: Dispatch<
    SetStateAction<{
      id: string;
      type: string;
    }>
  >;
  setDataRunning: Dispatch<
    SetStateAction<{
      id: string;
      type: string;
    }>
  >;
  setDataClickTask: Dispatch<
    SetStateAction<{
      id: string;
      type: string;
    }>
  >;
  setMemberSelected: Dispatch<SetStateAction<string | number>>;
  setSearchValue: Dispatch<SetStateAction<string>>;
  setTaskSelected: Dispatch<SetStateAction<OptionDropdownType>>;
  setDataEventEdit: Dispatch<SetStateAction<OptionDropdownType>>;
  setSelectedOptionZoom: Dispatch<SetStateAction<OptionDropdownType>>;

  setDataTaskEditKanban: Dispatch<SetStateAction<OptionDropdownType>>;
  setTaskSelectedToStart: Dispatch<
    SetStateAction<TaskFieldStart | EventCalendarProps | null>
  >;
  setTaskSelectedAction: Dispatch<SetStateAction<TaskFieldActionStart | null>>;
  setStatusTaskSelected: Dispatch<SetStateAction<TaskDuration>>;
  setIdTaskEditSelected: Dispatch<SetStateAction<string>>;
  setShowEditTaskModal: Dispatch<SetStateAction<boolean>>;
  setOrderingRequest: Dispatch<SetStateAction<string>>;
  setShowWarningStartTaskModal: Dispatch<SetStateAction<boolean>>;
  setCurrentDate: Dispatch<SetStateAction<Date>>;
  setIdEventDelete: Dispatch<SetStateAction<string>>;
  setIdTaskDelete: Dispatch<SetStateAction<string>>;
  setDataActualAddSchedule: Dispatch<
    SetStateAction<TaskActualCalculationType | undefined>
  >;
  setExtendByStatus: Dispatch<
    SetStateAction<
      {
        id: StatusValueTask;
        status: boolean;
      }[]
    >
  >;
  handleZoomInKanban: () => void;
  handleZoomOutKanban: () => void;
  calculateFontSizeTitle: () => number;
  calculateFontSizeContent: () => number;
}

const defaultValue: ContextValue = {
  tagSelected: '',
  memberSelected: '',
  idEventDelete: '',
  idTaskDelete: '',
  searchValue: '',
  taskSelected: {
    label: '',
    value: '',
  },
  dataEventEdit: {
    label: '',
    value: '',
  },
  dataTaskEditKanban: {
    label: '',
    value: '',
  },
  idTaskStarting: {
    id: '',
    type: '',
  },
  dataRunning: {
    id: '',
    type: '',
  },
  dataClickTask: {
    id: '',
    type: '',
  },
  extendByStatus: [
    {
      id: StatusValueTask.NOT_STARTED,
      status: false,
    },
    {
      id: StatusValueTask.IN_PROGRESS,
      status: false,
    },
    {
      id: StatusValueTask.CONFIRMING,
      status: false,
    },
    {
      id: StatusValueTask.COMPLETED,
      status: false,
    },
    {
      id: StatusValueTask.MY_ROUTINE,
      status: false,
    },
  ],
  taskSelectedToStart: null,
  taskSelectedAction: null,
  statusTaskSelected: {
    taskDuration: '',
    isStart: false,
  },
  idTaskEditSelected: '',
  showEditTaskModal: false,
  orderingRequest: '',
  showWarningStartTaskModal: false,
  currentDate: new Date(),
  isLoadingDataTask: false,
  widthCalendar: 0,
  columnWidth: 213,
  selectedOptionZoom: {
    label: '100%',
    value: 100,
  },
  setColumnWidth: () => {},
  setWidthCalendar: () => {},
  setIsLoadingDataTask: () => {},
  setTagSelected: () => {},
  setMemberSelected: () => {},
  setSearchValue: () => {},
  setTaskSelected: () => {},
  setDataEventEdit: () => {},
  setDataTaskEditKanban: () => {},
  setStatusTaskSelected: () => {},
  setTaskSelectedToStart: () => {},
  setIdTaskEditSelected: () => {},
  setShowEditTaskModal: () => {},
  setOrderingRequest: () => {},
  setShowWarningStartTaskModal: () => {},
  setCurrentDate: () => {},
  setIdTaskStarting: () => {},
  setDataRunning: () => {},
  setTaskSelectedAction: () => {},
  setDataClickTask: () => {},
  setIdEventDelete: () => {},
  setIdTaskDelete: () => {},
  setExtendByStatus: () => {},
  dataActualAddSchedule: undefined,
  setDataActualAddSchedule: () => {},
  handleZoomInKanban: () => {},
  handleZoomOutKanban: () => {},
  calculateFontSizeTitle: function (): number {
    throw new Error('');
  },
  calculateFontSizeContent: function (): number {
    throw new Error('');
  },
  setSelectedOptionZoom: () => {},
};

export const TaskContext = createContext<ContextValue>(defaultValue);

export const TaskProvider = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();

  const isTaskPage = pathname.startsWith('/task');

  const [isLoadingDataTask, setIsLoadingDataTask] = useState(false);

  const [widthCalendar, setWidthCalendar] = useState<number>(0);

  const [tagSelected, setTagSelected] = useState<string | number>('');
  const [memberSelected, setMemberSelected] = useState<string | number>('');
  const [dataRunning, setDataRunning] = useState<{
    id: string;
    type: string;
  }>({
    id: '',
    type: '',
  });

  const [dataClickTask, setDataClickTask] = useState<{
    id: string;
    type: string;
  }>({
    id: '',
    type: '',
  });
  const [extendByStatus, setExtendByStatus] = useState([
    {
      id: StatusValueTask.NOT_STARTED,
      status: true,
    },
    {
      id: StatusValueTask.IN_PROGRESS,
      status: true,
    },
    {
      id: StatusValueTask.CONFIRMING,
      status: true,
    },
    {
      id: StatusValueTask.COMPLETED,
      status: true,
    },
    {
      id: StatusValueTask.MY_ROUTINE,
      status: true,
    },
  ]);

  const [searchValue, setSearchValue] = useState<string>('');
  const [taskSelected, setTaskSelected] = useState<OptionDropdownType>({
    label: '',
    value: '',
    type: '',
  });
  const [taskSelectedAction, setTaskSelectedAction] =
    useState<TaskFieldActionStart | null>(null);
  const [taskSelectedToStart, setTaskSelectedToStart] = useState<
    TaskFieldStart | EventCalendarProps | null
  >(null);

  const [statusTaskSelected, setStatusTaskSelected] = useState<TaskDuration>({
    taskDuration: '',
    isStart: false,
  });

  const [idEventDelete, setIdEventDelete] = useState<string>('');
  const [idTaskDelete, setIdTaskDelete] = useState<string>('');

  const [dataEventEdit, setDataEventEdit] = useState<OptionDropdownType>({
    label: '',
    value: '',
    type: '',
  });
  const [dataTaskEditKanban, setDataTaskEditKanban] =
    useState<OptionDropdownType>({
      label: '',
      value: '',
      type: '',
    });

  const [idTaskStarting, setIdTaskStarting] = useState<{
    id: string;
    type: string;
  }>({
    id: '',
    type: '',
  });
  const [selectedOptionZoom, setSelectedOptionZoom] =
    useState<OptionDropdownType>({
      label: '100%',
      value: 100,
    });

  const [dataActualAddSchedule, setDataActualAddSchedule] =
    useState<TaskActualCalculationType>();

  const [idTaskEditSelected, setIdTaskEditSelected] = useState<string>('');
  const [showEditTaskModal, setShowEditTaskModal] = useState<boolean>(false);
  const [orderingRequest, setOrderingRequest] = useState<string>('');
  const [showWarningStartTaskModal, setShowWarningStartTaskModal] =
    useState<boolean>(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [columnWidth, setColumnWidth] = useState<number>(247);

  const baseColumnWidth = 247;
  const baseFontSizeTitle = 16;
  const baseFontSizeContent = 12;

  const calculateFontSizeTitle = () => {
    return (columnWidth / baseColumnWidth) * baseFontSizeTitle;
  };

  const calculateFontSizeContent = () => {
    return (columnWidth / baseColumnWidth) * baseFontSizeContent;
  };

  const handleZoomInKanban = () => {
    const maxColumnWidth = 641;
    setColumnWidth((prev) => Math.min(prev + 24.7, maxColumnWidth));
  };

  const handleZoomOutKanban = () => {
    const minColumnWidth = 62;
    setColumnWidth((prev) => Math.max(prev - 24.7, minColumnWidth));
  };
  useEffect(() => {
    if (isTaskPage) {
      setColumnWidth(baseColumnWidth);
    }
  }, [isTaskPage]);

  const contextValue: ContextValue = {
    columnWidth,
    selectedOptionZoom,
    dataActualAddSchedule,
    idEventDelete,
    idTaskDelete,
    dataEventEdit,
    dataTaskEditKanban,
    dataRunning,
    tagSelected,
    taskSelected,
    idTaskStarting,
    taskSelectedToStart,
    taskSelectedAction,
    statusTaskSelected,
    memberSelected,
    searchValue,
    idTaskEditSelected,
    showEditTaskModal,
    orderingRequest,
    showWarningStartTaskModal,
    currentDate,
    dataClickTask,
    isLoadingDataTask,
    widthCalendar,
    extendByStatus,
    setExtendByStatus,
    setWidthCalendar,
    setIsLoadingDataTask,
    setTagSelected,
    setMemberSelected,
    setTaskSelected,
    setTaskSelectedToStart,
    setStatusTaskSelected,
    setSearchValue,
    setIdTaskEditSelected,
    setShowEditTaskModal,
    setOrderingRequest,
    setShowWarningStartTaskModal,
    setCurrentDate,
    setTaskSelectedAction,
    setIdTaskStarting,
    setDataRunning,
    setDataClickTask,
    setIdEventDelete,
    setDataEventEdit,
    setDataTaskEditKanban,
    setDataActualAddSchedule,
    setIdTaskDelete,
    setColumnWidth,
    handleZoomInKanban,
    handleZoomOutKanban,
    calculateFontSizeTitle,
    calculateFontSizeContent,
    setSelectedOptionZoom,
  };

  return (
    <TaskContext.Provider value={contextValue}>{children}</TaskContext.Provider>
  );
};
