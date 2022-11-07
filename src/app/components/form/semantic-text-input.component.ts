import { Component, ElementRef, forwardRef, Input, OnInit, ViewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { DomPath, DomPoint, DomSelection, formatTextContent, isInDocument, moveCursor, removeChildren } from 'app/utils/dom';
import {
  allMatching,
  first,
  firstMatching,
  insertBefore,
  last,
  nextOf,
  nextOfMatching,
  previousOf,
  previousOfMatching,
  remove
} from '@goraresult/yti-common-ui';
import { wordAtOffset, isDefined, requireDefined } from '@goraresult/yti-common-ui';
import { ConceptNode } from 'app/entities/node';
import {
  SemanticTextDocument,
  SemanticTextFormat as SemanticTextFormatImported,
  SemanticTextLink,
  SemanticTextLinkCategory,
  SemanticTextLiteral,
  SemanticTextParagraph
} from 'app/entities/semantic';
import { areNodesEqual, resolveSerializer } from 'app/utils/semantic';
import { UrlInputModalService } from './url-input-modal.component';
import { ConfigurationService } from '../../services/configuration.service';

type SemanticTextFormat = SemanticTextFormatImported;

class Model {

  public content: Paragraph[] = [];

  linkableSelection: LinkableSelection | null = null;
  linkedSelection: LinkedSelection | null = null;

  constructor(public node: Element) {
    removeChildren(node); // clear previous nodes
  }

  get selectionOffset(): number {

    const selection = this.getSelection();

    if (selection) {
      return Model.pointToOffset(selection.start);
    } else {
      return 0;
    }
  }

  get firstParagraph(): Paragraph {
    return first(this.content);
  }

  get lastParagraph(): Paragraph {
    return last(this.content);
  }

  static ofSemanticTextNode(container: HTMLElement, document: SemanticTextDocument): Model {

    const result = new Model(container);

    for (const paragraph of document.children) {
      result.appendParagraph(Paragraph.ofSemanticTextNode(result, paragraph));
    }

    result.ensureNonEmptyContent();

    return result;
  }

  private static pointToOffset(point: Point): number {

    let offset = point.offset;

    for (let text = point.text.getPrecedingText(); text !== null; text = text.getPrecedingText()) {
      offset += text.length;
    }

    return offset;
  }

  ensureNonEmptyContent() {
    if (this.content.length === 0) {
      const newParagraph = new Paragraph(this);
      this.appendParagraph(newParagraph);
      newParagraph.ensureNonEmptyContent();
    }
  }

  hasParagraph(paragraph: Paragraph) {
    return this.content.indexOf(paragraph) !== -1;
  }

  insertNewParagraph() {

    const selection = requireDefined(this.getSelection());
    const { text, offset } = selection.remove()!;

    const paragraph = text.containingParagraph;

    // prevent two consecutive empty paragraphs which doesn't have equivalent markdown representation
    if (!paragraph.hasEmptyContent()) {
      const newPrependingParagraph = new Paragraph(this);
      this.insertParagraphBefore(newPrependingParagraph, text.containingParagraph);
      paragraph.splitTo(newPrependingParagraph, text, offset);
      paragraph.firstPoint.moveCursor();
    }
  }

  insertTextToSelection(text: string, updateDom: boolean) {

    const selection = requireDefined(this.getSelection());
    const position = requireDefined(selection.remove());
    position.text.insertText(text, position.offset, updateDom).moveCursor();
  }

  removeSelection() {
    requireDefined(this.getSelection()).remove().moveCursor();
  }

  removeNextChar() {

    const selection = requireDefined(this.getSelection());

    if (selection.isRange()) {
      selection.remove().moveCursor();
    } else {
      const { text, offset } = selection.start;
      text.removeNextChar(offset).moveCursor();
    }
  }

  removePreviousChar() {

    const selection = requireDefined(this.getSelection());

    if (selection.isRange()) {
      selection.remove().moveCursor();
    } else {
      const { text, offset } = selection.start;
      text.removePreviousChar(offset).moveCursor();
    }
  }

  findTextForPath(indicesFromRoot: number[]): Text {
    const index = indicesFromRoot.shift()!;
    return this.content[index].findTextForPath(indicesFromRoot);
  }

  getPrecedingText(paragraph: Paragraph): Text | null {

    const previous = previousOf(this.content, paragraph);

    if (previous) {
      return previous.lastText;
    } else {
      return null;
    }
  }

  getFollowingText(paragraph: Paragraph): Text | null {

    const next = nextOf(this.content, paragraph);

    if (next) {
      return next.firstText;
    } else {
      return null;
    }
  }

  removeContent(paragraph: Paragraph): boolean {

    const canRemove = this.content.length > 1;

    if (canRemove) {
      this.node.removeChild(paragraph.node);
      remove(this.content, paragraph);
    }

    return canRemove;
  }

  getSelection(): Selection | null {
    const domSelection = DomSelection.create(this.node);
    return domSelection ? Selection.ofDomSelection(this, domSelection) : null;
  }

  link(target: string, category: SemanticTextLinkCategory) {

    if (this.linkableSelection === null) {
      throw new Error('Illegal state');
    }

    const { start, end, cursor } = this.linkableSelection;
    const paragraph = this.linkableSelection.paragraph;
    const text = this.linkableSelection.text;
    const selectionAsLink = new Link(paragraph, this.linkableSelection.content, target, category);

    if (start > 0) {
      paragraph.insertContentBefore(new Text(paragraph, text.contentBeforeOffset(start)), text);
    }

    paragraph.insertContentBefore(selectionAsLink, text);

    if (end < text.length) {
      paragraph.insertContentBefore(new Text(paragraph, text.contentAfterOffset(end)), text);
    }

    text.remove();

    if (!this.isDetached()) {
      new Point(selectionAsLink.text, cursor - start).moveCursor();
      this.updateSelection();
    }
  }

  isDetached() {
    return !isInDocument(this.node);
  }

  unlink() {

    if (this.linkedSelection === null) {
      throw new Error('Illegal state');
    }

    const paragraph = this.linkedSelection.paragraph;
    const link = this.linkedSelection.link;
    const linkAsText = new Text(paragraph, link.content);

    paragraph.insertContentBefore(linkAsText, link);
    link.remove();
    paragraph.mergeConsecutiveTexts(new Point(linkAsText, this.linkedSelection.cursor));
    this.updateSelection();
  }

  updateSelection() {

    const selection = this.getSelection();

    if (selection) {
      this.linkableSelection = selection.linkableSelection;
      this.linkedSelection = selection.linkedSelection;
    }
  }

  removeLinkSelections() {
    this.linkableSelection = null;
    this.linkedSelection = null;
  }

  toSemanticTextNode(): SemanticTextDocument {
    return new SemanticTextDocument(this.content.map(c => c.toSemanticTextNode()));
  }

  moveCursorToOffset(offset: number) {
    this.offsetToPoint(offset).moveCursor();
  }

  removeStartOfLine() {
    console.log('remove start of line, not implemented yet'); // TODO
  }

  removeEndOfLine() {
    console.log('remove rest of line, not implemented yet'); // TODO
  }

  removeNextWord() {
    console.log('remove next word, not implemented yet'); // TODO
  }

  removePreviousWord() {
    console.log('remove previous word, not implemented yet'); // TODO
  }

  copy(): string {
    return requireDefined(this.getSelection()).toPlainString();
  }

  paste(text: string) {
    this.insertTextToSelection(text, true);
  }

  cut(): string {

    const text = this.copy();
    requireDefined(this.getSelection()).remove().moveCursor();
    return text;
  }

  private appendParagraph(paragraph: Paragraph) {
    this.content.push(paragraph);
    this.node.appendChild(paragraph.node);
  }

  private insertParagraphBefore(newParagraph: Paragraph, ref: Paragraph) {
    insertBefore(this.content, newParagraph, ref);
    this.node.insertBefore(newParagraph.node, ref.node);
  }

  private offsetToPoint(offset: number): Point {

    let offsetWalked = 0;

    for (let text: Text | null = this.firstParagraph.firstText; text !== null; text = text.getFollowingText()) {

      offsetWalked += text.length;

      if (offset <= offsetWalked) {
        return new Point(text, text.length - (offsetWalked - offset));
      }
    }

    return this.lastParagraph.lastText.lastPoint;
  }
}

class Paragraph {

  node: HTMLElement;
  content: (Link | Text)[] = [];

  constructor(private parent: Model) {
    this.node = document.createElement('p');
  }

  get firstPoint(): Point {
    return new Point(this.firstText, 0);
  }

  get paragraph(): Paragraph {
    return this;
  }

  get lastContent(): Text | Link {
    return last(this.content);
  }

  get lastText(): Text {
    return this.lastContent.text;
  }

  get firstContent(): Text | Link {
    return first(this.content);
  }

  get firstText(): Text {
    return this.firstContent.text;
  }

  static ofSemanticTextNode(parent: Model, paragraphNode: SemanticTextParagraph): Paragraph {

    const result = new Paragraph(parent);

    for (const child of paragraphNode.children) {
      result.appendContent(child.type === 'link' ? Link.ofSemanticTextNode(result, child)
        : Text.ofSemanticTextNode(result, child));
    }

    return result;
  }

  combineWith(paragraph: Paragraph): Point {

    const lastOfThis = last(this.content);
    const lastContentBeforeChanges = lastOfThis.text.content;

    let firstChild = true;

    for (const content of paragraph.content) {

      if (firstChild && lastOfThis instanceof Text && content instanceof Text) {

        if (!lastOfThis.hasEmptyContent()) {
          lastOfThis.append(content.content);
        } else {
          lastOfThis.content = content.content;
        }
      } else {
        this.appendContent(content.copyToParent(this));
      }

      firstChild = false;
    }

    paragraph.remove();
    return new Point(lastOfThis.text, lastContentBeforeChanges.trim() === '' ? 0 : lastContentBeforeChanges.length);
  }

  splitTo(prependingParagraph: Paragraph, fromText: Text, fromOffset: number) {

    const contentToRemove: (Link | Text)[] = [];

    for (const content of this.content) {

      const isSplittingText = content.text === fromText;

      if (isSplittingText) {

        const beforeSplitPointContent = content.text.contentBeforeOffset(fromOffset);

        if (content instanceof Link) {
          prependingParagraph.appendContent(new Link(prependingParagraph, beforeSplitPointContent, content.target, content.category));
        } else {
          prependingParagraph.appendText(beforeSplitPointContent);
        }
        content.content = content.text.contentAfterOffset(fromOffset);
        break; // nothing to do after split point is handled
      }

      prependingParagraph.appendContent(content.copyToParent(prependingParagraph));
      contentToRemove.push(content);
    }

    for (const content of contentToRemove) {
      content.remove();
    }
  }

  ensureNonEmptyContent() {
    if (this.content.length === 0) {
      this.appendContent(new Text(this));
    }
  }

  hasEmptyContent(): boolean {
    return allMatching(this.content, c => c.hasEmptyContent());
  }

  appendText(text: string) {
    if (this.content.length > 0 && this.lastContent instanceof Text) {
      this.lastContent.append(text);
    } else {
      this.appendContent(new Text(this, text));
    }
  }

  mergeConsecutiveTexts(cursor: Point) {

    let cursorAfterMerging = cursor;

    if (this.content.length < 2) {
      // nothing to do
    } else {

      let i = 1;

      while (i < this.content.length) {

        const previous = this.content[i - 1];
        const current = this.content[i];

        if (previous instanceof Text && current instanceof Text) {

          const previousLengthBeforeAppending = previous.length;
          previous.append(current.content);

          if (cursor.text === current) {
            cursorAfterMerging = new Point(previous, previousLengthBeforeAppending + cursorAfterMerging.offset);
          }

          current.remove();
        } else {
          i++;
        }
      }
    }

    moveCursor(cursorAfterMerging.text.node, cursorAfterMerging.offset);
  }

  appendContent(content: Link | Text) {
    this.content.push(content);
    this.node.appendChild(content.node);
  }

  insertContentBefore(content: Link | Text, ref: Link | Text) {
    insertBefore(this.content, content, ref);
    this.node.insertBefore(content.node, ref.node);
  }

  remove(): boolean {
    return this.parent.removeContent(this);
  }

  removeContent(content: Text | Link): Point {

    const previous = this.getPrecedingText(content.text);
    const next = this.getFollowingText(content.text);

    this.node.removeChild(content.node);
    remove(this.content, content);

    if (this.content.length === 0 && !this.parent.removeContent(this)) {
      this.ensureNonEmptyContent();
      return this.firstPoint;
    }

    return previous ? previous.lastPoint : next!.firstPoint;
  }

  findTextForPath(indicesFromRoot: number[]): Text {

    if (indicesFromRoot.length === 0) {
      // at least chrome seems to return paragraph in selection
      return this.firstText;
    }

    const index = indicesFromRoot.shift()!;
    return this.content[index].findTextForPath(indicesFromRoot);
  }

  getPrecedingText(text: Text): Text | null {

    const previous = previousOfMatching(this.content, c => c.text === text);

    if (previous) {
      return previous.text;
    } else {
      return this.parent.getPrecedingText(this);
    }
  }

  getFollowingText(text: Text): Text | null {

    const next = nextOfMatching(this.content, c => c.text === text);

    if (next) {
      return next.text;
    } else {
      return this.parent.getFollowingText(this);
    }
  }

  toSemanticTextNode(): SemanticTextParagraph {
    return new SemanticTextParagraph(this.content.map(c => c.toSemanticTextNode()));
  }
}

class Link {

  node: HTMLElement;

  constructor(private parent: Paragraph, text: string, target: string, public readonly category: SemanticTextLinkCategory) {
    this.node = document.createElement('span');
    this.node.classList.add('link', category);
    this.text = new Text(this, text);
    this.target = target;
  }

  private _text: Text;

  get text() {
    return this._text;
  }

  set text(value: Text) {
    this._text = value;

    for (const child of Array.from(this.node.childNodes.values())) {
      this.node.removeChild(child);
    }

    this.node.appendChild(value.node);
  }

  private _target: string;

  get target() {
    return this._target;
  }

  set target(value: string) {
    this._target = value;
    this.node.dataset['target'] = value;
  }

  get content() {
    return this.text.content;
  }

  set content(value: string) {
    this.text.content = value;
  }

  get paragraph(): Paragraph {
    return this.parent;
  }

  static ofSemanticTextNode(parent: Paragraph, link: SemanticTextLink): Link {
    return new Link(parent, link.text, link.destination, link.category);
  }

  copyToParent(parent: Paragraph): Link {
    return new Link(parent, this.content, this.target, this.category);
  }

  hasEmptyContent(): boolean {
    return this.text.hasEmptyContent();
  }

  remove(): Point {
    return this.parent.removeContent(this);
  }

  removeContent(text: Text): Point {

    if (text !== this.text) {
      throw new Error('Illegal argument');
    }

    return this.remove();
  }

  findTextForPath(indicesFromRoot: number[]): Text {
    const index = indicesFromRoot.shift()!;

    if (index !== 0 || indicesFromRoot.length !== 0) {
      throw new Error('Illegal state');
    }

    return this.text;
  }

  getPrecedingText(): Text | null {
    return this.parent.getPrecedingText(this.text);
  }

  getFollowingText(): Text | null {
    return this.parent.getFollowingText(this.text);
  }

  toSemanticTextNode(): SemanticTextLink {
    return new SemanticTextLink(this.content, this.target, this.category);
  }
}

class Text {

  node: Node;

  constructor(public parent: Paragraph | Link, content = '') {
    this.node = document.createTextNode('');
    this.content = content;
  }

  private _content: string;

  get content(): string {
    return this._content;
  }

  set content(value: string) {
    this._content = value || ' ';
    this.node.textContent = formatTextContent(this.content);
  }

  get text() {
    return this;
  }

  get containingParagraph(): Paragraph {
    return this.parent.paragraph;
  }

  get length() {
    return this.content.length;
  }

  get firstPoint(): Point {
    return new Point(this, 0);
  }

  get lastPoint(): Point {
    return new Point(this, this.content.length);
  }

  static ofSemanticTextNode(parent: Paragraph | Link, text: SemanticTextLiteral): Text {
    return new Text(parent, text.text);
  }

  copyToParent(parent: Paragraph): Text {
    return new Text(parent, this.content);
  }

  hasEmptyContent() {
    return this.content.trim() === ''
  }

  contentBeforeOffset(offset: number) {
    return this.content.substring(0, offset);
  }

  contentAfterOffset(offset: number) {
    return this.content.substring(offset, this.content.length);
  }

  isInLink() {
    return this.parent instanceof Link;
  }

  remove(): Point {
    // FIXME: typescript won't type check without this no-op type guard
    return this.parent instanceof Paragraph ? this.parent.removeContent(this)
      : this.parent.removeContent(this);
  }

  removeNextChar(offset: number): Point {

    if (offset >= this.length) {
      const next = this.getFollowingText();

      if (next) {
        if (next.containingParagraph !== this.containingParagraph) {
          return this.containingParagraph.combineWith(next.containingParagraph);
        } else {
          return next.removeFirstCharacter();
        }
      } else {
        return new Point(this, offset);
      }
    } else {
      return this.removeRange(offset, offset + 1);
    }
  }

  removePreviousChar(offset: number): Point {

    if (offset <= 0) {
      const previous = this.getPrecedingText();

      if (previous) {
        if (previous.containingParagraph !== this.containingParagraph) {
          return previous.containingParagraph.combineWith(this.containingParagraph);
        } else {
          return previous.removeLastCharacter();
        }
      } else {
        return new Point(this, offset);
      }
    } else {
      return this.removeRange(offset - 1, offset);
    }
  }

  removeAfter(offset: number): Point {
    return this.removeRange(offset, this.length);
  }

  removeBefore(offset: number): Point {
    return this.removeRange(0, offset);
  }

  removeLastCharacter(): Point {

    if (this.content.length <= 1) {
      return this.remove();
    } else {
      return this.removeRange(this.content.length - 1, this.content.length);
    }
  }

  removeFirstCharacter(): Point {
    if (this.content.length <= 1) {
      return this.remove();
    } else {
      return this.removeRange(0, 1);
    }
  }

  removeRange(start: number, end: number): Point {

    if (start < 0 || end > this.content.length) {
      throw new Error('remove range not in bounds, ' + start + ' .. ' + end + ' of [' + this.content + '] (' + this.content.length + ')');
    }

    if (start === 0 && end === this.content.length) {
      return this.remove();
    } else {
      this.content = this.contentBeforeOffset(start) + this.contentAfterOffset(end);

      return new Point(this, start);
    }
  }

  insertText(text: string, offset: number, updateDom: boolean): Point {

    const actualOffset = updateDom ? offset : offset - text.length;
    const newContent = this.contentBeforeOffset(actualOffset) + text + this.contentAfterOffset(actualOffset);

    if (updateDom) {
      this.content = newContent;
    } else {
      this._content = newContent;
    }

    return new Point(this, actualOffset + text.length)
  }

  append(text: string): Point {
    this.content = this.content + text;
    return this.lastPoint;
  }

  findTextForPath(indicesFromRoot: number[]): Text {

    if (indicesFromRoot.length !== 0) {
      throw new Error('Illegal state');
    }

    return this;
  }

  getPrecedingText(): Text | null {
    if (this.parent instanceof Paragraph) {
      return this.parent.getPrecedingText(this);
    } else {
      return this.parent.getPrecedingText();
    }
  }

  getFollowingText(): Text | null {
    if (this.parent instanceof Paragraph) {
      return this.parent.getFollowingText(this);
    } else {
      return this.parent.getFollowingText();
    }
  }

  toSemanticTextNode(): SemanticTextLiteral {
    return new SemanticTextLiteral(this.content);
  }
}


class Point {
  constructor(public text: Text, public offset: number) {
  }

  moveCursor() {
    moveCursor(this.text.node, this.offset);
  }
}

class Selection {

  textBetween: Text[] = [];

  constructor(private model: Model, public start: Point, public end: Point) {

    if (this.start.text !== this.end.text) {
      for (let t = this.start.text.getFollowingText()!; t !== this.end.text; t = t.getFollowingText()!) {
        this.textBetween.push(t);
      }
    }
  }

  get linkedSelection(): LinkedSelection | null {
    if (this.isLink()) {
      return new LinkedSelection(this.end.text.parent as Link, this.end.offset);
    } else {
      return null;
    }
  }

  get linkableSelection(): LinkableSelection | null {
    if (this.isLinkable()) {
      if (this.isRange()) {
        return new LinkableSelection(this.start.text, this.start.offset, this.end.offset, this.end.offset);
      } else {

        const wordRange = wordAtOffset(this.start.text.content, this.start.offset);

        if (wordRange) {
          return new LinkableSelection(this.start.text, wordRange.start, wordRange.end, this.end.offset);
        } else {
          return null;
        }
      }
    } else {
      return null;
    }
  }

  static ofDomSelection(model: Model, domSelection: DomSelection): Selection | null {

    function createPoint(domPoint: DomPoint) {

      if (domPoint.node === model.node) {
        return null;
      }

      const indicesFromRoot = domPoint.path.indicesFromRoot;
      const text = model.findTextForPath(indicesFromRoot);

      return text ? new Point(text, domPoint.offset) : null;
    }

    const startPoint = createPoint(domSelection.start);
    const endPoint = createPoint(domSelection.end);

    if (startPoint && endPoint) {
      return new Selection(model, startPoint, endPoint);
    } else {
      return null;
    }
  }

  isRange() {
    return this.start.text !== this.end.text || this.start.offset !== this.end.offset;
  }

  remove(): Point {

    if (!this.isRange()) {
      return this.start;
    }

    if (this.start.text !== this.end.text) {

      for (const text of this.textBetween) {
        text.remove();
      }

      const startParagraph = this.start.text.containingParagraph;
      const endParagraph = this.end.text.containingParagraph;
      this.start.text.removeAfter(this.start.offset);
      const pointAfterRemoval = this.end.text.removeBefore(this.end.offset);

      if (startParagraph !== endParagraph && this.model.hasParagraph(startParagraph) && this.model.hasParagraph(endParagraph)) {
        return startParagraph.combineWith(endParagraph);
      } else {
        return pointAfterRemoval;
      }
    } else {
      return this.start.text.removeRange(this.start.offset, this.end.offset);
    }
  }

  toPlainString() {

    const start = this.start.text.content;
    const end = this.end.text.content;

    if (this.start.text === this.end.text) {
      return start.substring(this.start.offset, this.end.offset);
    } else {

      let result = start.substring(this.start.offset, start.length);

      for (const text of this.textBetween) {
        result += text.content;
      }

      result += end.substring(0, this.end.offset);

      return result;
    }
  }

  toString() {
    const createDomPath = (point: Point) => requireDefined(DomPath.create(this.model.node, point.text.node));
    return `From ${createDomPath(this.start).toString()}(${this.start.offset}) ` +
      `to ${createDomPath(this.end).toString()}(${this.end.offset})`;
  }

  private isLinkable() {
    return this.start.text === this.end.text && !this.start.text.isInLink();
  }

  private isLink() {
    return this.start.text === this.end.text && this.start.text.isInLink();
  }
}

class LinkableSelection {

  constructor(public text: Text, public start: number, public end: number, public cursor: number) {
  }

  get content() {
    return this.text.content.substring(this.start, this.end);
  }

  get paragraph() {
    return this.text.containingParagraph;
  }
}

class LinkedSelection {

  constructor(public link: Link, public cursor: number) {
  }

  get content() {
    return this.link.content;
  }

  get paragraph() {
    return this.link.paragraph;
  }

  get target() {
    return this.link.target;
  }
}

const keyCodes = {
  backspace: 8,
  enter: 13,
  esc: 27,
  space: 32,
  del: 46,
  a: 65,
  b: 66,
  c: 67,
  d: 68,
  h: 72,
  i: 73,
  k: 75,
  u: 85,
  v: 86,
  x: 88,
  y: 89,
  z: 90
};

function isAlt(event: KeyboardEvent, keyCode?: number) {
  return !event.metaKey && !event.ctrlKey && event.altKey && (isDefined(keyCode) ? event.keyCode === keyCode : true);
}

function isCtrl(event: KeyboardEvent, keyCode?: number) {
  return !event.metaKey && event.ctrlKey && !event.altKey && (isDefined(keyCode) ? event.keyCode === keyCode : true);
}

function isMeta(event: KeyboardEvent, keyCode?: number) {
  return event.metaKey && !event.ctrlKey && !event.altKey && (isDefined(keyCode) ? event.keyCode === keyCode : true);
}

function isPlain(event: KeyboardEvent, keyCode?: number) {
  return !event.metaKey && !event.ctrlKey && !event.altKey && (isDefined(keyCode) ? event.keyCode === keyCode : true);
}

function isUndo(event: KeyboardEvent) {
  return isCtrl(event, keyCodes.z) || isMeta(event, keyCodes.z);
}

function isRedo(event: KeyboardEvent) {
  return (isMeta(event, keyCodes.z) && event.shiftKey) || isCtrl(event, keyCodes.y);
}

function isBoldCommand(event: KeyboardEvent) {
  return isCtrl(event, keyCodes.b) || isMeta(event, keyCodes.b);
}

function isItalicCommand(event: KeyboardEvent) {
  return isCtrl(event, keyCodes.i) || isMeta(event, keyCodes.i);
}

function isUnderlineCommand(event: KeyboardEvent) {
  return isCtrl(event, keyCodes.u) || isMeta(event, keyCodes.u);
}

function isRemovePreviousChar(event: KeyboardEvent) {
  return isPlain(event, keyCodes.backspace) || isCtrl(event, keyCodes.h);
}

function isRemoveNextChar(event: KeyboardEvent) {
  return isPlain(event, keyCodes.del) || isCtrl(event, keyCodes.d);
}

function isRemovePreviousWord(event: KeyboardEvent) {
  return isCtrl(event, keyCodes.backspace) || isAlt(event, keyCodes.backspace);
}

function isRemoveNextWord(event: KeyboardEvent) {
  return isAlt(event, keyCodes.del);
}

function isRemoveStartOfLine(event: KeyboardEvent) {
  return isMeta(event, keyCodes.backspace);
}

function isRemoveRestOfLine(event: KeyboardEvent) {
  return isCtrl(event, keyCodes.k);
}

@Component({
  selector: 'app-semantic-text-input',
  styleUrls: ['./semantic-text-input.component.scss'],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => SemanticTextInputComponent),
    multi: true
  }],
  template: `
    <app-semantic-text-input-link-popover *ngIf="hasLinkableSelection()"
                                          [id]="id"
                                          [selectedText]="linkableSelection.content"
                                          (linkConcept)="linkInternal()"
                                          (linkExternal)="linkExternal()">
    </app-semantic-text-input-link-popover>

    <app-semantic-text-input-unlink-concept-popover *ngIf="hasConceptLinkSelection()"
                                                    [id]="id"
                                                    [concept]="linkedConcept"
                                                    (unlink)="unlink()">
    </app-semantic-text-input-unlink-concept-popover>

    <app-semantic-text-input-unlink-ext-popover *ngIf="hasExternalLinkSelection()"
                                                [id]="id"
                                                [target]="linkedExternalTarget"
                                                (unlink)="unlink()">
    </app-semantic-text-input-unlink-ext-popover>

    <div #editable
         [id]="id"
         contenteditable="true"
         class="form-control"
         [ngClass]='{"invalid-data": invalidData}'
    ></div>
  `
})
export class SemanticTextInputComponent implements OnInit, ControlValueAccessor {

  @Input() id: string;
  @Input() conceptSelector: (name: string) => Promise<ConceptNode | null>;
  @Input() relatedConcepts: ConceptNode[];
  @Input() format: SemanticTextFormat;

  @ViewChild('editable') editableElement: ElementRef;
  linkingInProgress = false;
  invalidData: boolean = false;
  private model: Model;
  private undoStack: { semanticTextNode: SemanticTextDocument, cursorOffset: number }[] = [];
  private redoStack: { semanticTextNode: SemanticTextDocument, cursorOffset: number }[] = [];
  private undoDebounceTimeoutHandle: any = null;

  constructor(private urlInputModalService: UrlInputModalService,
              private configurationService: ConfigurationService) {
  }

  get linkableSelection() {
    return requireDefined(this.model.linkableSelection);
  }

  get linkedSelection() {
    return requireDefined(this.model.linkedSelection);
  }

  get linkedConcept(): ConceptNode | null {
    return firstMatching(this.relatedConcepts, concept => concept.isTargetOfLink(this.linkedSelection.target));
  }

  get linkedExternalTarget(): string | null {
    if (this.hasExternalLinkSelection()) {
      return this.model.linkedSelection!.link.target;
    }
    return null;
  }

  ngOnInit(): void {

    const element = this.editableElement.nativeElement as HTMLElement;
    this.model = new Model(element);

    element.addEventListener('keydown', (event: KeyboardEvent) => {

      if (isUnderlineCommand(event)) {
        console.log('underline command prevented');
        event.preventDefault();
      } else if (isItalicCommand(event)) {
        console.log('italic command prevented');
        event.preventDefault();
      } else if (isBoldCommand(event)) {
        console.log('bold command prevented');
        event.preventDefault();
      } else if (isRemoveStartOfLine(event)) {
        this.reportChange(() => this.model.removeStartOfLine());
        event.preventDefault();
      } else if (isRemoveRestOfLine(event)) {
        this.reportChange(() => this.model.removeEndOfLine());
        event.preventDefault();
      } else if (isRemovePreviousWord(event)) {
        this.reportChange(() => this.model.removePreviousWord());
        event.preventDefault();
      } else if (isRemoveNextWord(event)) {
        this.reportChange(() => this.model.removeNextWord());
        event.preventDefault();
      } else if (isRemoveNextChar(event)) {
        this.reportChange(() => this.model.removeNextChar());
        event.preventDefault();
      } else if (isRemovePreviousChar(event)) {
        this.reportChange(() => this.model.removePreviousChar());
        event.preventDefault();
      } else if (isRedo(event)) {
        this.redo();
        event.preventDefault();
      } else if (isUndo(event)) {
        this.undo();
        event.preventDefault();
      } else {
        // catch rest in key press handler which handles all text appending
      }
    });

    element.addEventListener('keypress', (event: KeyboardEvent) => {

      if (event.keyCode === keyCodes.enter) {
        this.reportChange(() => this.model.insertNewParagraph());
        event.preventDefault();
      } else if (event.keyCode === keyCodes.space) {
        this.reportChange(() => this.model.insertTextToSelection(' ', true));
        event.preventDefault();
      } else if (event.charCode === keyCodes.esc) {
        // nothing to do
      } else if (event.charCode) {
        this.reportChange(() => this.model.insertTextToSelection(event.key, true));
        event.preventDefault();
      }
    });

    element.addEventListener('compositionstart', (event: CompositionEvent) => {
      this.reportChange(() => this.model.removeSelection());
    });

    element.addEventListener('compositionend', (event: CompositionEvent) => {
      this.reportChange(() => this.model.insertTextToSelection(event.data, false));
    });

    element.addEventListener('keyup', () => {
      this.model.updateSelection();
    });

    element.addEventListener('mouseup', (event: Event) => {
      this.model.updateSelection();
      event.preventDefault();
    });

    element.addEventListener('blur', () => {

      setTimeout(() => {
        if (!this.linkingInProgress) {
          this.model.removeLinkSelections();
        }
      }, 200);
    });

    element.addEventListener('copy', (event: ClipboardEvent) => {
      event.clipboardData?.setData('text/plain', this.model.copy());
      event.preventDefault();
    });

    element.addEventListener('paste', (event: ClipboardEvent) => {
      this.reportChange(() => event.clipboardData ? this.model.paste(event.clipboardData.getData('Text')) :  null);
      event.preventDefault();
    });

    element.addEventListener('cut', (event: ClipboardEvent) => {
      this.reportChange(() => event.clipboardData?.setData('text/plain', this.model.cut()));
      event.preventDefault();
    });
  }

  hasLinkableSelection() {

    if (!this.conceptSelector) {
      return false;
    }

    return this.model.linkableSelection !== null;
  }

  hasConceptLinkSelection() {
    return this.model.linkedSelection !== null && this.model.linkedSelection.link.category === 'internal';
  }

  hasExternalLinkSelection() {
    return this.model.linkedSelection !== null && this.model.linkedSelection.link.category === 'external';
  }

  focusEditor() {
    (this.editableElement.nativeElement as HTMLElement).focus();
  }

  linkInternal() {
    this.linkingInProgress = true;

    this.conceptSelector(this.linkableSelection.content).then(concept => {

      if (concept) {
        this.reportChange(() => this.model.link(requireDefined(concept.uri), 'internal'));
      }

      this.linkingInProgress = false;
      this.focusEditor();
    });
  }

  linkExternal() {
    this.linkingInProgress = true;
    this.urlInputModalService.open(this.linkableSelection.content).then(url => {
      if (url) {
        this.reportChange(() => this.model.link(url, 'external'));
      }
      this.linkingInProgress = false;
      this.focusEditor();
    }).catch(err => {
      this.linkingInProgress = false;
      this.focusEditor();
    });
  }

  unlink() {
    this.reportChange(() => this.model.unlink());
    this.focusEditor();
  }

  undo() {
    if (this.undoStack.length > 1) {
      this.pushUndoIfChanged(false);
      // current state is at the top the stack
      this.redoStack.push(this.undoStack.pop()!);
      const { semanticTextNode, cursorOffset } = this.undoStack[this.undoStack.length - 1];
      this.resetModel(semanticTextNode, cursorOffset);
      this.propagateChange(resolveSerializer(this.format).serialize(semanticTextNode));
    }
  }

  redo() {

    if (this.undoDebounceTimeoutHandle) {
      this.pushUndoIfChanged(true);
    }

    if (this.redoStack.length > 0) {
      const historyItem = this.redoStack.pop()!;
      this.undoStack.push(historyItem);
      this.resetModel(historyItem.semanticTextNode, historyItem.cursorOffset);
      this.propagateChange(resolveSerializer(this.format).serialize(historyItem.semanticTextNode));
    }
  }

  writeValue(obj: any): void {
    const value = obj || '';

    if (typeof value !== 'string') {
      throw new Error('Value must be a string');
    }

    this.undoStack = [];
    this.redoStack = [];

    const { document, valid } = resolveSerializer(this.format).deserialize(value, this.configurationService.namespaceRoot);
    this.resetModel(document);
    this.invalidData = !valid;
  }

  registerOnChange(fn: any): void {
    this.propagateChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.propagateTouched = fn;
  }

  private propagateChange: (fn: any) => void = () => {};

  private propagateTouched: (fn: any) => void = () => {};

  private pushUndoIfChanged(resetRedo: boolean) {

    if (this.undoDebounceTimeoutHandle) {
      clearTimeout(this.undoDebounceTimeoutHandle);
      this.undoDebounceTimeoutHandle = null;
    }

    const historyItem = { semanticTextNode: this.model.toSemanticTextNode(), cursorOffset: this.model.selectionOffset };
    const topOfStack = this.undoStack.length > 0 ? this.undoStack[this.undoStack.length - 1] : null;

    if (!topOfStack || !areNodesEqual(topOfStack.semanticTextNode, historyItem.semanticTextNode)) {

      this.undoStack.push(historyItem);

      if (resetRedo) {
        this.redoStack = [];
      }
    }
  }

  private undoDebounce() {

    const debounceTime = 500;

    if (this.undoDebounceTimeoutHandle) {
      clearTimeout(this.undoDebounceTimeoutHandle);
    }

    this.undoDebounceTimeoutHandle = setTimeout(() => this.pushUndoIfChanged(true), debounceTime);
  }

  private reportChange(modifyingAction: () => void) {

    if (!this.undoDebounceTimeoutHandle) {
      // do an initial push
      this.pushUndoIfChanged(true);
    }

    this.undoDebounce();
    modifyingAction();
    this.propagateChange(resolveSerializer(this.format).serialize(this.model.toSemanticTextNode()));
  }

  private resetModel(semanticTextNode: SemanticTextDocument, cursorOffset?: number) {

    const element = this.editableElement.nativeElement as HTMLElement;
    this.model = Model.ofSemanticTextNode(element, semanticTextNode);

    if (cursorOffset) {
      this.model.moveCursorToOffset(cursorOffset);
    }
  }
}
