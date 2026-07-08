import {sanitizeHtml, sanitizeHref} from './htmlSafety';

export const RICH_TEXT_DOCUMENT_TYPE = 'geesome.richText';
export const RICH_TEXT_MIME_TYPE = 'application/vnd.geesome.rich-text+json';
export const RICH_TEXT_VERSION = 1;

const markOrder = ['strong', 'em', 'code', 'strike', 'spoiler', 'link', 'mention', 'hashtag'];

export function isRichTextDocument(value) {
  return !!(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    value.type === RICH_TEXT_DOCUMENT_TYPE &&
    value.version === RICH_TEXT_VERSION &&
    Array.isArray(value.blocks)
  );
}

export function richTextToSafeHtml(document) {
  if (!isRichTextDocument(document)) {
    return '';
  }
  return sanitizeHtml(document.blocks.map(block => richTextBlockToHtml(block)).join(''));
}

export function plainTextToRichTextDocument(text, options: any = {}) {
  return {
    type: RICH_TEXT_DOCUMENT_TYPE,
    version: RICH_TEXT_VERSION,
    blocks: plainTextToRichTextBlocks(text),
    ...(options.lang ? {lang: options.lang} : {}),
    ...(options.source ? {source: options.source} : {})
  };
}

function richTextBlockToHtml(block) {
  if (!block || typeof block !== 'object') {
    return '';
  }
  if (block.type === 'paragraph') {
    return `<p>${inlineNodesToHtml(block.children)}</p>`;
  }
  if (block.type === 'blockquote') {
    return `<blockquote>${inlineNodesToHtml(block.children)}</blockquote>`;
  }
  if (block.type === 'codeBlock') {
    return `<pre><code>${escapeHtml(block.text || '')}</code></pre>`;
  }
  if (block.type === 'list') {
    const tagName = block.ordered ? 'ol' : 'ul';
    const items = (Array.isArray(block.items) ? block.items : [])
      .map(item => richTextBlockToHtml({...item, type: 'listItem'}))
      .join('');
    return `<${tagName}>${items}</${tagName}>`;
  }
  if (block.type === 'listItem') {
    return `<li>${inlineNodesToHtml(block.children)}</li>`;
  }
  if (block.type === 'lineBreak') {
    return '<br/>';
  }
  if (block.type === 'attachment') {
    const label = block.alt || block.title || block.storageId || '';
    return label ? `<p>${escapeHtml(label)}</p>` : '';
  }
  return '';
}

function plainTextToRichTextBlocks(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split(/\n+/)
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => ({
      type: 'paragraph',
      children: [{text: part.replace(/\n+/g, ' ')}]
    }));
}

function inlineNodesToHtml(nodes) {
  if (!Array.isArray(nodes)) {
    return '';
  }
  return nodes.map(node => inlineNodeToHtml(node)).join('');
}

function inlineNodeToHtml(node) {
  if (!node || typeof node.text !== 'string') {
    return '';
  }
  let html = escapeHtml(node.text);
  normalizeMarks(node.marks).forEach((mark) => {
    html = applyMarkToHtml(html, mark);
  });
  return html;
}

function normalizeMarks(marks) {
  if (!Array.isArray(marks)) {
    return [];
  }
  return marks
    .map(mark => normalizeMark(mark))
    .filter(Boolean)
    .sort((a, b) => markOrder.indexOf(a.type) - markOrder.indexOf(b.type));
}

function normalizeMark(mark) {
  if (!mark || typeof mark !== 'object' || !mark.type || markOrder.indexOf(mark.type) === -1) {
    return null;
  }
  if (mark.type === 'link' || mark.type === 'mention' || mark.type === 'hashtag') {
    return normalizeLinkLikeMark(mark);
  }
  return mark;
}

function normalizeLinkLikeMark(mark) {
  const normalizedMark = {...mark};
  if (normalizedMark.href) {
    normalizedMark.href = sanitizeHref(normalizedMark.href);
  }
  if (mark.type === 'link' && !normalizedMark.href) {
    return null;
  }
  return normalizedMark;
}

function applyMarkToHtml(html, mark) {
  if (mark.type === 'strong') {
    return `<strong>${html}</strong>`;
  }
  if (mark.type === 'em') {
    return `<em>${html}</em>`;
  }
  if (mark.type === 'code') {
    return `<code>${html}</code>`;
  }
  if (mark.type === 'strike') {
    return `<s>${html}</s>`;
  }
  if (mark.type === 'link' || mark.type === 'mention' || mark.type === 'hashtag') {
    return linkMarkToHtml(html, mark);
  }
  return html;
}

function linkMarkToHtml(html, mark) {
  if (!mark.href) {
    return html;
  }
  const title = mark.title ? ` title="${escapeHtmlAttribute(mark.title)}"` : '';
  return `<a href="${escapeHtmlAttribute(mark.href)}"${title}>${html}</a>`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeHtmlAttribute(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

export default {
  isRichTextDocument,
  plainTextToRichTextDocument,
  richTextToSafeHtml
};
