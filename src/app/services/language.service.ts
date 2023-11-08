import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Language, Localizable, Localizer, isDefined, getFromLocalStorage, setToLocalStorage, availableLanguages, defaultLanguage } from '@mju-psi/yti-common-ui';
import { BehaviorSubject, combineLatest } from 'rxjs';

export { Language, Localizer };

@Injectable()
export class LanguageService implements Localizer {
  private static readonly LANGUAGE_KEY: string = 'yti-terminology-ui.language-service.language';
  private static readonly FILTER_LANGUAGE_KEY: string = 'yti-terminology-ui.language-service.filter-language';

  availableLanguages: any;
  defaultLanguage: any;

  language$;
  filterLanguage$;
  translateLanguage$;

  constructor(private translateService: TranslateService) {

    this.availableLanguages = availableLanguages;
    this.defaultLanguage = defaultLanguage;

    translateService.addLangs(this.availableLanguages.map((lang: { code: any; }) => { return lang.code }));
    translateService.setDefaultLang(this.defaultLanguage);

    this.language$ = new BehaviorSubject<Language>(getFromLocalStorage(LanguageService.LANGUAGE_KEY, this.defaultLanguage || 'en'));
    this.filterLanguage$ = new BehaviorSubject<Language>(getFromLocalStorage(LanguageService.FILTER_LANGUAGE_KEY, ''));
    this.translateLanguage$ = new BehaviorSubject<Language>(this.language);

    this.language$.subscribe(lang => this.translateService.use(lang));

    combineLatest(this.language$, this.filterLanguage$)
      .subscribe(([lang, filterLang]) => this.translateLanguage$.next(lang || filterLang));
  }

  get language(): Language {
    return this.language$.getValue();
  }

  set language(language: Language) {
    if (this.language !== language) {
      this.language$.next(language);
      setToLocalStorage(LanguageService.LANGUAGE_KEY, language);
    }
  }

  get filterLanguage(): Language {
    return this.filterLanguage$.getValue();
  }

  set filterLanguage(language: Language) {
    if (this.filterLanguage !== language) {
      this.filterLanguage$.next(language);
      setToLocalStorage(LanguageService.FILTER_LANGUAGE_KEY, language);
    }
  }

  get translateLanguage(): Language {
    return this.translateLanguage$.getValue();
  }

  translate(localizable: Localizable, useUILanguage = false) {

    if (!isDefined(localizable)) {
      return '';
    }

    const primaryLocalization = localizable[(!useUILanguage && this.filterLanguage) || this.language];

    if (primaryLocalization) {
      return primaryLocalization;
    } else {

      for (const [language, value] of Object.entries(localizable)) {
        if (value) {
          return `${value} (${language})`;
        }
      }

      return '';
    }
  }

  translateToGivenLanguage(localizable: Localizable, languageToUse: string | null): string {
    if (!isDefined(localizable)) {
      return '';
    }

    if (languageToUse) {
      const primaryLocalization = localizable[languageToUse];
      if (primaryLocalization) {
        return primaryLocalization;
      }
    }

    return this.translate(localizable, true);
  }

  isLocalizableEmpty(localizable: Localizable): boolean {

    if (!localizable) {
      return true;
    }

    for (const prop in localizable) {
      if (localizable.hasOwnProperty(prop)) {
        return false;
      }
    }

    return JSON.stringify(localizable) === JSON.stringify({});
  }
}
