import { Component, Input, OnInit } from '@angular/core';
import { FilterOptions } from 'yti-common-ui/components/filter-dropdown.component';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { TranslateService } from 'ng2-translate';
import { Status, selectableStatuses } from 'yti-common-ui/entities/status';

@Component({
  selector: 'app-status-filter-dropdown',
  template: `
    <app-filter-dropdown [options]="statusOptions"
                         [filterSubject]="filterSubject"></app-filter-dropdown>
  `
})
export class StatusFilterDropdownComponent implements OnInit {

  @Input() filterSubject: BehaviorSubject<Status|null>;

  statusOptions: FilterOptions<Status>;

  constructor(private translateService: TranslateService) {
  }

  ngOnInit() {
    this.statusOptions = [null, ...selectableStatuses].map(status => {
      return {
        value: status,
        name: () => this.translateService.instant(status ? status : 'All statuses')
      }
    });
  }
}
