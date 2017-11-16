import { Component, AfterViewInit, ElementRef, ViewChild, Renderer } from '@angular/core';
import { CollectionNode } from '../../entities/node';
import { CollectionListModel, ConceptViewModelService } from '../../services/concept.view.service';
import { Router } from '@angular/router';
import { v4 as uuid } from 'uuid';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-collection-list',
  styleUrls: ['./collection-list.component.scss'],
  template: `
    <div class="row">
      <div class="col-lg-12">

        <div class="actions">

          <button class="button btn-default btn-add-new" (click)="addCollection()" *ngIf="canAddCollection()">
            <i class="fa fa-plus"></i>
            <span translate>Add collection</span>
          </button>

          <div class="input-group input-group-lg input-group-search">
            <input #searchInput
                   [(ngModel)]="search"
                   type="text"
                   class="form-control"
                   [placeholder]="'Search collection...' | translate" />
          </div>
          
        </div>

      </div>
    </div>

    <div class="row">
      <div class="col-lg-12 search-results">
        <ul [ngClass]="{'has-button': canAddCollection()}">
          <li *ngFor="let collection of searchResults | async; trackBy: collectionIdentity" 
              (click)="navigate(collection)" 
              [class.selection]="isSelected(collection)">
            <span [innerHTML]="collection.label | translateSearchValue: debouncedSearch | highlight: debouncedSearch"></span>
          </li>
        </ul>
      </div>
    </div>
  `
})
export class CollectionListComponent implements AfterViewInit {

  @ViewChild('searchInput') searchInput: ElementRef;

  model: CollectionListModel;

  constructor(private userService: UserService,
              private conceptViewModel: ConceptViewModelService,
              private renderer: Renderer,
              private router: Router) {

    this.model = conceptViewModel.collectionList;
  }

  ngAfterViewInit() {
    this.renderer.invokeElementMethod(this.searchInput.nativeElement, 'focus');
  }

  collectionIdentity(index: number, item: CollectionNode) {
    return item.id + item.lastModifiedDate.toISOString();
  }

  canAddCollection() {
    return this.userService.isLoggedIn();
  }

  get search() {
    return this.model.search$.getValue();
  }

  set search(value: string) {
    this.model.search$.next(value);
  }

  get searchResults() {
    return this.model.searchResults;
  }

  get debouncedSearch() {
    return this.model.debouncedSearch;
  }

  navigate(collection: CollectionNode) {
    this.router.navigate(['/concepts', collection.graphId, 'collection', collection.id]);
  }

  addCollection() {
    this.router.navigate(['/concepts', this.conceptViewModel.graphId, 'collection', uuid()]);
  }

  isSelected(collection: CollectionNode) {
    return this.conceptViewModel.collectionId === collection.id;
  }
}
