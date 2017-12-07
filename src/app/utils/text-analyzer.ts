import * as levenshtein from 'fast-levenshtein';
import { Localizable } from 'yti-common-ui/types/localization';
import { isDefined } from 'yti-common-ui/utils/object';
import { Comparator, comparingPrimitive, comparingLocalizable } from 'yti-common-ui/utils/comparator';
import { Localizer } from 'app/services/language.service';
import { allMatching } from 'yti-common-ui/utils/array';

export interface TextAnalysis<T> {
  item: T;
  score: number;
  matchScore: number|null;
  search: string|null;
}

export type ContentExtractor<T> = (item: T) => Localizable|string;

export function filterAndSortSearchResults<S>(items: S[],
                                              searchText: string,
                                              contentExtractors: ContentExtractor<S>[],
                                              filters: SearchFilter<S>[],
                                              comparator: Comparator<TextAnalysis<S>>): S[] {

  const analyzedItems = items.map(item => analyze(searchText, item, contentExtractors));
  const filteredAnalyzedItems = applyFilters(analyzedItems, filters);

  filteredAnalyzedItems.sort(comparator);

  return filteredAnalyzedItems.map(ai => ai.item);
}

export type SearchFilter<T> = (analyzedItem: TextAnalysis<T>) => boolean;

export function applyFilters<T>(searchResults: TextAnalysis<T>[], filters: SearchFilter<T>[]) {
  return searchResults.filter(results => allMatching(filters, filter => filter(results)));
}

export function scoreComparator<S>() {
  return comparingPrimitive<TextAnalysis<S>>(item => item.matchScore ? item.matchScore : item.score);
}

export function labelComparator<S extends { label: Localizable }>(localizer: Localizer) {
  return comparingLocalizable<TextAnalysis<S>>(localizer, item => item.item.label);
}

export function analyze<T>(search: string, item: T, extractors: ContentExtractor<T>[]): TextAnalysis<T> {

  let score = Number.MAX_SAFE_INTEGER;
  let matchScore: number|null = null;

  if (!search) {
    return { item, score, matchScore, search: null };
  }

  for (const extractor of extractors) {

    const content = extractor(item);
    const values = isLocalizable(content) ? Object.values(content) : [content];

    for (const value of values) {

      const valueScore = calculateLevenshtein(search, value);
      score = Math.min(score, valueScore);

      if (valueContains(value, search)) {
        const previousMatchScore: number = isDefined(matchScore) ? matchScore : Number.MAX_SAFE_INTEGER;
        matchScore = Math.min(previousMatchScore, valueScore);
      }
    }
  }

  return { item, score, matchScore, search };
}

const useCollator = { useCollator: true };

function isLocalizable(obj: any): obj is Localizable {
  return typeof obj === 'object';
}

function valueContains(value: Localizable|string, searchString: string) {
  if (isLocalizable(value)) {
    return localizableContains(value, searchString);
  } else  {
    return stringContains(value, searchString);
  }
}

function anyLocalization(predicate: (localized: string) => boolean, localizable: Localizable) {
  if (localizable) {
    for (const localized of Object.values(localizable)) {
      if (predicate(localized)) {
        return true;
      }
    }
  }
  return false;
}

function stringContains(value: string, searchString: string) {
  return value.toLocaleLowerCase().indexOf(searchString.toLowerCase()) !== -1;
}

function localizableContains(localizable: Localizable, searchString: string) {
  return anyLocalization(localized => stringContains(localized, searchString), localizable);
}

function calculateLevenshtein(search: string, value: string) {

  const text = (value || '').trim();

  if (text.length > 0) {
    return levenshtein.get(search, value, useCollator);
  } else {
    return Number.MAX_SAFE_INTEGER;
  }
}
