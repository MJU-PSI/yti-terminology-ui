import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ConceptNode, VocabularyNode } from 'app/entities/node';
import { EditableService } from 'app/services/editable.service';
import { Restrict, SearchConceptModalService } from './search-concept-modal.component';
import { ignoreModalClose, isDefined, requireDefined } from '@vrk-yti/yti-common-ui';
import { FormReferenceLiteral } from 'app/services/form-state';

@Component({
  selector: 'app-concept-reference-input',
  styleUrls: ['./concept-reference-input.component.scss'],
  template: `
    <ul *ngIf="!editing">
      <li *ngFor="let concept of reference.value">
        <a [routerLink]="['/concepts', concept.graphId, 'concept', concept.id]"
           [id]="concept.idIdentifier + '_' + id + '_concept_reference_concept_link'">{{concept.label | translateValue}}</a>
      </li>
    </ul>

    <div *ngIf="editing" [appDragSortable]="reference" [dragDisabled]="!canReorder()">
      <div *ngFor="let concept of reference.value; let i = index"
           class="removable-text"
           [appDragSortableItem]="concept"
           [index]="i">
        <a><i class="fa fa-times" [id]="concept.idIdentifier + '_' + id + '_concept_reference_remove_reference_link'" (click)="removeReference(concept)"></i></a>
        <span> {{concept.label | translateValue}}</span>
      </div>
    </div>

    <button type="button"
            class="btn btn-sm btn-action"
            *ngIf="editing"
            (click)="addReference()" [id]="id + '_concept_reference_add_reference_button'" translate>Add concept</button>
  `
})
export class ConceptReferenceInputComponent {

  @Input() id: string;
  @Input() vocabulary: VocabularyNode;
  @Input() self?: ConceptNode;
  @Input() reference: FormReferenceLiteral<ConceptNode>;
  @Output('conceptRemove') conceptRemove = new EventEmitter<ConceptNode>();

  constructor(private editableService: EditableService,
              private searchConceptModal: SearchConceptModalService) {
  }

  get editing() {
    return this.editableService.editing;
  }

  removeReference(concept: ConceptNode) {
    this.reference.removeReference(concept);
    this.conceptRemove.emit(concept);
  }

  addReference() {

    const restricts: Restrict[] = [
      ...(isDefined(this.self) ? [{ graphId: this.self.graphId, conceptId: this.self.id, reason: 'self reference error'}] : []),
      ...this.reference.value.map(({ graphId, id }) => ({ graphId, conceptId: id, reason: 'already added error'}))
    ];

    this.searchConceptModal.openForVocabulary(requireDefined(this.vocabulary), '', restricts)
      .then(result => this.reference.addReference(result), ignoreModalClose);
  }

  canReorder() {
    return this.editing && this.reference.value.length > 1;
  }
}
