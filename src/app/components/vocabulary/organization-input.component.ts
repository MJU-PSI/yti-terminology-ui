import { Component, Input } from '@angular/core';
import { OrganizationNode } from '../../entities/node';
import { TermedService } from '../../services/termed.service';
import { EditableService } from '../../services/editable.service';
import { replaceMatching } from '../../utils/array';
import { FormReferenceLiteral } from '../../services/form-state';

@Component({
  selector: 'app-organization-input',
  template: `

    <span *ngIf="!editing">{{reference.singleValue.label | translateValue:false}}</span>
    
    <div *ngIf="editing && organizations" class="form-group" [ngClass]="{'has-danger': valueInError()}">
      <div>
        <select class="form-control" [formControl]="reference.control">
          <option *ngIf="reference.valueEmpty" [ngValue]="null" translate>No organization</option>
          <option *ngFor="let organization of organizations" [ngValue]="organization">{{organization.label | translateValue:false}}</option>
        </select>

        <app-error-messages [control]="reference.control"></app-error-messages>
      </div>
    </div>
  `
})
export class OrganizationInputComponent {

  @Input() reference: FormReferenceLiteral<OrganizationNode>;
  organizations: OrganizationNode[];

  constructor(private editableService: EditableService,
              termedService: TermedService) {

    editableService.editing$.subscribe(editing => {

      if (editing && !this.organizations) {
        termedService.getOrganizationList().subscribe(organizations => {

          const organization = this.reference.singleValue;

          if (organization) {
            replaceMatching(organizations, o => o.id === organization.id, organization);
          }

          this.organizations = organizations;
        });
      }
    });
  }

  valueInError() {
    return !this.reference.control.valid;
  }

  get editing() {
    return this.editableService.editing;
  }
}
