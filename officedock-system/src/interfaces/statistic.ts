import { Tags } from './tag';
import { TodoItem } from './task';

export interface TaskTimeStatistic {
  start: Date;
  end: Date;
  id: string;
  title: string;
  startedAt: Date;
  pausedAt: Date;
}

export interface SmallCategory {
  id: number;
  name: string;
  uuid: string;
}

export interface MediumCategory {
  MEDIUM: {
    id: number;
    name: string;
    uuid: string;
  } | null;
  SMALL: SmallCategory[];
}
export interface LargeCategory {
  LARGE: {
    id: number;
    name: string;
    uuid: string;
  };
  MEDIUM: MediumCategory[];
}
export type OrganizationCategories = {
  [key: string]: LargeCategory[];
};
export interface dataStatisticResponse {
  categories: {
    categoryName: string;
    duration: string;
    percent: number;
  }[];
  tasks: dataTaskDaily[];
  remark: {
    date: string | null;
    remark: string;
    isSubmit: boolean;
  };
  totalDuration: string;
  organizationCategories: OrganizationCategories;
}

export interface dataTotalCategory {
  color: string;
  categoryName: string;
  duration: string;
  percent: number;
}
export interface dataTaskDaily {
  id: string;
  title: string;
  categories: {
    id: number;
    name: string;
    type: string;
  }[];
  status: {
    id: number;
    name: string;
  };
  organization: number;
  tags: Omit<Tags, 'peopleInCharge' | 'responsiblePerson'>[];
  taskDurations: {
    id: number;
    duration: string;
    startedAt: string;
    pausedAt: string;
  }[];
  todoList: TodoItem[];
  totalDuration: string;
}

export interface ChildTask {
  id: string;
  idEdit?: string;
  title: string;
  organization: number;
  status: { id: number; name: string };
  tags: {
    id: number;
    name: string;
  }[];
  todoList: TodoItem[];
  totalDuration: string;
  startedAt: string;
  pausedAt: string;
  isRunning?: boolean;
  SMALL: {
    id: number | string;
    name: string;
  };
  MEDIUM: {
    id: number | string;
    name: string;
  };
  LARGE: {
    id: number | string;
    name: string;
  };
}

export interface dataTaskDailyTable {
  id: string;
  idEdit?: string;
  title: string;
  SMALL: {
    id: number | string;
    name: string;
  };
  MEDIUM: {
    id: number | string;
    name: string;
  };
  LARGE: {
    id: number | string;
    name: string;
  };
  status: {
    id: number;
    name: string;
  };
  tags: {
    id: number;
    name: string;
  }[];
  taskDuration?: string;
  children?: ChildTask[];
  todoList: TodoItem[];
  totalDuration: string;
  startedAt?: string;
  pausedAt?: string;
  isRunning?: boolean;
  organization?: number;
}
