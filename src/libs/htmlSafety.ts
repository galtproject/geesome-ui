const allowedHtmlTags = ['a', 'b', 'blockquote', 'br', 'code', 'em', 'i', 'li', 'ol', 'p', 'pre', 's', 'span', 'strong', 'u', 'ul'];
const blockedHtmlTags = ['base', 'button', 'embed', 'form', 'iframe', 'input', 'link', 'math', 'meta', 'object', 'script', 'select', 'style', 'svg', 'textarea'];
const allowedHtmlProtocols = ['http', 'https', 'ipfs', 'ipns', 'mailto'];
const allowedAnchorTargets = ['_blank', '_parent', '_self', '_top'];

export function sanitizeHtml(html) {
  if (!html || typeof document === 'undefined') {
    return '';
  }
  const template = document.createElement('template');
  template.innerHTML = String(html);
  sanitizeHtmlNode(template.content);
  return template.innerHTML.trim();
}

export function sanitizeHref(attributeValue) {
  const href = String(attributeValue || '').trim();
  if (!href) {
    return '';
  }
  const compactHref = href.replace(/[\u0000-\u001F\u007F\s]+/g, '').toLowerCase();
  if (compactHref.indexOf('//') === 0) {
    return '';
  }
  const protocolMatch = /^([a-z][a-z0-9+.-]*):/i.exec(compactHref);
  if (!protocolMatch) {
    return href;
  }
  if (allowedHtmlProtocols.indexOf(protocolMatch[1]) === -1) {
    return '';
  }
  return href;
}

function sanitizeHtmlNode(parent) {
  Array.from(parent.childNodes).forEach((node: any) => {
    sanitizeChildNode(node);
  });
}

function sanitizeChildNode(node: any) {
  if (node.nodeType === Node.COMMENT_NODE) {
    node.remove();
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return;
  }

  const element = node as HTMLElement;
  const tagName = element.tagName.toLowerCase();
  if (blockedHtmlTags.indexOf(tagName) !== -1) {
    element.remove();
    return;
  }

  sanitizeHtmlNode(element);
  if (allowedHtmlTags.indexOf(tagName) === -1) {
    unwrapElement(element);
    return;
  }

  sanitizeHtmlAttributes(element, tagName);
}

function unwrapElement(element: HTMLElement) {
  const parent = element.parentNode;
  if (!parent) {
    element.remove();
    return;
  }
  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }
  element.remove();
}

function sanitizeHtmlAttributes(element: HTMLElement, tagName: string) {
  Array.from(element.attributes).forEach((attribute) => {
    sanitizeHtmlAttribute(element, tagName, attribute.name, attribute.value);
  });
  if (tagName === 'a' && element.getAttribute('target') === '_blank') {
    element.setAttribute('rel', 'noopener noreferrer');
  }
}

function sanitizeHtmlAttribute(element: HTMLElement, tagName: string, attributeName: string, attributeValue: string) {
  const normalizedName = attributeName.toLowerCase();
  if (normalizedName.indexOf('on') === 0 || normalizedName === 'style') {
    element.removeAttribute(attributeName);
    return;
  }
  if (tagName !== 'a' || ['href', 'rel', 'target', 'title'].indexOf(normalizedName) === -1) {
    element.removeAttribute(attributeName);
    return;
  }
  if (normalizedName === 'href') {
    sanitizeHrefAttribute(element, attributeName, attributeValue);
    return;
  }
  if (normalizedName === 'target') {
    sanitizeTargetAttribute(element, attributeName, attributeValue);
    return;
  }
  if (normalizedName === 'rel') {
    sanitizeRelAttribute(element, attributeName, attributeValue);
  }
}

function sanitizeHrefAttribute(element: HTMLElement, attributeName: string, attributeValue: string) {
  const href = sanitizeHref(attributeValue);
  if (!href) {
    element.removeAttribute(attributeName);
    return;
  }
  element.setAttribute(attributeName, href);
}

function sanitizeTargetAttribute(element: HTMLElement, attributeName: string, attributeValue: string) {
  const target = String(attributeValue || '').trim().toLowerCase();
  if (allowedAnchorTargets.indexOf(target) === -1) {
    element.removeAttribute(attributeName);
    return;
  }
  element.setAttribute(attributeName, target);
}

function sanitizeRelAttribute(element: HTMLElement, attributeName: string, attributeValue: string) {
  const rel = String(attributeValue || '')
    .split(/\s+/)
    .map(value => value.trim().toLowerCase())
    .filter(Boolean)
    .filter(value => /^[a-z0-9_-]+$/.test(value))
    .join(' ');
  if (!rel) {
    element.removeAttribute(attributeName);
    return;
  }
  element.setAttribute(attributeName, rel);
}

export default {
  sanitizeHtml,
  sanitizeHref
};
