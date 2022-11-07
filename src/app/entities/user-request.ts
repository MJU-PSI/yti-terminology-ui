import { Role } from '@goraresult/yti-common-ui';

export interface UserRequest {
  organizationId: string;
  role: Role[];
}
