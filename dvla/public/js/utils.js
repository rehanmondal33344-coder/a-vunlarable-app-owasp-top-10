/* ═══════════════════════════════════════════════════════════
   Utility Functions
   ═══════════════════════════════════════════════════════════ */

// Generate a session ID
const SESSION_ID = localStorage.getItem('dvla_session')
  || (() => {
    const id = 'session-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    localStorage.setItem('dvla_session', id);
    return id;
  })();

// Current tenant
let CURRENT_TENANT = localStorage.getItem('dvla_tenant') || 'default';

/**
 * Fetch wrapper with common headers.
 */
async function api(path, options = {}) {
  const defaults = {
    headers: {
      'Content-Type': 'application/json',
      'X-Session-Id': SESSION_ID,
      'X-Tenant-Id': CURRENT_TENANT,
    },
  };

  const merged = {
    ...defaults,
    ...options,
    headers: { ...defaults.headers, ...options.headers },
  };

  // Don't set Content-Type for FormData
  if (options.body instanceof FormData) {
    delete merged.headers['Content-Type'];
  }

  const response = await fetch(path, merged);
  return response;
}

/**
 * JSON API call.
 */
async function apiJson(path, options = {}) {
  const response = await api(path, options);
  return response.json();
}

/**
 * DOM helper — query selector.
 */
function $(selector) {
  return document.querySelector(selector);
}

/**
 * DOM helper — query selector all.
 */
function $$(selector) {
  return document.querySelectorAll(selector);
}

/**
 * Create an element with attributes and children.
 */
function createElement(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'className') {
      el.className = value;
    } else if (key === 'textContent') {
      el.textContent = value;
    } else if (key === 'innerHTML') {
      el.innerHTML = value;
    } else if (key.startsWith('on')) {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(el.style, value);
    } else if (key === 'dataset') {
      Object.assign(el.dataset, value);
    } else {
      el.setAttribute(key, value);
    }
  }

  for (const child of children) {
    if (typeof child === 'string') {
      el.appendChild(document.createTextNode(child));
    } else if (child) {
      el.appendChild(child);
    }
  }

  return el;
}

/**
 * Escape HTML entities.
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Format a timestamp.
 */
function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Debounce function.
 */
function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
