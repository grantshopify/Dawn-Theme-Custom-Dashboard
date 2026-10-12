/*
  Wishlist (storefront side). Loaded on every page when Theme settings →
  Wishlist is enabled; see snippets/wishlist-setup.liquid.

  There is no separate database. A signed-in customer's list is stored in their
  Shopify account (customer metafield custom.wishlist, JSON) and rendered into
  the page by Liquid. Storefront pages have no Customer Account API session, so
  changes made here are kept as pending changes in this browser's localStorage
  (product IDs and handles only) and saved to the account the next time the
  customer opens the account dashboard, which has a session
  (assets/customer-dashboard.js calls window.CDWishlist). Guests' saves work the
  same way and join their account when they sign in.

  Pending changes belong to one customer: changes made while signed in as
  someone else, or left by a customer who has since signed out, are discarded.
*/
(() => {
  const configEl = document.getElementById('cd-wishlist-config');
  if (!configEl || window.CDWishlist) return;

  let config;
  try {
    config = JSON.parse(configEl.textContent);
  } catch {
    return;
  }

  const KEY = 'cd-wishlist:v1';
  const MAX = 100;
  const strings = config.strings || {};
  const customerId = config.customerId ? String(config.customerId) : null;

  // ---- Data ----------------------------------------------------------------
  const clean = (list) =>
    (Array.isArray(list) ? list : [])
      .filter((entry) => entry && /^\d+$/.test(String(entry.id)) && typeof entry.handle === 'string')
      .map((entry) => ({ id: String(entry.id), handle: entry.handle, at: entry.at || null }));

  let account = clean(config.account);

  function readStore() {
    try {
      const stored = JSON.parse(window.localStorage.getItem(KEY));
      if (stored && Array.isArray(stored.ops)) return { owner: stored.owner || null, ops: stored.ops };
    } catch {
      // Storage blocked or corrupt: start empty.
    }
    return { owner: null, ops: [] };
  }

  function writeStore() {
    try {
      if (!store.ops.length) window.localStorage.removeItem(KEY);
      else window.localStorage.setItem(KEY, JSON.stringify(store));
    } catch {
      // Storage blocked: changes last until the page is closed.
    }
  }

  const store = readStore();
  // Someone else's pending changes are dropped; a guest's are claimed.
  if (store.owner && store.owner !== customerId) store.ops = [];
  store.owner = customerId;
  writeStore();

  // Applies pending changes, in order, to a list.
  function apply(list, ops) {
    let result = list.slice();
    for (const op of ops) {
      result = result.filter((entry) => entry.id !== op.id);
      if (op.op === 'add') result.unshift({ id: op.id, handle: op.handle, at: op.at });
    }
    return result.slice(0, MAX);
  }

  // Only the latest change per product matters.
  function compact(ops) {
    const latest = new Map();
    for (const op of ops) {
      latest.delete(op.id);
      latest.set(op.id, op);
    }
    return [...latest.values()];
  }

  const items = () => apply(account, store.ops);
  const has = (id) => items().some((entry) => entry.id === String(id));

  const listeners = new Set();
  function notify() {
    const list = items();
    for (const fn of listeners) fn(list);
    document.dispatchEvent(new CustomEvent('cd:wishlist-change', { detail: { items: list } }));
    render();
  }

  function toggle(product) {
    const id = String(product.id);
    const adding = !has(id);
    if (adding && items().length >= MAX) return { ok: false, reason: 'full' };
    store.ops = compact([...store.ops, { op: adding ? 'add' : 'remove', id, handle: product.handle, at: new Date().toISOString() }]);
    writeStore();
    notify();
    return { ok: true, added: adding };
  }

  // ---- API used by the account dashboard ------------------------------------
  window.CDWishlist = {
    max: MAX,
    items,
    has,
    toggle,
    apply,
    clean,
    pending: () => store.ops.slice(),
    // After the dashboard saved `sentOps` into the account (now `list`).
    markSynced(sentOps, list) {
      const sent = new Set(sentOps.map((op) => `${op.op}|${op.id}|${op.at}`));
      store.ops = store.ops.filter((op) => !sent.has(`${op.op}|${op.id}|${op.at}`));
      account = clean(list);
      writeStore();
      notify();
    },
    // Signing out from the dashboard: forget this browser's pending changes.
    clear() {
      store.ops = [];
      store.owner = null;
      account = [];
      writeStore();
      notify();
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    config,
  };

  // ---- UI -------------------------------------------------------------------
  function render(root = document) {
    const ids = new Set(items().map((entry) => entry.id));
    for (const button of root.querySelectorAll('[data-wishlist-toggle]')) {
      const saved = ids.has(button.dataset.productId);
      button.classList.toggle('is-saved', saved);
      if (button.hasAttribute('aria-pressed')) button.setAttribute('aria-pressed', String(saved));
      const label = button.querySelector('[data-wishlist-label]');
      if (label) label.textContent = saved ? strings.saved : strings.add;
    }
    for (const count of document.querySelectorAll('[data-wishlist-count]')) {
      count.textContent = ids.size > 99 ? '99+' : String(ids.size);
      (count.closest('[data-wishlist-bubble]') || count).hidden = ids.size === 0;
    }
  }

  let toastEl;
  let toastTimer;
  function toast(message, withLink) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'wishlist-toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.append(toastEl);
    }
    toastEl.replaceChildren(document.createTextNode(message));
    if (withLink && config.listUrl) {
      const link = document.createElement('a');
      link.href = config.listUrl;
      link.className = 'wishlist-toast__link';
      link.textContent = strings.view;
      toastEl.append(' ', link);
    }
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 4000);
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-wishlist-toggle]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    const result = toggle({ id: button.dataset.productId, handle: button.dataset.productHandle });
    if (!result.ok) {
      toast(strings.full);
      return;
    }
    button.classList.remove('is-popping');
    void button.offsetWidth;
    if (result.added) button.classList.add('is-popping');
    if (result.added) toast(customerId ? strings.added : `${strings.added} ${strings.guestHint}`, true);
    else toast(strings.removed);
  });

  // Buttons added later (quick add modals, section re-renders) get the right state.
  if ('MutationObserver' in window) {
    let queued = false;
    new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        render();
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  // Another tab changed the list.
  window.addEventListener('storage', (event) => {
    if (event.key !== KEY) return;
    const fresh = readStore();
    store.ops = fresh.owner && fresh.owner !== customerId ? [] : fresh.ops;
    notify();
  });

  render();
})();
