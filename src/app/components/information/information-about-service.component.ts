import { Component } from '@angular/core';
import { LocationService } from '../../services/location.service';
import { Subscription } from 'rxjs';
import { LangChangeEvent, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-information-about-service',
  styleUrls: ['./information-about-service.component.scss'],
  templateUrl: './information-about-service.component.html',
})

export class InformationAboutServiceComponent {
  currentLang: String;
  langChangeSubscription: Subscription;

  constructor(private locationService: LocationService, private translateService: TranslateService) {
    locationService.atInformationAboutService();

    this.currentLang = translateService.currentLang;

    this.langChangeSubscription = translateService.onLangChange.subscribe((event: LangChangeEvent) => {
      this.currentLang = event.lang;
    })
  }

  ngOnDestroy(): void {
    this.langChangeSubscription.unsubscribe();
  }
}
