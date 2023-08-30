import { Component, Input, ViewChild  } from '@angular/core';
import { NgbTypeahead } from '@ng-bootstrap/ng-bootstrap';
import { AnnotationNode } from 'app/entities/node';
import { EditableService } from 'app/services/editable.service';
import { FormPropertyLiteral } from 'app/services/form-state';
import { LanguageService } from 'app/services/language.service';
import { TermedService } from 'app/services/termed.service';
import { Observable, OperatorFunction, Subject, from, merge, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, switchMap } from 'rxjs/operators';

@Component({
  styleUrls: ['./input-annotation-id.component.scss'],
  selector: 'app-input-annotation-id',
  template: `

    <dl *ngIf="show">
      <dt>
        <label [for]="id">
          {{label | translateValue:true}}
          <span *ngIf="hasDescription()"
                class="fa fa-info-circle info"
                ngbTooltip="{{description | translateValue:true}}"></span>
        </label>
        <app-required-symbol *ngIf="!disabled && editing && property.required"></app-required-symbol>
      </dt>

      <div *ngIf="!editing">

          <div class="other-type-value">
            {{property.value}}
          </div>

      </div>

      <div *ngIf="editing">

        <div class="form-group">

          <input  #instance="ngbTypeahead"
            (focus)="focus$.next($any($event).target.value)"
            (click)="click$.next($any($event).target.value)"
            container="body"
            [ngbTypeahead]="search"
            type="text"
            class="form-control"
            [ngClass]="{'is-invalid': valueInError()}"
            [id]="id + '_input'"
            autocomplete="off"
            [formControl]="property.control" />

        </div>

      </div>
    </dl>
  `
})
export class InputAnnotationIdComponent {

  @Input() id: string;
  @Input() property: FormPropertyLiteral;

  @ViewChild('instance', { static: true }) instance: NgbTypeahead;
	focus$ = new Subject<string>();
	click$ = new Subject<string>();

  constructor(
    private editableService: EditableService,
    private termedService: TermedService,
    public languageService: LanguageService
  ) { }


  get show() {
    return this.editableService.editing || !this.property.valueEmpty;
  }

  valueInError() {
    return !this.property.control.disabled && !this.property.control.valid;
  }

  get label() {
    return this.property.label;
  }

  get disabled(){
    return this.property.control.disabled;
  }

  hasDescription() {
    return Object.values(this.property.description).length > 0;
  }

  get description() {
    return this.property.description;
  }

  get editing() {
    return this.editableService.editing;
  }

  datasource = (_search: string) => this.termedService.getAnnotationList();

  search: OperatorFunction<string, readonly string[]>  = (text$: Observable<string>) => {
		const debouncedText$ = text$.pipe(debounceTime(200), distinctUntilChanged());
		const inputFocus$ = this.focus$;

		return merge(debouncedText$, inputFocus$).pipe(
			switchMap((searchText: string) => {
        return from(this.datasource(searchText)).pipe(
          catchError(() => of([])),
          map((annotations: AnnotationNode[]) => {

            const annotationsIds = [...new Set(annotations.map(annotation => annotation.label))];

            return annotationsIds
              .filter((annotationsId: string) => this.filterResult(annotationsId, searchText))
          })
        )
      }),
		);
	};

  filterResult(annotationId: string, searchText: string): boolean {
    const identifier = annotationId.toLowerCase();
    return identifier.includes(searchText.toLowerCase());
  }
}
