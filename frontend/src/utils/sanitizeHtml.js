// Lọc HTML trước khi render bằng dangerouslySetInnerHTML để chống XSS.
// Cách làm: whitelist — chỉ giữ lại các thẻ/thuộc tính định dạng an toàn,
// bỏ toàn bộ <script>, <iframe>, <style>, thuộc tính sự kiện (onclick, onerror…)
// và các URL nguy hiểm (javascript:, data:, vbscript:…).
// Có thể thay bằng thư viện DOMPurify: `npm i dompurify` rồi dùng DOMPurify.sanitize(html).

const ALLOWED_TAGS = new Set([
  'p', 'br', 'hr', 'div', 'span', 'blockquote', 'pre', 'code',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'b', 'em', 'i', 'u', 's', 'small', 'sub', 'sup', 'mark',
  'ul', 'ol', 'li',
  'a', 'img', 'figure', 'figcaption',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
]);

// Thẻ bị xóa cùng toàn bộ nội dung bên trong
const DROP_WITH_CONTENT = new Set([
  'script', 'style', 'iframe', 'object', 'embed', 'noscript', 'template',
  'svg', 'math', 'form', 'input', 'button', 'textarea', 'select', 'link', 'meta', 'base',
]);

const ALLOWED_ATTRS = {
  a: ['href', 'title'],
  img: ['src', 'alt', 'title', 'width', 'height'],
  td: ['colspan', 'rowspan'],
  th: ['colspan', 'rowspan'],
};

function isSafeUrl(value, { allowRelative = true } = {}) {
  const url = String(value || '').trim();
  // Bỏ ký tự điều khiển/khoảng trắng mà trình duyệt có thể bỏ qua khi parse URL
  const compact = url.replace(/[\x00-\x20\x7f-\x9f]/g, '').toLowerCase();
  if (/^(https?:|mailto:)/.test(compact)) return true;
  if (allowRelative && /^(\/(?!\/)|#|\.\.?\/)/.test(compact)) return true;
  return false;
}

function cleanNode(node, doc) {
  [...node.childNodes].forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) return;
    if (child.nodeType !== Node.ELEMENT_NODE) {
      child.remove(); // comment, processing instruction…
      return;
    }

    const tag = child.tagName.toLowerCase();
    if (DROP_WITH_CONTENT.has(tag)) {
      child.remove();
      return;
    }
    if (!ALLOWED_TAGS.has(tag)) {
      // Thẻ lạ: giữ lại nội dung bên trong, bỏ thẻ bao ngoài
      cleanNode(child, doc);
      child.replaceWith(...child.childNodes);
      return;
    }

    const allowedAttrs = ALLOWED_ATTRS[tag] || [];
    [...child.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();
      if (!allowedAttrs.includes(name)) {
        child.removeAttribute(attr.name);
      } else if ((name === 'href' || name === 'src') && !isSafeUrl(attr.value)) {
        child.removeAttribute(attr.name);
      }
    });

    if (tag === 'a' && child.hasAttribute('href')) {
      child.setAttribute('target', '_blank');
      child.setAttribute('rel', 'noopener noreferrer nofollow');
    }

    cleanNode(child, doc);
  });
}

export function sanitizeHtml(html) {
  if (!html) return '';
  // DOMParser tạo document "trơ": script không chạy, ảnh không tải khi parse
  const doc = new DOMParser().parseFromString(String(html), 'text/html');
  cleanNode(doc.body, doc);
  return doc.body.innerHTML;
}

export default sanitizeHtml;
