import { OptionDropdownType } from './common';
import { Organizations } from './organization';

export interface ActualDurationDetail {
  id: number;
  type?: string;
  title?: string;
  tags: { id: number; name: string }[];
  categories: { id?: number; name?: string; type?: string }[];
  isImportant?: boolean;
  staffs: string[];
  startedAt?: Date | null;
  pausedAt?: Date | null;
  createdAt?: Date | null;
  taskId?: number | string;
  scheduleId?: number | string;
  scheduleType?: string;
  organization?: Organizations | number;
}

export interface ActualDuration {
  id?: number;
  type?: string;
  title?: string;
  tags?: { id: number; name: string }[];
  largeCategory?: { id?: number; name?: string; type?: string };
  mediumCategory?: { id?: number; name?: string; type?: string };
  smallCategory?: { id?: number; name?: string; type?: string };
  isImportant?: boolean;
  staffs?: string[];
  startedAt?: Date | null;
  pausedAt?: Date | null;
  createdAt?: Date | null;
  taskId?: number | string;
  scheduleId?: number | string;
}

export interface TaskScheduleDetail {
  id: number;
  title: string;
  type: string;
}

export interface CreateActualDurationFormData {
  taskId?: number | string;
  scheduleId?: number | string;
  tagIds: OptionDropdownType[];
  largeCategory: OptionDropdownType;
  mediumCategory: OptionDropdownType;
  smallCategory: OptionDropdownType;
  isImportant: boolean | undefined;
  scheduleType?: OptionDropdownType;
  startedAtDate: Date | null | string;
  pausedAtDate: Date | null | string;
  startedAtTime: string | null;
  pausedAtTime: string | null;
}

export interface ActualDurationDefaultData {
  title: string;
  taskId?: number | string;
  scheduleId?: number | string;
  tagIds: { id: number; name: string }[];
  largeCategory?: OptionDropdownType;
  mediumCategory?: OptionDropdownType;
  smallCategory?: OptionDropdownType;
  isImportant?: boolean;
  scheduleType?: OptionDropdownType;
  organization?: number;
}

export interface ActualDurationRequest {
  userId?: number
  taskId?: number;
  scheduleId?: number;
  scheduleType?: string | null;
  tagIds: number[];
  categoryIds: { categoryId: number; type: string }[];
  isImportant?: boolean | undefined;
  startedAt: string;
  pausedAt: string;
}
export interface ActualResponseUpdateType {
  id: number;
  pausedAt: string;
  startedAt: string;
  uuid: string;
}
