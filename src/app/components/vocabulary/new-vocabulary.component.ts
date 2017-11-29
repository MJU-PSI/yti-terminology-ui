import { Component } from '@angular/core';
import { MetaModelService } from '../../services/meta-model.service';
import { v4 as uuid } from 'uuid';
import { VocabularyNode } from '../../entities/node';
import { EditableService } from '../../services/editable.service';
import { Router } from '@angular/router';
import { TermedService } from '../../services/termed.service';
import { GraphMeta } from '../../entities/meta';
import { TranslateService } from 'ng2-translate';
import { LanguageService } from '../../services/language.service';
import { FormNode } from '../../services/form-state';
import { defaultLanguages } from '../../utils/language';
import { FormControl, Validators, AbstractControl, AsyncValidatorFn } from '@angular/forms';
import { firstMatching } from '../../utils/array';

@Component({
  selector: 'app-new-vocabulary',
  styleUrls: ['./new-vocabulary.component.scss'],
  providers: [EditableService],
  template: `
    <div class="container-fluid">

      <app-ajax-loading-indicator *ngIf="!vocabulary"></app-ajax-loading-indicator>

      <div *ngIf="vocabulary">

        <form #form="ngForm" [formGroup]="formNode.control">

          <div class="row">
            <div class="col-6">
              <dl>
                <dt><label for="vocabularyType" translate>Vocabulary type</label></dt>
                <dd>
                  <select class="form-control"
                          id="vocabularyType"
                          [formControl]="templateControl">
                    <option *ngFor="let templateMeta of templates" [ngValue]="templateMeta">
                      {{templateMeta.label | translateValue:false}}
                    </option>
                  </select>
                </dd>
              </dl>
            </div>

            <div class="col-6">
              <div class="top-actions">
                <app-editable-buttons [form]="form" 
                                      [canRemove]="false"></app-editable-buttons>
              </div>
            </div>
          </div>
          
          <app-vocabulary-form [vocabulary]="vocabulary" [form]="formNode"></app-vocabulary-form>
          <app-prefix-input [formControl]="prefixFormControl"></app-prefix-input>
        </form>

      </div>

    </div>
  `
})
export class NewVocabularyComponent {

  vocabulary: VocabularyNode;
  templates: GraphMeta[];
  formNode: FormNode;
  templateControl = new FormControl();
  prefixFormControl: FormControl;

  constructor(private router: Router,
              private metaModelService: MetaModelService,
              private termedService: TermedService,
              private translateService: TranslateService,
              private languageService: LanguageService,
              public editableService: EditableService) {

    editableService.edit();
    editableService.onSave = () => this.saveVocabulary();
    editableService.onCanceled = () => router.navigate(['/']);

    this.templateControl.valueChanges.subscribe(() => this.createVocabulary());

    metaModelService.getMetaTemplates().subscribe(templates => {
      this.templates = templates;
      this.selectedTemplate = this.templates[0];
    });
  }

  createVocabulary() {

    const label = this.translateService.instant('New vocabulary');
    const templateGraphId = this.selectedTemplate.graphId;
    const vocabularyId = uuid();

    this.metaModelService.getMeta(templateGraphId).subscribe(templateMetaModel => {

      this.vocabulary = templateMetaModel.createEmptyVocabulary(templateGraphId, vocabularyId);
      this.vocabulary.prefLabel = [ { lang: this.languageService.language, value: label } ];

      // TODO all meta models don't define language but they should
      if (this.vocabulary.hasLanguage()) {
        this.vocabulary.languages = defaultLanguages.slice();
      }

      const languageProvider = () => {
        const languageProperty = firstMatching(this.formNode.properties, property => property.name === 'language');
        return languageProperty ? languageProperty.value.value.filter((v: string) => !!v) : defaultLanguages;
      };

      this.formNode = new FormNode(this.vocabulary, languageProvider);

      this.prefixFormControl = new FormControl('', [Validators.required, this.isPrefixLowerCaseValidator], this.isPrefixInUseValidator());
      this.formNode.control.addControl('prefix', this.prefixFormControl);
    });
  }

  get selectedTemplate(): GraphMeta {
    return this.templateControl.value;
  }

  set selectedTemplate(value: GraphMeta) {
    this.templateControl.setValue(value);
  }

  saveVocabulary(): Promise<any> {

    const that = this;
    const vocabulary = this.vocabulary.clone();
    this.formNode.assignChanges(vocabulary);

    return new Promise((resolve, reject) => {
      this.termedService.createVocabulary(this.selectedTemplate.graphId, vocabulary, this.prefixFormControl.value)
        .subscribe({
          next: (graphId) => that.router.navigate(['/concepts', graphId]),
          error: (err: any) => reject(err)
        });
    });
  }

  isPrefixInUseValidator(): AsyncValidatorFn {
    return (control: AbstractControl) => {
      const validationError = {
        prefixInUse: {
          valid: false
        }
      };
      return this.termedService.isNamespaceInUse(control.value)
        .map(inUse => inUse ? validationError : null);
    }
  }

  isPrefixLowerCaseValidator (control: AbstractControl) {
    const lowerCase = control.value === control.value.toLowerCase();
    return !lowerCase ? {'upperCaseInPrefix': {value: control.value}} : null;
  }
}