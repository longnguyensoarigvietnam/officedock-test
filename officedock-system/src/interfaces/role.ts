export interface Role {
  id: number;
  name: string;
  systemRole: boolean;
}

interface Permission {
  view: string;
  add?: string;
  update?: string;
  delete?: string;
}

export interface RoleFormData {
  name: string;
  permissions: Record<string, Permission>;
}

export interface RoleDetail {
  id: number;
  name: string;
  systemRole?: boolean;
  permissions: {
    screenName: string;
    actions: Permission;
  }[];
}
