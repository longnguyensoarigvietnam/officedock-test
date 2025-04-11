export interface Role {
  id: number;
  name: string;
  systemRole: boolean;
}

export interface RoleFormData {
  name: string;
  permissions: Record<string, {
    actions: string
  }>;
}

export interface RoleDetail {
  id: number;
  name: string;
  systemRole?: boolean;
  permissions: {
    screenName: string;
    actions: string;
  }[];
}
