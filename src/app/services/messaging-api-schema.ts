import { Localizable } from '@mju-psi/yti-common-ui';

export interface MessagingUserType {
  id: string;
  subscriptionType: string;
  resources?: MessagingResourceType[];
}

export interface MessagingResourceType {
  uri: string;
  application: string;
  type: string;
  prefLabel: Localizable;
}
