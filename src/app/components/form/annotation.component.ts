import { Component, Input } from '@angular/core';
import { FormNode, FormProperty } from 'app/services/form-state';
import { EditableService } from 'app/services/editable.service';

@Component({
  selector: 'app-annotation',
  template: `
    <div class="row">
      <div class="col-md-12" [class.col-xl-6]="multiColumn" *ngFor="let property of properties">

        <ng-container [ngSwitch]="property.value.type">

          <app-input-annotation-id *ngSwitchCase="'primary'"
                        [id]="id"
                        [property]="property.value"></app-input-annotation-id>

          <app-property *ngSwitchDefault [id]="id + '_' + property.name"
                        [property]="property.value"
                        [filterLanguage]="filterLanguage"></app-property>
        </ng-container>
      </div>
    </div>
  `
})
export class AnnotationComponent {

  @Input() multiColumn: boolean;
  @Input() annotation: FormNode;
  @Input() filterLanguage: string;
  @Input() id: string;

  constructor(private editableService: EditableService) {
  }

  get showEmpty() {
    return this.editableService.editing;
  }

  get properties() {
     return this.annotation.properties;
  }
}
