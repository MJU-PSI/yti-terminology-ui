import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';
import { Routes, RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { AppComponent } from './components/app.component';
import { TermedService } from './services/termed.service';
import { NavigationBarComponent } from './components/navigation-bar.component';
import { TermedHttp } from './services/termed-http.service';
import { VocabulariesComponent } from './components/vocabularies.component';
import {
  TranslateModule, TranslateLoader, MissingTranslationHandler,
  MissingTranslationHandlerParams
} from 'ng2-translate';
import { Observable } from 'rxjs';
import { TranslateValuePipe } from './pipes/translate-value.pipe';
import { LanguageService } from './services/language.service';
import { ConceptsComponent } from './components/concepts.component';

const localizations: { [lang: string]: string} = {
  fi: require('json!po?format=mf!../../po/fi.po'),
  en: require('json!po?format=mf!../../po/en.po')
};

export function createTranslateLoader(): TranslateLoader {
  return { getTranslation: (lang: string) => Observable.of(localizations[lang]) };
}

export function createMissingTranslationHandler(): MissingTranslationHandler {
  return {
    handle: (params: MissingTranslationHandlerParams) => {
      if (params.translateService.currentLang === 'en') {
        return params.key;
      } else {
        return '[MISSING]: ' + params.key;
      }
    }
  };
}

const appRoutes: Routes = [
  { path: '', component: VocabulariesComponent },
  { path: 'concepts/:graphId', component: ConceptsComponent }
];

@NgModule({
  declarations: [
    AppComponent,
    NavigationBarComponent,
    VocabulariesComponent,
    ConceptsComponent,
    TranslateValuePipe
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpModule,
    NgbModule.forRoot(),
    RouterModule.forRoot(appRoutes),
    TranslateModule.forRoot({ provide: TranslateLoader, useFactory: createTranslateLoader })
  ],
  providers: [
    TermedHttp,
    TermedService,
    { provide: MissingTranslationHandler, useFactory: createMissingTranslationHandler },
    LanguageService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
