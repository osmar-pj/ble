/**
 * Virtual on-screen keyboard for tablets (kiosk mode).
 * Self-contained: injects CSS, attaches to inputs/textareas.
 * Usage: <script src="virtual-keyboard.js"></script> before </body>
 */
(function () {
  'use strict';

  const LAYOUT_TEXT_LOWER = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ñ'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm', '.', ',', '-'],
    ['shift', 'space', 'backspace', 'done']
  ];

  const LAYOUT_TEXT_UPPER = [
    ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')'],
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '.', ',', '_'],
    ['shift', 'space', 'backspace', 'done']
  ];

  const LAYOUT_NUMERIC = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['.', '0', 'backspace', 'done']
  ];

  const CSS = `
    .vk-container {
      display: none;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 9999;
      background: #1e1e24;
      border-top: 1px solid rgba(255,255,255,0.1);
      box-shadow: 0 -4px 24px rgba(0,0,0,0.5);
      padding: 0.5rem;
      padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
      font-family: "Segoe UI", -apple-system, sans-serif;
    }
    .vk-container.vk-visible { display: block; }
    .vk-row {
      display: flex;
      justify-content: center;
      gap: 0.35rem;
      margin-bottom: 0.35rem;
    }
    .vk-row:last-child { margin-bottom: 0; }
    .vk-key {
      min-width: clamp(1.8rem, 2.5vw, 2.4rem);
      height: clamp(2.4rem, 3.5vh, 2.9rem);
      padding: 0 0.5rem;
      outline: none;
      font-size: 1rem;
      font-weight: 500;
      color: #f4f4f5;
      background: #2d2d35;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s, transform 0.05s;
      -webkit-tap-highlight-color: transparent;
      user-select: none;
    }
    .vk-key:hover { background: #3d3d45; }
    .vk-key:active { transform: scale(0.96); }
    .vk-key-wide { min-width: 4rem; }
    .vk-key-space { flex: 1; max-width: 12rem; min-width: 6rem; }
    .vk-key-shift { min-width: 3.5rem; font-size: 0.85rem; }
    .vk-key-backspace { min-width: 3rem; font-size: 0.9rem; }
    .vk-key-done {
      background: #63b3ed;
      color: #0f0f12;
      min-width: 3.5rem;
      font-weight: 600;
    }
    .vk-key-done:hover { background: #7ec8f7; }
    .vk-key-shift.vk-active {
      background: rgba(99,179,237,0.3);
      border-color: #63b3ed;
    }
  `;

  let container = null;
  let activeInput = null;
  let shiftOn = false;

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  function createElement(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text) el.textContent = text;
    return el;
  }

  function getLayout(input) {
    const type = (input.getAttribute('type') || 'text').toLowerCase();
    if (type === 'number' || type === 'tel') return 'numeric';
    return 'text';
  }

  function buildKeyboard(layout) {
    const rows = layout === 'numeric' ? LAYOUT_NUMERIC : (shiftOn ? LAYOUT_TEXT_UPPER : LAYOUT_TEXT_LOWER);
    const frag = document.createDocumentFragment();
    rows.forEach((keys) => {
      const row = createElement('div', 'vk-row');
      keys.forEach((key) => {
        const btn = createElement('button', 'vk-key');
        btn.type = 'button';
        btn.tabIndex = -1;
        if (key === 'space') {
          btn.classList.add('vk-key-space');
          btn.dataset.key = ' ';
          btn.innerHTML = '&nbsp;';
        } else if (key === 'shift') {
          btn.classList.add('vk-key-shift');
          btn.dataset.key = 'shift';
          btn.textContent = shiftOn ? '⇧' : '⇧';
          if (shiftOn) btn.classList.add('vk-active');
        } else if (key === 'backspace') {
          btn.classList.add('vk-key-backspace');
          btn.dataset.key = 'backspace';
          btn.textContent = '⌫';
        } else if (key === 'done') {
          btn.classList.add('vk-key-done');
          btn.dataset.key = 'done';
          btn.textContent = 'Listo';
        } else {
          btn.dataset.key = key;
          btn.textContent = key;
          if (key.length > 1 && key !== 'shift' && key !== 'backspace' && key !== 'done') btn.classList.add('vk-key-wide');
        }
        row.appendChild(btn);
      });
      frag.appendChild(row);
    });
    return frag;
  }

  function scrollInputIntoView() {
    if (!activeInput) return;
    const rect = activeInput.getBoundingClientRect();
    const kbHeight = container ? container.offsetHeight : 220;
    const viewportBottom = window.innerHeight - kbHeight;
    if (rect.bottom > viewportBottom) {
      const scrollY = rect.bottom - viewportBottom + 20;
      activeInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.scrollBy({ top: scrollY, behavior: 'smooth' });
    }
  }

  function insertChar(ch) {
    if (!activeInput) return;
    const start = activeInput.selectionStart;
    const end = activeInput.selectionEnd;
    const val = activeInput.value;
    activeInput.value = val.slice(0, start) + ch + val.slice(end);
    activeInput.selectionStart = activeInput.selectionEnd = start + 1;
    activeInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function backspace() {
    if (!activeInput) return;
    const start = activeInput.selectionStart;
    const end = activeInput.selectionEnd;
    const val = activeInput.value;
    if (start === end && start > 0) {
      activeInput.value = val.slice(0, start - 1) + val.slice(start);
      activeInput.selectionStart = activeInput.selectionEnd = start - 1;
    } else if (start !== end) {
      activeInput.value = val.slice(0, start) + val.slice(end);
      activeInput.selectionStart = activeInput.selectionEnd = start;
    }
    activeInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function showKeyboard(input) {
    if (activeInput === input) return;
    if (activeInput) {
      const orig = activeInput.getAttribute('data-vk-orig-inputmode');
      if (orig !== null) activeInput.setAttribute('inputmode', orig);
      else activeInput.removeAttribute('inputmode');
    }
    activeInput = input;
    input.setAttribute('data-vk-orig-inputmode', input.getAttribute('inputmode') || '');
    input.setAttribute('inputmode', 'none');
    const layout = getLayout(input);
    shiftOn = false;
    const body = container.querySelector('.vk-body');
    body.innerHTML = '';
    body.appendChild(buildKeyboard(layout));
    container.classList.add('vk-visible');
    scrollInputIntoView();
    container.querySelectorAll('.vk-key').forEach((btn) => {
      btn.addEventListener('mousedown', handleKeyDown);
      btn.addEventListener('touchstart', handleKeyDown, { passive: false });
    });
  }

  function hideKeyboard() {
    if (activeInput) {
      const orig = activeInput.getAttribute('data-vk-orig-inputmode');
      if (orig !== null) activeInput.setAttribute('inputmode', orig);
      else activeInput.removeAttribute('inputmode');
      activeInput.blur();
      activeInput = null;
    }
    container.classList.remove('vk-visible');
  }

  function handleKeyDown(e) {
    e.preventDefault();
    e.stopPropagation();
    const key = e.currentTarget.dataset.key;
    if (key === 'done') {
      hideKeyboard();
      return;
    }
    if (key === 'backspace') {
      backspace();
      if (activeInput) activeInput.focus();
      return;
    }
    if (key === 'shift') {
      shiftOn = !shiftOn;
      const layout = getLayout(activeInput);
      const body = container.querySelector('.vk-body');
      body.innerHTML = '';
      body.appendChild(buildKeyboard(layout));
      body.querySelectorAll('.vk-key').forEach((btn) => {
        btn.addEventListener('mousedown', handleKeyDown);
        btn.addEventListener('touchstart', handleKeyDown, { passive: false });
      });
      if (activeInput) activeInput.focus();
      return;
    }
    if (key === ' ') {
      insertChar(' ');
      if (activeInput) activeInput.focus();
      return;
    }
    if (key && key.length === 1) {
      insertChar(key);
      if (activeInput) activeInput.focus();
    }
  }

  function handleFocus(e) {
    const el = e.target;
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      showKeyboard(el);
    }
  }

  function handleClickOutside(e) {
    if (!container.contains(e.target) && !(e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
      hideKeyboard();
    }
  }

  function init() {
    injectStyles();
    container = createElement('div', 'vk-container');
    const body = createElement('div', 'vk-body');
    container.appendChild(body);

    document.addEventListener('focusin', handleFocus);
    document.addEventListener('click', handleFocus);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });

    document.body.appendChild(container);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
