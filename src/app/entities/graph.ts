import { Localization } from '@vrk-yti/yti-common-ui';

export interface Graph {

  code: string;
  id: string;
  uri: string;
  permissions: {};
  properties: {
    prefLabel: Localization[],
    type?: [{lang: '', value: 'Metamodel'}]
  }
  roles: any[];
}
