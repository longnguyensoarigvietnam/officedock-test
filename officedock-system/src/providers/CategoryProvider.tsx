'use client';
import {
  ReactNode,
  createContext,
  useState,
  Dispatch,
  SetStateAction,
} from 'react';

import { Category } from '@interfaces/category';

interface ContextValue {
  dataCategoryDetail: Category | undefined;
  setDataCategoryDetail: Dispatch<SetStateAction<Category | undefined>>;
}

const defaultValue: ContextValue = {
  dataCategoryDetail: undefined,
  setDataCategoryDetail: () => {},
};

export const CategoryStateContext = createContext<ContextValue>(defaultValue);

export const CategoryStateProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [dataCategoryDetail, setDataCategoryDetail] = useState<
    Category | undefined
  >();

  const contextValue: ContextValue = {
    dataCategoryDetail,
    setDataCategoryDetail,
  };

  return (
    <CategoryStateContext.Provider value={contextValue}>
      {children}
    </CategoryStateContext.Provider>
  );
};
