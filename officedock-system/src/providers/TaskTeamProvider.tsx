'use client';
import { OptionDropdownType } from '@interfaces/common';
import { CreationDataTask } from '@interfaces/task';
import {
  ReactNode,
  createContext,
  useState,
  Dispatch,
  SetStateAction,
} from 'react';

interface ContextValue {
  creationDataTaskData: CreationDataTask | undefined;
  orderingRequest: string;
  orderingOptions: {
    category_ids: OptionDropdownType[];
    tag_ids: OptionDropdownType[];
    organization_ids: OptionDropdownType[];
  } | null;
  setCreationDataTaskData: Dispatch<
    SetStateAction<CreationDataTask | undefined>
  >;
  setOrderingOptions: Dispatch<
    SetStateAction<{
      category_ids: OptionDropdownType[];
      tag_ids: OptionDropdownType[];
      organization_ids: OptionDropdownType[];
    } | null>
  >;
  setOrderingRequest: Dispatch<SetStateAction<string>>;
  // Zoom
  columnWidth: number;
  setColumnWidth: Dispatch<SetStateAction<number>>;
  selectedOptionZoom: OptionDropdownType;
  setSelectedOptionZoom: Dispatch<SetStateAction<OptionDropdownType>>;
  handleZoomInKanban: () => void;
  handleZoomOutKanban: () => void;
  isLoadingDataTask: boolean;
  setIsLoadingDataTask: (isLoading: boolean) => void;
}

const defaultValue: ContextValue = {
  creationDataTaskData: undefined,
  orderingRequest: '',
  orderingOptions: null,
  columnWidth: 213,
  selectedOptionZoom: {
    label: '100%',
    value: 100,
  },
  isLoadingDataTask: false,
  setIsLoadingDataTask: () => {},
  setSelectedOptionZoom: () => {},
  handleZoomInKanban: () => {},
  handleZoomOutKanban: () => {},
  setColumnWidth: () => {},
  setCreationDataTaskData: () => {},
  setOrderingRequest: () => {},
  setOrderingOptions: () => {},
};

export const TaskTeamStateContext = createContext<ContextValue>(defaultValue);

export const TaskTeamStateProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [creationDataTaskData, setCreationDataTaskData] =
    useState<CreationDataTask>();
  // Loading
  const [isLoadingDataTask, setIsLoadingDataTask] = useState(false);

  // Filter
  const [orderingRequest, setOrderingRequest] = useState<string>('');

  const [orderingOptions, setOrderingOptions] = useState<{
    category_ids: OptionDropdownType[];
    tag_ids: OptionDropdownType[];
    organization_ids: OptionDropdownType[];
  } | null>(null);

  // Zoom
  const [selectedOptionZoom, setSelectedOptionZoom] =
    useState<OptionDropdownType>({
      label: '100%',
      value: 100,
    });
  const [columnWidth, setColumnWidth] = useState<number>(247);
  const handleZoomInKanban = () => {
    const maxColumnWidth = 641;
    setColumnWidth((prev) => Math.min(prev + 24.7, maxColumnWidth));
  };

  const handleZoomOutKanban = () => {
    const minColumnWidth = 62;
    setColumnWidth((prev) => Math.max(prev - 24.7, minColumnWidth));
  };

  const contextValue: ContextValue = {
    orderingOptions,
    creationDataTaskData,
    orderingRequest,
    setOrderingRequest,
    setOrderingOptions,
    setCreationDataTaskData,
    columnWidth,
    setColumnWidth,
    selectedOptionZoom,
    setSelectedOptionZoom,
    handleZoomInKanban,
    handleZoomOutKanban,
    isLoadingDataTask,
    setIsLoadingDataTask,
  };

  return (
    <TaskTeamStateContext.Provider value={contextValue}>
      {children}
    </TaskTeamStateContext.Provider>
  );
};
