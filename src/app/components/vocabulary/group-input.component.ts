import { Component, Input } from '@angular/core';
import { GroupNode } from 'app/entities/node';
import { EditableService } from 'app/services/editable.service';
import { FormReferenceLiteral } from 'app/services/form-state';
import { ignoreModalClose } from 'yti-common-ui/utils/modal';
import { SearchGroupModalService } from './search-group-modal.component';

@Component({
  selector: 'app-group-input',
  styleUrls: ['./group-input.component.scss'],
  template: `

    <ul *ngIf="!editing">
      <li *ngFor="let group of reference.value">{{group.label | translateValue:true}}</li>
    </ul>

    <div *ngIf="editing" [appDragSortable]="reference" [dragDisabled]="!canReorder()">
      <div *ngFor="let group of reference.value; let i = index">
        <a><i class="fa fa-times" (click)="removeReference(group)"></i></a>
        <span [appDragSortableItem]="group" [index]="i">{{group.label | translateValue:true}}</span>
      </div>
      <app-error-messages [control]="reference.control"></app-error-messages>
    </div>

    <button type="button"
            class="btn btn-sm btn-action mt-2"
            *ngIf="editing"
            (click)="addReference()" translate>Add classification</button>
  `
})
export class GroupInputComponent {

  @Input() reference: FormReferenceLiteral<GroupNode>;

  constructor(private editableService: EditableService,
              private searchGroupModal: SearchGroupModalService) {
  }

  get editing() {
    return this.editableService.editing;
  }

  removeReference(group: GroupNode) {
    this.reference.removeReference(group);
  }

  addReference() {

    const restricts = this.reference.value.map(({ id }) => id);

    this.searchGroupModal.open(restricts)
      .then(result => this.reference.addReference(result), ignoreModalClose);
  }

  canReorder() {
    return this.editing && this.reference.value.length > 1;
  }
}
