import { Component, Injectable, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Localization } from 'yti-common-ui/types/localization';
import { containsAny, flatten, firstMatching, anyMatching, contains } from 'yti-common-ui/utils/array';
import { ConceptNode, VocabularyNode } from 'app/entities/node';
import { MetaModelService } from 'app/services/meta-model.service';
import { MetaModel, NodeMeta } from 'app/entities/meta';
import { TermedService } from 'app/services/termed.service';
import * as Papa from 'papaparse';
import { ModalService } from 'app/services/modal.service';
import { Status } from 'yti-common-ui/entities/status';
import { v4 as uuid } from 'uuid';
import { requireDefined } from 'yti-common-ui/utils/object';

class CsvConceptDetails {

  id = uuid();

  constructor(public prefLabel: Localization[],
              public definition: Localization[],
              public note: Localization[],
              public example: Localization[],
              public synonym: Localization[],
              public broader: Localization[],
              public related: Localization[],
              public isPartOf: Localization[],
              public status: Status,
              public lineNumber: number) {
  }

  static createFromCsvRow(csvJsonObject: any, lineNumber: number): CsvConceptDetails {

    function splitValuesAsOwnLocalizations(localization: Localization): Localization[] {
      return localization.value.split('\r\n').map(v => ({ lang: localization.lang, value: v}));
    }

    function parseLocalizationsForProperty(propertyName: string): Localization[] {

      const entriesRelatedToProperty = Object.entries(csvJsonObject)
        .filter(([key, value]) => key.startsWith(propertyName) && value !== '');

      const localizations = entriesRelatedToProperty.map(([key, value]) => {
        return {
          lang: key.replace(propertyName + '_', ''),
          value: value
        };
      });

      return flatten(localizations.map(localization => splitValuesAsOwnLocalizations(localization)));
    }

    return new CsvConceptDetails(
      parseLocalizationsForProperty('prefLabel'),
      parseLocalizationsForProperty('definition'),
      parseLocalizationsForProperty('note'),
      parseLocalizationsForProperty('example'),
      parseLocalizationsForProperty('synonym'),
      parseLocalizationsForProperty('broader'),
      parseLocalizationsForProperty('related'),
      parseLocalizationsForProperty('isPartOf'),
      (csvJsonObject['status'] || 'DRAFT') as Status,
      lineNumber
    );
  }

  get nonEmptyProperties(): ConceptProperty[] {

    const propertyIsNotEmpty = (localizations: Localization[]) => localizations.length > 0;

    const allProperties = [
      { name: 'prefLabel', localizations: this.prefLabel, type: '' },
      { name: 'definition', localizations: this.definition, type: 'property' },
      { name: 'note', localizations: this.note, type: 'property' },
      { name: 'example', localizations: this.example, type: 'property' },
      { name: 'synonym', localizations: this.synonym, type: 'property' },
      { name: 'broader', localizations: this.broader, type: 'reference' },
      { name: 'related', localizations: this.related, type: 'reference' },
      { name: 'isPartOf', localizations: this.isPartOf, type: 'reference' }
    ];

    return allProperties.filter(property => propertyIsNotEmpty(property.localizations));
  }

  get conceptStatus() {
    return this.status;
  }
}

interface ConceptProperty {
  name: string;
  localizations: Localization[];
  type: string;
}

function localizationsAreEqual(lhs: Localization, rhs: Localization): boolean {
  return lhs.value === rhs.value && lhs.lang === rhs.lang;
}

@Injectable()
export class ImportVocabularyModalService {

  constructor(private modalService: ModalService) {
  }

  open(importFile: File, vocabulary: VocabularyNode): Promise<any> {
    const modalRef = this.modalService.open(ImportVocabularyModalComponent, { size: 'lg' });
    const instance = modalRef.componentInstance as ImportVocabularyModalComponent;
    instance.importFile = importFile;
    instance.vocabulary = vocabulary;
    return modalRef.result;
  }
}

@Component({
  selector: 'app-import-vocabulary-modal',
  styleUrls: ['./import-vocabulary-modal.component.scss'],
  template: `
    <div *ngIf="uploading">
      <app-ajax-loading-indicator></app-ajax-loading-indicator>
    </div>

    <div *ngIf="!uploading">
      <div class="modal-header">
        <h4 class="modal-title">
          <a><i class="fa fa-times" id="cancel_import_link" (click)="cancel()"></i></a>
          <span translate>Confirm import</span>
        </h4>
      </div>
      <div class="modal-body full-height">
        <div class="row mb-2">
          <div class="col-md-12">

            <h6>
              <span translate>Importing</span> {{numberOfConcepts}} <span translate>concepts</span>
            </h6>

            <div *ngIf="invalid" class="alert alert-danger">
              <span class="fa fa-exclamation-circle" aria-hidden="true"></span>
              <span translate>Import is not allowed because some of the concepts lack preferred term.</span>
              <span translate>Line numbers in the import file</span>: {{lineNumbersOfEmptyPrefLabels}}
            </div>

            <div class="search-results">
              <div class="search-result" *ngFor="let concept of conceptsFromCsv">
                <div class="content">
                  <div *ngFor="let property of concept.nonEmptyProperties; let last = last"
                       [class.last]="last">
                    <div *ngIf="showNonEmptyProperty(property)">
                      <dl>
                        <dt><label class="name">{{property.name | translate}}</label></dt>
                        <dd>
                          <div class="localized" *ngFor="let localization of getPropertyLocalizations(property)">
                            <div class="language">{{localization.lang.toUpperCase()}}</div>
                            <div class="localization">{{localization.value}}</div>
                          </div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                  <dl>
                    <dt><label class="name" translate>Concept status</label></dt>
                    <dd>{{concept.conceptStatus | translate}}</dd>
                  </dl>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

      <div class="modal-footer">
        <button type="button" id="import_yes_button" class="btn btn-action confirm" (click)="confirm()" [disabled]="invalid" translate>Yes</button>
        <button type="button" id="import_cancel_button" class="btn btn-link cancel" (click)="cancel()" translate>Cancel</button>

        <div class="alert alert-danger modal-alert" id="import_error_modal" role="alert" *ngIf="importError">
          <span class="fa fa-exclamation-circle" aria-hidden="true"></span>
          <span translate>Import failed</span>
        </div>
      </div>
    </div>
  `
})
export class ImportVocabularyModalComponent implements OnInit {

  @Input() importFile: File;
  @Input() vocabulary: VocabularyNode;

  conceptsFromCsv: CsvConceptDetails[] = [];
  metaModel: MetaModel;
  conceptMeta: NodeMeta;
  importError = false;
  uploading = false;

  constructor(private modal: NgbActiveModal,
              private metaModelService: MetaModelService,
              private termedService: TermedService) {
  }

  ngOnInit(): void {

    this.uploading = true;

    this.metaModelService.getMeta(this.vocabulary.graphId)
      .subscribe(metaModel => {

        this.metaModel = metaModel;
        this.conceptMeta = metaModel.getNodeMeta(this.vocabulary.graphId, 'Concept');

        Papa.parse(this.importFile, {
          header: true,
          skipEmptyLines: true,
          newline: '\r\n',
          complete: results => {
            this.conceptsFromCsv = results.data.map((datum, index) => CsvConceptDetails.createFromCsvRow(datum, index + 2));
            this.uploading = false;
          }
        });
      });
  }

  get numberOfConcepts() {
    return this.conceptsFromCsv.length;
  }

  get conceptsWithEmptyPrefLabels() {
    return this.conceptsFromCsv.filter(concept => concept.prefLabel.length === 0);
  }

  get numberOfConceptsWithEmptyPrefLabels() {
    return this.conceptsWithEmptyPrefLabels.length;
  }

  get lineNumbersOfEmptyPrefLabels() {
    return this.conceptsWithEmptyPrefLabels.map(concept => concept.lineNumber).join(', ');
  }

  get invalid() {
    return this.numberOfConceptsWithEmptyPrefLabels > 0;
  }

  showNonEmptyProperty(property: ConceptProperty) {

    if (property.type === 'reference') {
      return this.conceptMeta.hasReference(property.name) && this.getPropertyLocalizations(property).length > 0
    } else {
      return true;
    }
  }

  getPropertyLocalizations(property: ConceptProperty) {

    return property.localizations.filter(localization =>
      property.type !== 'reference' || this.isReferenceConceptFound(localization));
  }

  isReferenceConceptFound(localization: Localization) {

    return anyMatching(this.conceptsFromCsv, conceptFromCsv =>
      contains(conceptFromCsv.prefLabel, localization, localizationsAreEqual));
  }

  convertToConceptNodeWithoutReferences(conceptFromCsv: CsvConceptDetails): ConceptNode {

    const concept: ConceptNode = this.metaModel.createEmptyConcept(this.vocabulary, conceptFromCsv.id);

    concept.prefLabel = conceptFromCsv.prefLabel;
    concept.definition = conceptFromCsv.definition;
    concept.note = conceptFromCsv.note;
    concept.example = conceptFromCsv.example;
    concept.altLabel = conceptFromCsv.synonym;

    if (concept.hasStatus()) {
      concept.status = conceptFromCsv.status;
    }

    return concept;
  }

  createConceptNodesToSave(): ConceptNode[] {

    const nodes = this.conceptsFromCsv.map(concept => this.convertToConceptNodeWithoutReferences(concept));

    for (const conceptFromCsv of this.conceptsFromCsv) {

      const concept = requireDefined(firstMatching(nodes, n => n.id === conceptFromCsv.id));

      const isMatchingNode = (label: Localization[]) => (node: ConceptNode) =>
        containsAny(node.prefLabel, label, localizationsAreEqual);

      if (concept.hasBroaderConcepts()) {
        for (const broader of nodes.filter(isMatchingNode(conceptFromCsv.broader))) {
          concept.addBroaderConcept(broader);
        }
      }

      if (concept.hasRelatedConcepts()) {
        for (const related of nodes.filter(isMatchingNode(conceptFromCsv.related))) {
          concept.addRelatedConcept(related);
        }
      }

      if (concept.hasIsPartOfConcepts()) {
        for (const isPartOf of nodes.filter(isMatchingNode(conceptFromCsv.isPartOf))) {
          concept.addIsPartOfConcept(isPartOf);
        }
      }
    }

    return nodes;
  }

  cancel() {
    this.modal.dismiss('cancel');
  }

  confirm() {

    this.uploading = true;

    this.termedService.saveNodes(this.createConceptNodesToSave())
      .subscribe({
        next: () => this.modal.close(),
        error: () => {
          this.importError = true;
          this.uploading = false;
        }
      });
  }
}
