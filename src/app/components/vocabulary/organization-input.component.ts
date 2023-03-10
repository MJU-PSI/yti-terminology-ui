import { Component, Input } from '@angular/core';
import { OrganizationNode, VocabularyNode } from 'app/entities/node';
import { EditableService } from 'app/services/editable.service';
import { FormReferenceLiteral } from 'app/services/form-state';
import { SearchOrganizationModalService } from './search-organization-modal.component';
import { ignoreModalClose } from '@mju-psi/yti-common-ui';
import { AuthorizationManager } from 'app/services/authorization-manager.sevice';
import { LanguageService } from 'app/services/language.service';

@Component({
  selector: 'app-organization-input',
  styleUrls: ['./organization-input.component.scss'],
  template: `
    <ul *ngIf="!editing">
      <li *ngFor="let organization of reference.value">{{organization.label | translateValue:true}}</li>
    </ul>

    <div *ngIf="editing" [appDragSortable]="reference" [dragDisabled]="!canReorder()">
      <div *ngFor="let organization of reference.value; let i = index"
           class="removable-text"
           [appDragSortableItem]="organization"
           [index]="i">
        <a><i class="fa fa-times"
              [id]="id + '_' + organization.getIdIdentifier(languageService) + '_remove_organization_reference_link'" (click)="removeReference(organization)"></i></a>
        <span>{{organization.label | translateValue:true}}</span>
      </div>
      <app-error-messages [id]="id + '_error_messages'" [control]="reference.control"></app-error-messages>
    </div>

    <button type="button"
            [id]="id + '_add_organization_button'"
            class="btn btn-sm btn-action mt-2"
            *ngIf="editing"
            (click)="addReference()" translate>Add organization</button>
  `
})
export class OrganizationInputComponent {

  @Input() id: string;
  @Input() vocabulary: VocabularyNode;
  @Input() reference: FormReferenceLiteral<OrganizationNode>;

  constructor(private editableService: EditableService,
              private searchOrganizationModal: SearchOrganizationModalService,
              private authorizationManager: AuthorizationManager,
              public languageService: LanguageService) {
  }

  get editing() {
    return this.editableService.editing;
  }

  removeReference(organization: OrganizationNode) {
    this.reference.removeReference(organization);
  }

  addReference() {

    const canEditOnlyOrganizations = this.authorizationManager.canEditOrganizationsIds();
    const allowOnlyOrganizationIds = canEditOnlyOrganizations === 'ALL' ? null : canEditOnlyOrganizations;
    const restrictOrganizationIds = this.reference.value.map(({ id }) => id);

    this.searchOrganizationModal.open(restrictOrganizationIds, allowOnlyOrganizationIds)
      .then(result => this.reference.addReference(result), ignoreModalClose);
  }

  canReorder() {
    return this.editing && this.reference.value.length > 1;
  }
}
