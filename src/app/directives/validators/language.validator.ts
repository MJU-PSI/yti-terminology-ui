import { Directive, forwardRef } from '@angular/core';
import { FormControl, NG_VALIDATORS } from '@angular/forms';
import { contains } from '../../utils/array';

const languages: string[] = require('../../../assets/ietf-language-tags.json');

@Directive({
  selector: '[validateLanguage][ngModel]',
  providers: [
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => LanguageValidator), multi: true }
  ]
})
export class LanguageValidator {

  validate(control: FormControl) {
    return validateLanguage(control);
  }
}

export function validateLanguage(control: FormControl) {
  return contains(languages, control.value)  ? null : {
    validateLanguage: {
      valid: false
    }
  };
}
