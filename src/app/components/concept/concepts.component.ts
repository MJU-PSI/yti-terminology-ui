import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { ConceptViewModelService } from '../../services/concept.view.service';
import { SessionService } from '../../services/session.service';
import { ConceptNetworkComponent } from '../visualization/concept-network.component';
import { EditingComponent } from '../../services/editable.service';
import { VocabularyComponent } from '../vocabulary/vocabulary.component';

@Component({
  selector: 'concepts',
  styleUrls: ['./concepts.component.scss'],
  providers: [ConceptViewModelService],
  template: `
    <div class="container-fluid">

      <div class="row" [hidden]="viewModel.loadingVocabulary">
        <div class="col-12">
          <vocabulary #vocabularyComponent></vocabulary>
        </div>
      </div>

      <div class="bottom">
      
        <div class="panel-left">
          <div float>
            <ngb-tabset>
              <ngb-tab>
                <template ngbTabTitle>
                  <i class="fa fa-sort-alpha-asc"></i>
                  <p>{{'Alphabetic' | translate}}</p>
                </template>
                <template ngbTabContent>
                  <concept-list></concept-list>
                </template>
              </ngb-tab>
              <ngb-tab>
                <template ngbTabTitle>
                  <i class="fa fa-sitemap"></i>
                  <p>{{'Hierarchical' | translate}}</p>
                </template>
                <template ngbTabContent>
                  <concept-hierarchy></concept-hierarchy>
                </template>
              </ngb-tab>
              <ngb-tab>
                <template ngbTabTitle>
                  <i class="fa fa-clone"></i>
                  <p>{{'Collection' | translate}}</p>
                </template>
                <template ngbTabContent>
                  <collection-list></collection-list>
                </template>
              </ngb-tab>
            </ngb-tabset>
          </div>
        </div>

        <div class="panel-right">
          
          <div class="selection-container" [style.width]="selectionWidth" [hidden]="!showSelection">
            <router-outlet></router-outlet>
          </div>

          <div class="visualization-container" [style.width]="visualizationWidth" [hidden]="!showVisualization">
            <div float [setWidth]="false">
              <divider *ngIf="showDivider"></divider>
              <concept-network #network [class.without-divider]="!showDivider"></concept-network>
            </div>
          </div>
          
        </div>

      </div>
    
    </div>
  `
})
export class ConceptsComponent implements EditingComponent, OnInit {

  @ViewChild('network') conceptNetwork: ConceptNetworkComponent;
  @ViewChild('vocabularyComponent') vocabularyComponent: VocabularyComponent;

  constructor(private route: ActivatedRoute,
              public viewModel: ConceptViewModelService,
              private sessionService: SessionService,
              private domSanitizer: DomSanitizer) {
  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.viewModel.initializeVocabulary(params['graphId']);
    });
  }

  get showDivider() {
    return this.showSelection;
  }

  get showSelection() {
    return this.viewModel.selection;
  }

  get showVisualization() {
    return !this.conceptNetwork.isEmpty();
  }

  get selectionWidth() {
    return this.sessionService.selectionWidth + 'px';
  }

  get visualizationWidth() {
    return this.domSanitizer.bypassSecurityTrustStyle(
      this.showSelection ? `calc(100% - ${this.sessionService.selectionWidth}px)` : '100%'
    );
  }

  isEditing(): boolean {
    return this.vocabularyComponent.isEditing();
  }

  cancelEditing() {
    this.vocabularyComponent.cancelEditing();
  }
}

