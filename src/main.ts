import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { YtiCommonUiConfig, YTI_COMMON_UI_CONFIG } from '@goraresult/yti-common-ui';
import { AppModule } from './app/app.module';
import { Configuration } from './configuration/configuration';


// Platform creation and bootstrapping of the application is delayed until we have loaded the configuration file.
// The contents of the configuration file will be replaced (in Dockerfile) based on environment
let configurationPath = `/configuration/configuration.json`;
fetch(configurationPath)
  .then(response => response.json())
  .then((configuration: Configuration) => {
    if (configuration.production) {
      enableProdMode();
    }

    const COMMON_UI_CONFIG: YtiCommonUiConfig = {
      url: configuration.url,
      realm: configuration.realm,
      clientId: configuration.clientId
    };

    return platformBrowserDynamic([
      { provide: YTI_COMMON_UI_CONFIG, useValue: COMMON_UI_CONFIG },
    ]).bootstrapModule(AppModule);
  })
  .catch(error => console.error(error));
