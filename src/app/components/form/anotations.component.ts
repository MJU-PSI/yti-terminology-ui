import { Component, Input, OnChanges,  } from '@angular/core';
import { EditableService } from 'app/services/editable.service';
import { AnnotationChild, FormReferenceAnnotation } from 'app/services/form-state';
import { MetaModelService } from 'app/services/meta-model.service';
import { last } from '@mju-psi/yti-common-ui';
import { LanguageService } from '../../services/language.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-annotations',
  styleUrls: ['./annotations.component.scss'],
  template: `

<div class="clearfix" *ngIf="canAdd()">
      <div ngbDropdown class="add-button" placement="bottom-right">
        <button class="btn btn-link"
                [id]="id + '_add_annotation_button'"
                (click)="addAnnotation()">
          <span>{{referenceAddLabel}}</span>
        </button>
      </div>
    </div>

    <ngb-accordion *ngIf="children.length > 0"
                   [activeIds]="openAnnotations"
                   [appDragSortable]="reference"
                   [dragDisabled]="!canReorder()">
      <ngb-panel *ngFor="let node of visibleChildren; let i = index">
        <ng-template ngbPanelTitle>
          <div class="localized annotation" [appDragSortableItem]="node" [index]="i">
            <div class="language fas fa-bars"></div>
            <div class="localization">
              <span>{{node.formNode.properties[0].value.value}}</span>
              <app-accordion-chevron class="float-right" [id]="id + '_' + i + '_annotation_accordion_chevron'"></app-accordion-chevron>
            </div>
            <div class="property-ordering" [hidden]="!editing">
              <i [id]="id + '_' + i + '_annotation_reorder_handle'" class="material-icons drag-icon">import_export</i>
            </div>
          </div>
        </ng-template>
        <ng-template ngbPanelContent>
          <div class="row">
            <div class="col-md-12">
              <app-status *ngIf="node.formNode.hasStatus()"
                          [status]="node.formNode.status"></app-status>
              <div *ngIf="canRemove()" class="remove-button">
                <button class="btn btn-link"
                        [id]="id + '_' + i + '_' + node.idIdentifier + '_remove_annotation_button'"
                        (click)="removeAnnotation(node)">
                  <i class="fa fa-trash"></i>
                  <span translate>Remove annotation</span>
                </button>
              </div>
            </div>
          </div>
          <app-annotation [id]="id + '_' + i" [annotation]="node.formNode" [filterLanguage]="filterLanguage"></app-annotation>
        </ng-template>
      </ngb-panel>
    </ngb-accordion>

    <div *ngIf="children.length === 0" translate>No annotations yet</div>
    `
})
export class AnnotationsComponent implements OnChanges {

  @Input() reference: FormReferenceAnnotation;
  @Input() unsaved: boolean;
  @Input() filterLanguage: string;
  @Input() id: string;

  openAnnotations: string[] = [];

  constructor(private editableService: EditableService,
              private metaModelModel: MetaModelService,
              public languageService: LanguageService,
              public translateService: TranslateService) {
  }

  ngOnChanges() {
    this.openAnnotations = this.unsaved && this.editableService.editing && this.reference.value.length > 0 ? [this.reference.value[0].id] : [];
  }

  get languages() {
    return this.reference.languagesProvider();
  }

  canAdd() {
    return this.editing;
  }

  canRemove() {
    return this.editing;
  }

  get children() {
    return this.reference.children;
  }

  get showEmpty() {
    return this.editing;
  }

  get editing() {
    return this.editableService.editing;
  }

  addAnnotation() {
    this.metaModelModel.getMeta(this.reference.graphId).subscribe(metaModel => {
      this.reference.addAnnotation(metaModel);
      this.openAnnotations.push(last(this.children).id);
    });
  }

  removeAnnotation(node: AnnotationChild) {
    this.reference.remove(node);
  }

  get visibleChildren() {
    return this.children;
  }

  isLanguageVisible(language: string) {
    return !this.filterLanguage || language === this.filterLanguage;
  }

  canReorder() {
    return this.editing && !this.filterLanguage && this.visibleChildren.length > 1;
  }

  get referenceAddLabel() {
    let referenceAdd = this.translateService.instant('Add ' + this.reference.id);
    if (referenceAdd && !referenceAdd.startsWith('[MISSING]')) {
      return referenceAdd;
    } else {
      return this.translateService.instant('Add') + ' ' + this.languageService.translate(this.reference.label, true).toLowerCase();
    }
  }
}
