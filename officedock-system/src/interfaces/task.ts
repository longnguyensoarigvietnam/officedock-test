import { EventCalendarType } from '@constants/enums';
import { OptionDropdownType } from './common';
import { PeopleInCharge, TagId, Tags } from './tag';
import { Organizations } from './organization';
import { EventCalendarProps, EventParticipant } from './calendar';

export interface TaskRequest {
  id?: number | string;
  title?: string;
  type?: string;
  statusId?: number | null;
  priority?: string | null;
  deadline?: string | null;
  description?: string;
  tagIds?: TagId[] | null;
  peopleInChargeIds?: PeopleInCharge[] | null;
  statusName?: string;
  isStart?: boolean;
  categoryIds?:
    | {
        categoryId: string | null;
        type: string;
      }[]
    | null;
  pinAt?: string | null;
  index?: number;
  isImportant?: boolean;
  todoList?: TodoItem[];
  taskSchedules?:
    | {
        scheduleId?: number | null;
        planStartDate?: string | null;
        planEndDate?: string | null;
      }[]
    | null;
  sendToChat?: boolean;
  chatRoomCode?: string;
  oldIdStatus?: string;
  oldNameStatus?: string;
  oldIdPeople?: string;
  action?: string;
  copyTaskId?: string | null;
  organizationId?: number | null;
  remindCountdown?: string | null;
  remindType?: string | null;
  remind_at?: string | null;
  repeatType?: string | null;
  repeatInterval?: number | null;
  weekDay?: number | null;
  monthDay?: number | null;
  month?: number | null;
  planStartDate?: string | null;
  planEndDate?: string | null;
  isTeamTask?: boolean;
  task_schedule_from_date?: string;
  task_schedule_end_date?: string;
  showDeadlineTime?: boolean;
}
export interface TaskFormData {
  id?: string;
  title?: string;
  type?: OptionDropdownType;
  statusId?: OptionDropdownType | null;
  priority?: OptionDropdownType;
  deadlineDate?: Date | null;
  deadlineTime?: string | null;
  deadlineRemindCountdown?: OptionDropdownType | null;
  deadlineRemindType?: OptionDropdownType | null;
  planStartDate?: Date | null;
  planStartTime?: string | null;
  planEndDate?: Date | null;
  planEndTime?: string | null;
  actualStartDate?: Date | null;
  actualStartTime?: string | null;
  actualEndDate?: Date | null;
  actualEndTime?: string | null;
  description?: string;
  tagIds?: OptionDropdownType[] | null;
  peopleInChargeIds?: OptionDropdownType[]; // Fake focus data
  isStart?: boolean;
  isMyTask?: boolean;
  isAnotherTaskStarted?: boolean;
  createdAt?: Date;
  index?: number;
  taskDuration?: string;
  categories: {
    LARGE: OptionDropdownType;
    MEDIUM: OptionDropdownType;
    SMALL: OptionDropdownType;
  };
  isImportant: boolean;
  todoList?: TodoItem[];
  plans: PlanItem[] | null;
  oldIdStatus?: string;
  oldNameStatus?: string;
  oldIdPeople?: string;
  organization?: OptionDropdownType | null;
  repeatType?: OptionDropdownType;
  repeatInterval?: OptionDropdownType;
  weekDay?: OptionDropdownType;
  monthDay?: OptionDropdownType;
  month?: OptionDropdownType;
  repeatStartTime?: string | null;
  repeatEndTime?: string | null;
  peopleInChart?: OptionDropdownType;
  showDeadlineTime?: boolean;
}

export interface StatusTask {
  id: number | null;
  name: string;
  index?: number;
}
export interface TodoItem {
  id?: number;
  customId?: string;
  content: string;
  isChecked: boolean;
  checkedAt?: string | null;
  index: number;
}

interface PlanItem {
  scheduleId?: number | null;
  planStartDate: Date | null;
  planStartTime: string | null;
  planEndDate: Date | null;
  planEndTime: string | null;
}

export interface Task {
  id: number;
  title: string;
  type: string;
  status?: StatusTask;
  priority?: string;
  deadline: string;
  description: string;
  taskDuration: string;
  isStart: boolean;
  isMyTask: boolean;
  tags: Omit<Tags, 'peopleInCharge' | 'responsiblePerson'>[];
  peopleInCharge: peopleInChargeType[];
  createdAt: Date;
  index: number;
  action?: string;
  isDrag?: boolean;
  isScheduleInToday?: boolean;
  showDeadlineTime?: boolean;
  categories?: {
    name: string;
    type: string;
    id: number;
    color: string;
  }[];
  resourceId?: string;
  isImportant?: boolean;
  todoList?: TodoItem[];
  plans?: PlanItem[] | null;
  pinAt?: string | null;
  taskSchedules: {
    id?: number | null;
    uuid?: string;
    planStartDate: string | null;
    planEndDate?: string | null;
  }[];
  organization?: Organizations;
  remindCountdown?: string | null;
  remindType?: string | null;
  repeatType?: string | null;
  repeatInterval?: number | null;
  weekDay?: number | null;
  monthDay?: number | null;
  month?: number | null;
  planStartDate?: string | null;
  planEndDate?: string | null;
  hasActualDuration?: boolean;
}
export interface TaskRunningType {
  id: number;
  isOverEstimate: boolean;
  isStart: boolean;
  pausedAt: string | null;
  startedAt: string;
  taskDuration: string;
  taskDurationRunningUuid: string;
  title: string;
  type: string;
}
export interface TaskActualType {
  id: number;
  taskId: number;
  scheduleId?: number;
  title: string;
  deadline: string;
  isStart: boolean;
  uuid: string;
  planStartDate: string | null;
  planEndDate?: string | null;
  type?: string;
  categories?: {
    name: string;
    type: string;
    id: number;
    color: string;
  }[];
}
export interface peopleInChargeType {
  id: number | string;
  fullName: string;
}

export interface ColumnType {
  id: string | number;
  title: string;
  items: Task[];
}
export interface Columns {
  [key: string]: ColumnType;
}

export interface CreationDataTask {
  tags: Omit<Tags, 'responsiblePerson'>[];
  status: StatusTask[];
  types: string[];
  priorities: string[];
  categories: {
    id: number;
    name: string;
    uuid: string;
    color?: string;
  }[];
  organizations: {
    id: number;
    name: string;
    superior: { id: number; name: string } | null;
    tags: { id: number; name: string }[];
  }[];
  organizationCategories: Team[];
}

export interface Team {
  organization: Organizations;
  categories: Category[];
}

export interface UpdateTaskKanbanRequest {
  index?: number;
  task: number;
  status: number | string;
  tag?: number | string | null;
  user?: number | string | null;
  pinAt?: string | null;
  peopleInCharge?: string | null;
  isBeginUnpin?: boolean;
  team?: string;
}

export interface TaskDuration {
  taskDuration: string;
  isStart: boolean;
}
export interface KanbanDataResponse {
  count: number;
  numPages: number;
  results: Task[];
  hasNext: boolean;
}

export interface EventSchedule {
  isAllDay?: boolean;
  idEvent?: number;
  endDate?: Date | null;
  startDate?: Date | null;
  typeEvent?: EventCalendarType;
}
export interface TaskTimeSchedule {
  id: string;
  uuid?: string;
  taskId?: number;
  scheduleId?: number;
  eventSchedule?: number;
  title: string;
  type: string;
  isStart: boolean;
  start: Date;
  end: Date;
  allDay?: boolean;
  endDate?: Date | null;
  startDate?: Date | null;
  resourceId?: string;
  startEditable?: boolean;
  planStartDate: string | null;
  planEndDate: string | null;
  isCalculation?: boolean;
  largeColor?: string;
  isImportant?: boolean;
  deadline?: string;
  address?: string;
  participants?: EventParticipant[];
  isAllDay?: boolean;
  statusId?: number;
}
export interface CombinedEventTask
  extends Omit<EventCalendarProps, 'type'>,
    Task {
  id: number;
  type: string;
}

export interface TaskErrorPerson {
  id: string;
  message: string;
}
export interface TaskFieldStart {
  id: number | string;
  title: string;
  type: string;
}
export interface TaskFieldActionStart extends Omit<TaskFieldStart, 'title'> {
  isStart: boolean;
  title?: string;
}

export interface TaskPinResponse {
  index: number;
  user: number;
  task: number;
  pinAt: string | null;
}

export interface TaskActualCalculationType {
  id: number;
  isStart: boolean;
  planEndDate: string;
  planStartDate: string;
  taskId: number;
  scheduleId: number;
  title: string;
  uuid: string;
  type: string;
  startedAt?: string;
  pausedAt?: string | null;
  categories?: {
    name: string;
    type: string;
    id: number;
    color: string;
  }[];
}
export interface DataDetailTaskType {
  id: string;
  largeColor: string;
  title: string;
  start: string;
  end: string;
  resource: string;
  left?: number;
  top?: number;
  taskId: string | number;
  isImportant?: boolean | null;
  deadline?: string;
  statusId?: number;
  uuid: string;
  isRunning?: boolean;
}
export interface DataDetailEventType {
  id: string;
  scheduleId: string;
  eventSchedule: string;
  title: string;
  start: string;
  end: string;
  left?: number;
  top?: number;
  participants?: EventParticipant[];
  address?: string;
  isAllDay: boolean;
  type: OptionDropdownType;
  repeatType?: string | null;
  repeatInterval?: number | null;
  weekDay?: number | null;
  monthDay?: number | null;
  month?: number | null;
}
//Team
interface Category {
  id: number;
  name: string;
  color: string | null;
  type: string;
}

interface StatusTeam {
  id: number;
  name: string;
  total: number;
  hasNext: boolean;
  tasks: Task[];
}

interface ProfileTeam {
  id: number;
  fullName: string;
  birthday: string | null;
  gender: string | null;
}

export interface ResultTeam {
  id: number;
  avatarColor: string;
  profile: ProfileTeam;
  status: StatusTeam[];
  avatar: string;
}
export interface KanbanDataTeamResponse {
  count: number;
  numPages: number;
  results: ResultTeam[];
  hasNext: boolean;
}

// Transformer data team Task

export interface TransformedStatuses {
  NOT_STARTED: Task[];
  IN_PROGRESS: Task[];
  CONFIRMING: Task[];
  COMPLETED: Task[];
}

export interface TransformedUser {
  id: string;
  name: string;
  avatarColor: string;
  avatar: string;
  statuses: TransformedStatuses;
}

// Transformer total status
export interface StatusSummary {
  name: string;
  total: number;
  hasNext: boolean;
}

export interface UserTotalStatus {
  id: string;
  fullName: string;
  statuses: StatusSummary[];
}
export interface NoSettingTotalType {
  count: number;
  hasNext: boolean;
}
export interface DataStatusChangeInline {
  id: string;
  oldIdStatus: string;
  statusId: number;
}
