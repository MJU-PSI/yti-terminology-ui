import { Component } from '@angular/core';
import { LocationService } from '../../services/location.service';

@Component({
  selector: 'app-accessibility-page',
  styleUrls: ['./accessibility-page.component.scss'],
  templateUrl: './accessibility-page.component.html',
})

export class AccessibilityPageComponent {

  constructor(private locationService: LocationService) {
    locationService.atAccessibilityPage();
  }
}
