import { Injectable } from '@angular/core';
import { UserService, UUID } from '@vrk-yti/yti-common-ui';
import { VocabularyNode } from 'app/entities/node';

@Injectable()
export class AuthorizationManager {

  constructor(private userService: UserService) {
  }

  get user() {
    return this.userService.user;
  }

  canEdit(vocabulary: VocabularyNode): boolean {

    if (this.user.superuser) {
      return true;
    }

    const organizationIds = vocabulary.contributors.map(org => org.id);

    return this.user.isInRole(['ADMIN', 'TERMINOLOGY_EDITOR'], organizationIds);
  }

  canAddCollection(vocabulary: VocabularyNode): boolean {
    return this.canEdit(vocabulary);
  }

  canAddConcept(vocabulary: VocabularyNode): boolean {
    return this.canEdit(vocabulary);
  }

  canAddVocabulary(): boolean {

    if (this.user.superuser) {
      return true;
    }

    return this.user.getOrganizations(['ADMIN', 'TERMINOLOGY_EDITOR']).size > 0;
  }

  canEditOrganizationsIds(): UUID[]|'ALL' {

    if (this.user.superuser) {
      return 'ALL';
    }

    return Array.from(this.user.getOrganizations(['ADMIN', 'TERMINOLOGY_EDITOR']));
  }
}
