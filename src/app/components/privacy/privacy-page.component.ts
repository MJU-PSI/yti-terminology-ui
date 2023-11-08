import { Component } from '@angular/core';
import { LocationService } from '../../services/location.service';

@Component({
  selector: 'app-privacy-page',
  styleUrls: ['./privacy-page.component.scss'],
  templateUrl: './privacy-page.component.html',
})

export class PrivacyPageComponent {

  constructor(private locationService: LocationService) {
    locationService.atPrivacyPage();
  }
}
