import { Role } from '@mju-psi/yti-common-ui';

export interface UserRequest {
  organizationId: string;
  role: Role[];
}
