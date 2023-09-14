import { Component, forwardRef, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-filter-language',
  styleUrls: ['./filter-language.component.scss'],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => FilterLanguageComponent),
    multi: true
  }],
  template: `
    <div ngbDropdown [placement]="'bottom-right'">
      <button class="btn btn-language" id="filter_language_dropdown_button" (click)="updateOptions()" ngbDropdownToggle>{{selectionName}}</button>
      <div ngbDropdownMenu aria-labelledby="filter_language_dropdown_button">
        <button class="dropdown-item"
                [class.active]="option.lang === selection"
                *ngFor="let option of options"
                [id]="getLangSelectionId(option.lang)"
                (click)="writeValue(option.lang)">
          {{option.name}}
        </button>
      </div>
    </div>
  `
})
export class FilterLanguageComponent implements ControlValueAccessor, OnInit, OnDestroy {

  @Input() languages: string[];
  options: { lang: string, name: string }[];

  control = new FormControl();

  private propagateChange: (fn: any) => void = () => {};
  private propagateTouched: (fn: any) => void = () => {};

  private subscriptions: Subscription[] = [];

  constructor(private translateService: TranslateService) {
    this.subscriptions.push(this.control.valueChanges.subscribe(x => this.propagateChange(x)));
    this.subscriptions.push(translateService.onLangChange.subscribe(() => this.updateOptions()));
  }

  ngOnInit(): void {
    this.updateOptions();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  updateOptions(): void {
    this.options = ['', ...this.languages].map(lang => ({
      lang: lang,
      name: this.languageToOptionName(lang)
    }));
  }

  get selection() {
    return this.control.value;
  }

  get selectionName() {
    return this.languageToSelectionName(this.selection);
  }

  getLangSelectionId(lang: string) {
    return lang ? lang + '_lang_selection_button' : 'all_lang_selection_button';
  }

  writeValue(obj: any): void {
    this.control.setValue(obj);
  }

  registerOnChange(fn: any): void {
    this.propagateChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.propagateTouched = fn;
  }

  private languageToSelectionName(lang: string) {
    return lang ? lang.toUpperCase()
                : this.translateService.instant('Content language');
  }

  private languageToOptionName(lang: string) {
    return lang ? this.translateService.instant('Content in') + ' '  + lang.toUpperCase()
                : this.translateService.instant('Content in all languages');
  }
}
