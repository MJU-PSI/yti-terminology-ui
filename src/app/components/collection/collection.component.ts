import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { EditableService, EditingComponent } from 'app/services/editable.service';
import { ConceptViewModelService } from 'app/services/concept.view.service';
import { Subscription } from 'rxjs';
import { DeleteConfirmationModalService } from 'app/components/common/delete-confirmation-modal.component';
import { requireDefined } from '@mju-psi/yti-common-ui';
import { LanguageService } from 'app/services/language.service';
import { FormField } from 'app/services/form-state';
import { collectionIdPrefix } from 'app/utils/id-prefix';

@Component({
  selector: 'app-collection',
  styleUrls: ['./collection.component.scss'],
  providers: [EditableService],
  template: `
    <div class="component" *ngIf="collection">

      <div class="component-header">
        <h3>{{collection.label | translateValue}}</h3>
      </div>

      <form #form="ngForm" [formGroup]="formNode.control" class="component-content">

        <div class="top-actions">

          <app-status *ngIf="collection.hasStatus()"
                      [status]="collection.status"
                      class="float-left"></app-status>

            <app-editable-buttons [vocabulary]="vocabulary"
                                  [form]="form"
                                  [canRemove]="true"
                                  [idPrefix]="idPrefix"></app-editable-buttons>

        </div>

        <div class="row">

          <ng-container *ngFor="let field of fields" [ngSwitch]="field.value.fieldType">

            <app-property *ngSwitchCase="'property'"
                          class="col-md-12"
                          [property]="field.value"
                          [id]="idPrefix + '_' + field.name"
                          [filterLanguage]="filterLanguage"></app-property>

            <app-reference *ngSwitchCase="'reference'"
                           class="col-md-12"
                           [reference]="field.value"
                           [id]="idPrefix + '_' + field.name"
                           [unsaved]="unsaved"
                           [filterLanguage]="filterLanguage"
                           [vocabulary]="vocabulary"></app-reference>

          </ng-container>

        </div>

        <app-meta-information [hidden]="!collection.persistent" [node]="collection"></app-meta-information>

      </form>

    </div>

    <app-ajax-loading-indicator *ngIf="!collection"></app-ajax-loading-indicator>
  `
})
export class CollectionComponent implements EditingComponent, OnDestroy {

  private subscriptionToClean: Subscription[] = [];
  idPrefix: string = collectionIdPrefix

  constructor(private route: ActivatedRoute,
              private conceptViewModel: ConceptViewModelService,
              deleteConfirmationModal: DeleteConfirmationModalService,
              private editableService: EditableService,
              private languageService: LanguageService) {

    route.params.subscribe(params => conceptViewModel.initializeCollection(params['collectionId']));
    editableService.onSave = () => this.conceptViewModel.saveCollection();
    editableService.onCanceled = () => this.conceptViewModel.resetCollection();
    editableService.onRemove = () =>
      deleteConfirmationModal.open(requireDefined(this.collection))
        .then(() => this.conceptViewModel.removeCollection());

    this.subscriptionToClean.push(this.conceptViewModel.resourceSelect$.subscribe(collection => {
      if (!collection.persistent && !editableService.editing) {
        editableService.edit();
      } else if (collection.persistent && editableService.editing) {
        editableService.cancel();
      }
    }));
  }

  get showEmpty() {
    return this.editableService.editing;
  }

  get fields() {

    const hasContent = (field: FormField) =>
      this.filterLanguage ? field.hasContentForLanguage(this.filterLanguage)
                          : !field.valueEmpty;

    return this.formNode.fields.filter(f => this.showEmpty || hasContent(f.value));
  }

  get formNode() {
    return this.conceptViewModel.resourceForm!;
  }

  get unsaved() {
    const collection = this.conceptViewModel.collection;
    return collection && !collection.persistent;
  }

  ngOnDestroy() {
    for (const subscription of this.subscriptionToClean) {
      subscription.unsubscribe();
    }
  }

  get collection() {
    return this.conceptViewModel.collection!;
  }

  isEditing(): boolean {
    return this.editableService.editing;
  }

  cancelEditing(): void {
    this.editableService.cancel();
  }

  get filterLanguage() {
    return this.languageService.filterLanguage;
  }

  get vocabulary() {
    return this.conceptViewModel.vocabulary;
  }
}
