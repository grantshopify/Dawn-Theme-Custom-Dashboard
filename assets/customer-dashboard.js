/*
 * Customer dashboard for Dawn.
 *
 * Vanilla JavaScript, no dependencies. All customer data comes from the
 * Shopify Customer Account API through the auth service configured on the
 * section (`data-auth-url`). This script never sees an access token: the
 * session lives in an HttpOnly cookie on the auth service's domain, and the
 * service only runs a fixed allowlist of operations scoped to the signed-in
 * customer.
 *
 * Every piece of API data is rendered with textContent / validated URLs.
 */
(() => {
  'use strict';

  const root = document.querySelector('[data-cd-root]');
  if (!root) return;

  // ---------------------------------------------------------------------------
  // Strings (English). Kept together so they are easy to translate.
  // ---------------------------------------------------------------------------
  const STRINGS = {
    welcome: (name) => (name ? `Welcome back, ${name}` : 'Welcome back'),
    overviewIntro: 'Manage your orders, track deliveries, and update your account information in one place.',
    totalOrders: 'Total Orders',
    totalOrdersHint: 'All orders placed with your account',
    inProgress: 'Orders In Progress',
    inProgressHint: 'Not yet fully fulfilled',
    completed: 'Completed Orders',
    completedHint: 'Fully fulfilled',
    statsCancelledNote: 'Cancelled orders count toward the total only.',
    orderSummary: 'Order summary',
    customerSince: (date) => `Customer since ${date}`,
    stepOrdered: 'Ordered',
    stepShipped: 'Shipped',
    stepInTransit: 'In transit',
    stepOutForDelivery: 'Out for delivery',
    stepReadyForPickup: 'Ready for pickup',
    stepDelivered: 'Delivered',
    stepPickedUp: 'Picked up',
    stepProgress: (current, total, label) => `Shipment progress: step ${current} of ${total}, ${label}`,
    statsUnavailable: 'Unavailable',
    statsCapped: 'Too many orders to count exactly here.',
    recentOrders: 'Recent orders',
    viewAllOrders: 'View All Orders',
    quickActions: 'Quick actions',
    trackOrders: 'Track Orders',
    trackOrdersHint: 'See shipment status and tracking links',
    manageProfile: 'Manage Profile',
    manageProfileHint: 'Update your name and contact details',
    viewAddresses: 'View Saved Addresses',
    viewAddressesHint: 'Add, edit or remove addresses',
    continueShopping: 'Continue Shopping',
    continueShoppingHint: 'Back to the store',
    noOrdersTitle: 'No orders yet.',
    noOrdersText: "Your orders will appear here once you've made your first purchase.",
    startShopping: 'Start Shopping',
    order: 'Order',
    orderNamed: (name) => `Order ${name}`,
    date: 'Date',
    placedOn: (date) => `Placed ${date}`,
    total: 'Total',
    fulfillment: 'Fulfillment',
    status: 'Status',
    payment: 'Payment',
    viewDetails: 'View Details',
    viewOrder: 'View Order',
    myOrders: 'My Orders',
    myOrdersIntro: 'Your complete order history.',
    previous: 'Previous',
    next: 'Next',
    pagination: 'Pagination',
    moreItems: (count) => `+${count}`,
    andMore: 'and more',
    allOrders: 'All orders',
    orderNotFound: "We couldn't find that order.",
    items: 'Items',
    quantity: 'Qty',
    each: 'each',
    summary: 'Summary',
    subtotal: 'Subtotal',
    shipping: 'Shipping',
    tax: 'Tax',
    duties: 'Duties',
    refunded: 'Refunded',
    discounts: 'Discounts',
    discountsIncluded: 'Included in the amounts above',
    shippingAddress: 'Shipping address',
    noShippingAddress: 'No shipping address on this order.',
    shipments: 'Shipments',
    orderStatusPage: 'Order status page',
    itemsTruncated: 'Only the first items are shown. See the order status page for the full list.',
    cancelledOn: (date) => `Cancelled ${date}`,
    trackingTitle: 'Order Tracking',
    trackingIntro: 'Shipment status and tracking details from your recent orders.',
    preparing: 'Preparing your order.',
    trackingUnavailable: 'Tracking information is not yet available.',
    noShippingRequired: "This order doesn't require shipping.",
    orderCancelled: 'This order was cancelled.',
    trackShipment: 'Track Shipment',
    carrier: 'Carrier',
    trackingNumber: 'Tracking number',
    shippedOn: (date) => `Shipped ${date}`,
    estimatedDelivery: (date) => `Estimated delivery ${date}`,
    shipmentItems: 'Items in this shipment',
    profileTitle: 'My Profile',
    profileIntro: 'Your personal details, as stored in your Shopify customer account.',
    personalInfo: 'Personal information',
    firstName: 'First name',
    lastName: 'Last name',
    save: 'Save changes',
    saving: 'Saving…',
    profileSaved: 'Your profile has been updated.',
    contactInfo: 'Sign-in and contact',
    email: 'Email address',
    phone: 'Phone number',
    notProvided: 'Not provided',
    contactNote: 'Your email address and phone number are managed in your Shopify account settings, where changes are verified.',
    manageContact: 'Manage email and phone',
    addressesTitle: 'Saved Addresses',
    addressesIntro: 'Addresses you can use at checkout.',
    addAddress: 'Add address',
    editAddress: 'Edit address',
    noAddressesTitle: 'No saved addresses yet.',
    noAddressesText: 'Add an address to speed up checkout.',
    defaultAddress: 'Default',
    setDefault: 'Set as default',
    edit: 'Edit',
    delete: 'Delete',
    cancel: 'Cancel',
    close: 'Close',
    saveAddress: 'Save address',
    makeDefault: 'Set as default address',
    defaultLocked: 'This is your default address. Set another address as default first to change this.',
    deleteDefaultBlocked: 'Set another default address before deleting this one.',
    deleteConfirmTitle: 'Delete this address?',
    deleteConfirmText: 'This address will be removed from your account. This cannot be undone.',
    addressSaved: 'Address saved.',
    addressDeleted: 'Address deleted.',
    defaultUpdated: 'Default address updated.',
    loadMore: 'Load more',
    country: 'Country/region',
    company: 'Company',
    address1: 'Address',
    address2: 'Apartment, suite, etc.',
    city: 'City',
    province: 'Province',
    zip: 'Postal code',
    optional: (label) => `${label} (optional)`,
    required: (label) => `Enter ${label.toLowerCase()}.`,
    select: (label) => `Select ${label.toLowerCase()}`,
    invalidZip: (example) => (example ? `Enter a valid postal code, for example ${example}.` : 'Enter a valid postal code.'),
    tooLong: 'This is too long (255 characters maximum).',
    formErrors: 'Please correct the highlighted fields.',
    phoneHint: 'Include the country code, for example +1 555 555 0123.',
    addressFormUnavailable: "The address form couldn't be loaded. Please try again.",
    errorTitle: "We couldn't load this section.",
    errorNetwork: 'Check your internet connection and try again.',
    errorRateLimited: 'Too many requests right now. Please wait a moment and try again.',
    errorGeneric: 'Something went wrong. Please try again.',
    tryAgain: 'Try again',
    saveFailed: "Your changes couldn't be saved.",
    authTitle: 'Sign in to view your account',
    authExpired: 'Your sign-in took too long or was interrupted.',
    authDenied: 'Sign-in was cancelled.',
    authFailed: "We couldn't complete your sign-in.",
    authLoop: "We couldn't keep you signed in. Please make sure cookies are enabled for this site.",
    signIn: 'Sign in',
    unavailableTitle: 'Your account dashboard is temporarily unavailable.',
    unavailableText: 'You can still view your orders and details in your Shopify account.',
    goToAccount: 'Go to my account',
    designModeTitle: 'Customer dashboard',
    designModeText: 'Customer data is not loaded in the theme editor. Preview this page on your storefront while signed in to see the live dashboard.',
    opensInNewWindow: '(opens in a new window)',
  };

  const FULFILLMENT_STATUS = {
    FULFILLED: ['Fulfilled', 'success'],
    PARTIALLY_FULFILLED: ['Partially fulfilled', 'warning'],
    IN_PROGRESS: ['In progress', 'info'],
    PENDING_FULFILLMENT: ['In progress', 'info'],
    SCHEDULED: ['Scheduled', 'info'],
    ON_HOLD: ['On hold', 'warning'],
    UNFULFILLED: ['Unfulfilled', 'neutral'],
    OPEN: ['Unfulfilled', 'neutral'],
    RESTOCKED: ['Unfulfilled', 'neutral'],
  };

  const FINANCIAL_STATUS = {
    PAID: ['Paid', 'success'],
    PARTIALLY_PAID: ['Partially paid', 'warning'],
    PENDING: ['Payment pending', 'warning'],
    AUTHORIZED: ['Authorized', 'info'],
    PARTIALLY_REFUNDED: ['Partially refunded', 'neutral'],
    REFUNDED: ['Refunded', 'neutral'],
    VOIDED: ['Voided', 'critical'],
    EXPIRED: ['Expired', 'critical'],
  };

  const SHIPMENT_STATUS = {
    CONFIRMED: ['Confirmed', 'info'],
    LABEL_PURCHASED: ['Label created', 'info'],
    LABEL_PRINTED: ['Label created', 'info'],
    CARRIER_PICKED_UP: ['Picked up by carrier', 'info'],
    IN_TRANSIT: ['In transit', 'info'],
    OUT_FOR_DELIVERY: ['Out for delivery', 'info'],
    ATTEMPTED_DELIVERY: ['Delivery attempted', 'warning'],
    DELAYED: ['Delayed', 'warning'],
    FAILURE: ['Delivery failed', 'critical'],
    READY_FOR_PICKUP: ['Ready for pickup', 'info'],
    PICKED_UP: ['Picked up', 'success'],
    DELIVERED: ['Delivered', 'success'],
  };

  // ---------------------------------------------------------------------------
  // Configuration from the section markup
  // ---------------------------------------------------------------------------
  const config = {
    authUrl: (root.dataset.authUrl || '').replace(/\/+$/, ''),
    signedIn: root.dataset.signedIn === 'true',
    storefrontLoginUrl: root.dataset.storefrontLoginUrl,
    profileUrl: root.dataset.profileUrl,
    accountUrl: root.dataset.accountUrl,
    logoutUrl: root.dataset.logoutUrl,
    shopUrl: root.dataset.shopUrl || '/',
    countriesUrl: root.dataset.countriesUrl,
    locale: root.dataset.locale || document.documentElement.lang || 'en',
    country: root.dataset.country,
    designMode: root.dataset.designMode === 'true' || Boolean(window.Shopify && window.Shopify.designMode),
  };

  const view = root.querySelector('[data-cd-view]');
  const toastRegion = root.querySelector('[data-cd-toast]');
  const sidebar = root.querySelector('.cd__sidebar');
  const menuToggle = root.querySelector('[data-cd-menu-toggle]');
  const menuCurrent = root.querySelector('[data-cd-menu-current]');
  const navLinks = [...root.querySelectorAll('[data-cd-route]')];
  const identityName = root.querySelector('[data-cd-name]');
  const identityAvatar = root.querySelector('[data-cd-avatar]');
  const logoutForm = root.querySelector('[data-cd-logout]');

  // ---------------------------------------------------------------------------
  // DOM helpers
  // ---------------------------------------------------------------------------
  function h(tag, props, ...children) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(props || {})) {
      if (value === undefined || value === null || value === false) continue;
      if (key === 'class') el.className = value;
      else if (key === 'text') el.textContent = value;
      else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
      else el.setAttribute(key, value === true ? '' : String(value));
    }
    appendChildren(el, children);
    return el;
  }

  function appendChildren(el, children) {
    for (const child of children.flat(Infinity)) {
      if (child === null || child === undefined || child === false) continue;
      el.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
  }

  function icon(name, className = 'cd-icon') {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', className);
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const use = document.createElementNS(ns, 'use');
    use.setAttribute('href', `#cd-i-${name}`);
    svg.append(use);
    return svg;
  }

  let uid = 0;
  const nextId = (prefix) => `cd-${prefix}-${++uid}`;

  // Only http(s) URLs from API data are ever used as links or image sources.
  function safeUrl(value) {
    if (typeof value !== 'string' || !value) return null;
    try {
      const url = new URL(value, window.location.origin);
      return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
    } catch {
      return null;
    }
  }

  function imageUrl(value, width) {
    const url = safeUrl(value);
    if (!url) return null;
    try {
      const parsed = new URL(url);
      if (parsed.hostname === 'cdn.shopify.com' || parsed.hostname.endsWith('.cdn.shopify.com') || parsed.pathname.startsWith('/cdn/shop/')) {
        parsed.searchParams.set('width', String(width));
      }
      return parsed.toString();
    } catch {
      return url;
    }
  }

  function externalLink(href, label, className) {
    return h(
      'a',
      { href, class: className, target: '_blank', rel: 'noopener noreferrer' },
      label,
      icon('external', 'cd-icon cd-icon--sm'),
      h('span', { class: 'visually-hidden' }, ` ${STRINGS.opensInNewWindow}`)
    );
  }

  function button(label, { variant = 'primary', type = 'button', onClick, iconName, href, className = '' } = {}) {
    const cls = `button button--${variant} cd-button ${className}`.trim();
    const content = [iconName ? icon(iconName, 'cd-icon cd-icon--sm') : null, h('span', null, label)];
    if (href) return h('a', { href, class: cls }, content);
    return h('button', { type, class: cls, onClick }, content);
  }

  function badge([label, tone]) {
    return h('span', { class: `cd-badge cd-badge--${tone}` }, label);
  }

  function statusBadge(map, value) {
    if (!value) return null;
    const entry = map[value] || [value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, ' '), 'neutral'];
    return badge(entry);
  }

  function orderStatus(order) {
    if (order.cancelledAt) return ['Cancelled', 'critical'];
    if (order.fulfillmentStatus === 'FULFILLED') return ['Completed', 'success'];
    return ['In progress', 'info'];
  }

  function pageHeader(title, intro, actions) {
    return h(
      'header',
      { class: 'cd-page-header' },
      h('div', { class: 'cd-page-header__text' }, h('h1', { class: 'cd-title', tabindex: '-1' }, title), intro ? h('p', { class: 'cd-subtitle' }, intro) : null),
      actions ? h('div', { class: 'cd-page-header__actions' }, actions) : null
    );
  }

  function card(title, ...content) {
    const headingId = title ? nextId('card') : null;
    return h(
      'section',
      { class: 'cd-card', 'aria-labelledby': headingId },
      title ? h('h2', { class: 'cd-card__title', id: headingId }, title) : null,
      content
    );
  }

  function emptyState({ iconName, title, text, action }) {
    return h(
      'div',
      { class: 'cd-empty' },
      h('span', { class: 'cd-empty__icon' }, icon(iconName)),
      h('p', { class: 'cd-empty__title' }, title),
      text ? h('p', { class: 'cd-empty__text' }, text) : null,
      action || null
    );
  }

  function skeleton(kind = 'list') {
    const lines = (count, cls) => Array.from({ length: count }, () => h('span', { class: `cd-skeleton ${cls}` }));
    const body =
      kind === 'detail'
        ? [lines(1, 'cd-skeleton--title'), lines(1, 'cd-skeleton--text'), h('div', { class: 'cd-grid cd-grid--detail' }, lines(2, 'cd-skeleton--panel'))]
        : kind === 'form'
          ? [lines(1, 'cd-skeleton--title'), lines(1, 'cd-skeleton--text'), lines(1, 'cd-skeleton--panel')]
          : [lines(1, 'cd-skeleton--title'), lines(1, 'cd-skeleton--text'), lines(4, 'cd-skeleton--row')];
    return h('div', { class: 'cd-loading', 'aria-hidden': 'true' }, body);
  }

  function errorMessage(error) {
    if (error && error.kind === 'network') return STRINGS.errorNetwork;
    if (error && error.kind === 'rate_limited') return STRINGS.errorRateLimited;
    return STRINGS.errorGeneric;
  }

  function errorState(error, retry) {
    return h(
      'div',
      { class: 'cd-empty cd-empty--error', role: 'alert' },
      h('span', { class: 'cd-empty__icon' }, icon('alert')),
      h('p', { class: 'cd-empty__title' }, STRINGS.errorTitle),
      h('p', { class: 'cd-empty__text' }, errorMessage(error)),
      retry ? button(STRINGS.tryAgain, { variant: 'secondary', onClick: retry }) : null
    );
  }

  let toastTimer;
  function toast(message, tone = 'success') {
    clearTimeout(toastTimer);
    toastRegion.replaceChildren(
      h('div', { class: `cd-toast__message cd-toast__message--${tone}` }, icon(tone === 'success' ? 'check-circle' : 'alert'), h('span', null, message))
    );
    toastRegion.classList.add('is-visible');
    toastTimer = setTimeout(() => {
      toastRegion.classList.remove('is-visible');
      toastTimer = setTimeout(() => toastRegion.replaceChildren(), 300);
    }, 5000);
  }

  // ---------------------------------------------------------------------------
  // Formatting
  // ---------------------------------------------------------------------------
  const dateFormat = safeFormatter(() => new Intl.DateTimeFormat(config.locale, { dateStyle: 'medium' }));
  const moneyFormats = new Map();

  function safeFormatter(create) {
    try {
      return create();
    } catch {
      return null;
    }
  }

  function formatDate(iso) {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return dateFormat ? dateFormat.format(date) : date.toDateString();
  }

  const monthYearFormat = safeFormatter(() => new Intl.DateTimeFormat(config.locale, { month: 'long', year: 'numeric' }));
  function formatMonthYear(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return monthYearFormat ? monthYearFormat.format(date) : String(date.getFullYear());
  }

  function formatMoney(money) {
    if (!money || money.amount === undefined || money.amount === null) return '—';
    const amount = Number(money.amount);
    const currency = money.currencyCode;
    if (!moneyFormats.has(currency)) {
      moneyFormats.set(currency, safeFormatter(() => new Intl.NumberFormat(config.locale, { style: 'currency', currency })));
    }
    const formatter = moneyFormats.get(currency);
    return formatter ? formatter.format(amount) : `${amount.toFixed(2)} ${currency}`;
  }

  function moneyWithCode(money) {
    return h('span', { class: 'cd-money' }, formatMoney(money), money && money.currencyCode ? h('span', { class: 'cd-money__code' }, ` ${money.currencyCode}`) : null);
  }

  function isPositive(money) {
    return money && Number(money.amount) > 0;
  }

  function sumMoney(allocations, currencyCode) {
    let cents = 0;
    for (const allocation of allocations) {
      const amount = allocation && allocation.allocatedAmount;
      if (amount) cents += Math.round(Number(amount.amount) * 100);
    }
    return { amount: (cents / 100).toFixed(2), currencyCode };
  }

  const numberFormat = safeFormatter(() => new Intl.NumberFormat(config.locale));
  const formatNumber = (value) => (numberFormat ? numberFormat.format(value) : String(value));

  function numericId(gid) {
    const match = /\/(\d+)(?:\?.*)?$/.exec(gid || '');
    return match ? match[1] : null;
  }

  // ---------------------------------------------------------------------------
  // API client (talks only to the auth service; cookies carry the session)
  // ---------------------------------------------------------------------------
  class ApiError extends Error {
    constructor(kind, message) {
      super(message || kind);
      this.kind = kind;
    }
  }

  // Requests run one at a time so that, if the access token needs refreshing,
  // only one request performs the refresh-token exchange.
  let queue = Promise.resolve();
  function serialized(task) {
    const run = queue.then(task, task);
    queue = run.catch(() => {});
    return run;
  }

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  async function request(path, init = {}, attempt = 0) {
    let response;
    try {
      response = await fetch(`${config.authUrl}${path}`, { credentials: 'include', cache: 'no-store', ...init });
    } catch {
      throw new ApiError('network');
    }
    if (response.status === 429 && attempt < 2) {
      const retryAfter = Math.min(Number(response.headers.get('Retry-After')) || 2, 10);
      await sleep(retryAfter * 1000);
      return request(path, init, attempt + 1);
    }
    let body = null;
    try {
      body = await response.json();
    } catch {
      // Non-JSON error body.
    }
    return { status: response.status, body };
  }

  const api = {
    async session() {
      const { status } = await serialized(() => request('/api/session'));
      if (status === 200) return true;
      if (status === 401) return false;
      throw new ApiError(status === 429 ? 'rate_limited' : 'server');
    },

    async call(operation, variables = {}) {
      const { status, body } = await serialized(() =>
        request('/api/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operation, variables }),
        })
      );
      if (status === 401) {
        auth.signIn();
        throw new ApiError('auth');
      }
      if (status === 429) throw new ApiError('rate_limited');
      if (status !== 200 || !body) throw new ApiError('server');
      // Partial data is accepted (for example a restricted field); a missing
      // root object is an error.
      if (!body.data) throw new ApiError('graphql', body.errors && body.errors[0] && body.errors[0].message);
      return body.data;
    },
  };

  // Small in-memory cache; cleared on logout and never persisted.
  const cache = new Map();
  async function cached(key, loader, ttl = 60000) {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < ttl) return hit.value;
    const value = await loader();
    cache.set(key, { value, at: Date.now() });
    return value;
  }

  // ---------------------------------------------------------------------------
  // Authentication flow
  // ---------------------------------------------------------------------------
  const ATTEMPTS_KEY = 'cd-auth-attempts';

  const auth = {
    // Counts sign-in redirects in a short window so a misconfiguration (for
    // example blocked cookies) shows an error instead of redirecting forever.
    // Only timestamps are stored; never tokens.
    recordAttempt() {
      try {
        const now = Date.now();
        const attempts = JSON.parse(sessionStorage.getItem(ATTEMPTS_KEY) || '[]').filter((t) => now - t < 120000);
        attempts.push(now);
        sessionStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts));
        return attempts.length;
      } catch {
        return 1;
      }
    },

    resetAttempts() {
      try {
        sessionStorage.removeItem(ATTEMPTS_KEY);
      } catch {
        // Storage unavailable; nothing to reset.
      }
    },

    returnTo() {
      const url = new URL(window.location.href);
      url.searchParams.delete('cd_auth_error');
      return `${url.pathname}${url.search}${url.hash}`;
    },

    // Signed in to the storefront: Shopify already knows the customer, so the
    // authorization request uses prompt=none and returns without a login form.
    // Otherwise the customer signs in once through Shopify's storefront login,
    // which returns here (now signed in) and continues silently.
    signIn({ interactive = false } = {}) {
      if (auth.recordAttempt() > 3) {
        renderAuthProblem('loop');
        return;
      }
      clearProtectedContent();
      if (config.signedIn || interactive || !config.storefrontLoginUrl) {
        const url = new URL('/auth/login', config.authUrl);
        url.searchParams.set('return_to', auth.returnTo());
        if (!interactive && config.signedIn) url.searchParams.set('prompt', 'none');
        if (config.locale) url.searchParams.set('locale', config.locale);
        window.location.assign(url.toString());
      } else {
        window.location.assign(config.storefrontLoginUrl);
      }
    },
  };

  function clearProtectedContent() {
    cache.clear();
    view.replaceChildren(skeleton());
    identityName.replaceChildren(h('span', { class: 'cd-skeleton cd-skeleton--text', 'aria-hidden': 'true' }));
    identityAvatar.textContent = '';
  }

  function renderAuthProblem(reason) {
    const messages = { expired: STRINGS.authExpired, denied: STRINGS.authDenied, loop: STRINGS.authLoop };
    view.setAttribute('aria-busy', 'false');
    view.replaceChildren(
      h(
        'div',
        { class: 'cd-empty cd-empty--auth', role: 'alert' },
        h('span', { class: 'cd-empty__icon' }, icon('user')),
        h('h1', { class: 'cd-empty__title', tabindex: '-1' }, STRINGS.authTitle),
        h('p', { class: 'cd-empty__text' }, messages[reason] || STRINGS.authFailed),
        h(
          'div',
          { class: 'cd-actions' },
          button(STRINGS.signIn, {
            onClick: () => {
              auth.resetAttempts();
              auth.signIn({ interactive: true });
            },
          }),
          config.accountUrl ? button(STRINGS.goToAccount, { variant: 'secondary', href: config.accountUrl }) : null
        )
      )
    );
  }

  function renderUnavailable() {
    view.setAttribute('aria-busy', 'false');
    view.replaceChildren(
      emptyState({
        iconName: 'alert',
        title: STRINGS.unavailableTitle,
        text: STRINGS.unavailableText,
        action: config.accountUrl ? button(STRINGS.goToAccount, { href: config.accountUrl }) : null,
      })
    );
  }

  function renderDesignMode() {
    view.setAttribute('aria-busy', 'false');
    identityName.textContent = STRINGS.designModeTitle;
    view.replaceChildren(
      pageHeader(STRINGS.welcome(''), STRINGS.overviewIntro),
      h('div', { class: 'cd-notice' }, icon('alert'), h('p', null, STRINGS.designModeText)),
      skeleton()
    );
  }

  // ---------------------------------------------------------------------------
  // Identity (sidebar)
  // ---------------------------------------------------------------------------
  function setIdentity(customer) {
    if (!customer) return;
    const name = [customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.displayName || '';
    identityName.textContent = name;
    const initials = [customer.firstName, customer.lastName]
      .filter(Boolean)
      .map((part) => part.trim().charAt(0).toUpperCase())
      .join('');
    identityAvatar.replaceChildren(initials ? document.createTextNode(initials) : icon('user'));
  }

  // ---------------------------------------------------------------------------
  // Shared order rendering
  // ---------------------------------------------------------------------------
  function orderHref(order) {
    const id = numericId(order.id);
    return id ? `#order/${id}` : '#orders';
  }

  function thumbnail(image, size = 64) {
    const src = image && imageUrl(image.url, size * 2);
    if (!src) return h('span', { class: 'cd-thumb cd-thumb--placeholder', 'aria-hidden': 'true' }, icon('package'));
    return h('img', { class: 'cd-thumb', src, alt: image.altText || '', width: size, height: size, loading: 'lazy', decoding: 'async' });
  }

  function ordersEmptyState() {
    return emptyState({
      iconName: 'package',
      title: STRINGS.noOrdersTitle,
      text: STRINGS.noOrdersText,
      action: button(STRINGS.startShopping, { href: config.shopUrl }),
    });
  }

  function recentOrdersTable(orders) {
    const head = h(
      'thead',
      null,
      h(
        'tr',
        null,
        [STRINGS.order, STRINGS.date, STRINGS.total, STRINGS.fulfillment, STRINGS.status].map((label) => h('th', { scope: 'col' }, label)),
        h('th', { scope: 'col' }, h('span', { class: 'visually-hidden' }, STRINGS.viewDetails))
      )
    );
    const rows = orders.map((order) =>
      h(
        'tr',
        null,
        h('th', { scope: 'row', 'data-label': STRINGS.order }, order.name),
        h('td', { 'data-label': STRINGS.date }, formatDate(order.processedAt)),
        h('td', { 'data-label': STRINGS.total }, moneyWithCode(order.totalPrice)),
        h('td', { 'data-label': STRINGS.fulfillment }, statusBadge(FULFILLMENT_STATUS, order.fulfillmentStatus)),
        h('td', { 'data-label': STRINGS.status }, badge(orderStatus(order))),
        h(
          'td',
          { class: 'cd-table__action' },
          h(
            'a',
            { href: orderHref(order), class: 'cd-link' },
            STRINGS.viewDetails,
            h('span', { class: 'visually-hidden' }, ` ${STRINGS.orderNamed(order.name)}`),
            icon('chevron-right', 'cd-icon cd-icon--sm')
          )
        )
      )
    );
    return h('div', { class: 'cd-table-wrap' }, h('table', { class: 'cd-table' }, head, h('tbody', null, rows)));
  }

  // Shipment stage, derived only from Shopify's latestShipmentStatus. No
  // carrier events are invented: the stepper shows the furthest stage Shopify reports.
  const STEP_INDEX = {
    CONFIRMED: 1,
    LABEL_PURCHASED: 1,
    LABEL_PRINTED: 1,
    CARRIER_PICKED_UP: 2,
    IN_TRANSIT: 2,
    DELAYED: 2,
    FAILURE: 2,
    ATTEMPTED_DELIVERY: 3,
    OUT_FOR_DELIVERY: 3,
    READY_FOR_PICKUP: 3,
    DELIVERED: 4,
    PICKED_UP: 4,
  };
  const STEP_WARNING = new Set(['DELAYED', 'FAILURE', 'ATTEMPTED_DELIVERY']);

  function shipmentSteps(status, { preparing = false } = {}) {
    const pickup = status === 'READY_FOR_PICKUP' || status === 'PICKED_UP';
    const labels = [
      STRINGS.stepOrdered,
      STRINGS.stepShipped,
      STRINGS.stepInTransit,
      pickup ? STRINGS.stepReadyForPickup : STRINGS.stepOutForDelivery,
      pickup ? STRINGS.stepPickedUp : STRINGS.stepDelivered,
    ];
    const current = preparing ? 0 : STEP_INDEX[status] ?? 1;
    const complete = current === labels.length - 1;
    return h(
      'ol',
      {
        class: `cd-steps${STEP_WARNING.has(status) ? ' cd-steps--warning' : ''}${complete ? ' cd-steps--complete' : ''}`,
        role: 'list',
        'aria-label': STRINGS.stepProgress(current + 1, labels.length, labels[current]),
      },
      labels.map((label, index) =>
        h(
          'li',
          {
            class: `cd-step${index < current ? ' is-done' : ''}${index === current ? ' is-current' : ''}`,
            'aria-current': index === current ? 'step' : null,
          },
          h('span', { class: 'cd-step__dot', 'aria-hidden': 'true' }, index < current || (complete && index === current) ? icon('check', 'cd-icon cd-step__check') : null),
          h('span', { class: 'cd-step__label' }, label)
        )
      )
    );
  }

  // Shipment details for one order, built only from Shopify fulfillment data.
  function shipments(order, fulfillments, { showItems = false } = {}) {
    const active = (fulfillments || []).filter((f) => f.status !== 'CANCELLED');
    if (order.cancelledAt) return [h('p', { class: 'cd-shipment-note' }, icon('alert', 'cd-icon cd-icon--sm'), STRINGS.orderCancelled)];
    if (!active.length) {
      if (order.requiresShipping === false) {
        return [h('p', { class: 'cd-shipment-note' }, icon('check-circle', 'cd-icon cd-icon--sm'), STRINGS.noShippingRequired)];
      }
      return [
        h(
          'div',
          { class: 'cd-shipment cd-shipment--pending' },
          shipmentSteps(null, { preparing: true }),
          h('p', { class: 'cd-shipment-note' }, icon('clock', 'cd-icon cd-icon--sm'), STRINGS.preparing)
        ),
      ];
    }

    return active.map((fulfillment) => {
      const tracking = (fulfillment.trackingInformation || []).filter((t) => t && (t.number || t.url || t.company));
      const items = showItems && fulfillment.fulfillmentLineItems ? fulfillment.fulfillmentLineItems.nodes || [] : [];
      const moreItems = showItems && fulfillment.fulfillmentLineItems && fulfillment.fulfillmentLineItems.pageInfo && fulfillment.fulfillmentLineItems.pageInfo.hasNextPage;

      return h(
        'div',
        { class: 'cd-shipment' },
        h(
          'div',
          { class: 'cd-shipment__header' },
          h('span', { class: 'cd-shipment__date' }, icon('truck', 'cd-icon cd-icon--sm'), STRINGS.shippedOn(formatDate(fulfillment.createdAt))),
          statusBadge(SHIPMENT_STATUS, fulfillment.latestShipmentStatus)
        ),
        fulfillment.requiresShipping === false ? null : shipmentSteps(fulfillment.latestShipmentStatus),
        fulfillment.estimatedDeliveryAt && fulfillment.latestShipmentStatus !== 'DELIVERED'
          ? h('p', { class: 'cd-muted' }, STRINGS.estimatedDelivery(formatDate(fulfillment.estimatedDeliveryAt)))
          : null,
        tracking.length
          ? tracking.map((info) => {
              const url = safeUrl(info.url);
              return h(
                'div',
                { class: 'cd-tracking' },
                h(
                  'dl',
                  { class: 'cd-tracking__details' },
                  info.company ? h('div', null, h('dt', null, STRINGS.carrier), h('dd', null, info.company)) : null,
                  info.number ? h('div', null, h('dt', null, STRINGS.trackingNumber), h('dd', { class: 'cd-mono' }, info.number)) : null
                ),
                url ? externalLink(url, STRINGS.trackShipment, 'button button--secondary cd-button cd-button--small') : null
              );
            })
          : h('p', { class: 'cd-shipment-note' }, icon('clock', 'cd-icon cd-icon--sm'), STRINGS.trackingUnavailable),
        items.length
          ? h(
              'div',
              { class: 'cd-shipment__items' },
              h('p', { class: 'cd-label' }, STRINGS.shipmentItems),
              h(
                'ul',
                { role: 'list' },
                items.map((item) => h('li', null, `${item.quantity ?? ''} × ${item.lineItem ? item.lineItem.title : ''}`)),
                moreItems ? h('li', { class: 'cd-muted' }, STRINGS.andMore) : null
              )
            )
          : null
      );
    });
  }

  function pager(pageInfo, onPage) {
    if (!pageInfo || (!pageInfo.hasPreviousPage && !pageInfo.hasNextPage)) return null;
    return h(
      'nav',
      { class: 'cd-pager', 'aria-label': STRINGS.pagination },
      button(STRINGS.previous, {
        variant: 'secondary',
        iconName: 'chevron-left',
        onClick: pageInfo.hasPreviousPage ? () => onPage({ before: pageInfo.startCursor }) : undefined,
        className: pageInfo.hasPreviousPage ? '' : 'is-hidden',
      }),
      button(STRINGS.next, {
        variant: 'secondary',
        onClick: pageInfo.hasNextPage ? () => onPage({ after: pageInfo.endCursor }) : undefined,
        className: `cd-button--icon-end${pageInfo.hasNextPage ? '' : ' is-hidden'}`,
        iconName: 'chevron-right',
      })
    );
  }

  // Renders a paginated list into `container`, keeping the header in place.
  function paginatedList({ container, load, renderPage, focusTarget }) {
    async function show(cursor, { focus = false } = {}) {
      container.setAttribute('aria-busy', 'true');
      container.replaceChildren(skeleton('list'));
      try {
        const page = await load(cursor);
        container.replaceChildren(renderPage(page, (next) => show(next, { focus: true })));
      } catch (error) {
        if (error.kind === 'auth') return;
        container.replaceChildren(errorState(error, () => show(cursor, { focus: true })));
      } finally {
        container.setAttribute('aria-busy', 'false');
      }
      if (focus && focusTarget) {
        focusTarget.focus();
        focusTarget.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
    }
    return show;
  }

  // ---------------------------------------------------------------------------
  // Views
  // ---------------------------------------------------------------------------
  const MAX_STATS_PAGES = 30;

  async function computeStats() {
    let after = null;
    let pages = 0;
    const stats = { total: 0, inProgress: 0, completed: 0, capped: false };
    do {
      const data = await api.call('OrderStats', after ? { after } : {});
      const connection = data.customer.orders;
      for (const order of connection.nodes) {
        stats.total += 1;
        if (order.cancelledAt) continue;
        if (order.fulfillmentStatus === 'FULFILLED') stats.completed += 1;
        else stats.inProgress += 1;
      }
      after = connection.pageInfo.hasNextPage ? connection.pageInfo.endCursor : null;
      pages += 1;
      if (after && pages >= MAX_STATS_PAGES) {
        stats.capped = true;
        after = null;
      }
    } while (after);
    return stats;
  }

  // One panel with the three counts and a breakdown bar (in progress /
  // completed / cancelled), all computed from the customer's Shopify orders.
  function statsPanel() {
    const item = (label, hint, iconName, tone) => {
      const value = h('p', { class: 'cd-stats__value' }, h('span', { class: 'cd-skeleton cd-skeleton--number', 'aria-hidden': 'true' }));
      const el = h(
        'div',
        { class: `cd-stats__item cd-stats__item--${tone}` },
        h('p', { class: 'cd-stats__label' }, h('span', { class: 'cd-stats__icon' }, icon(iconName, 'cd-icon cd-icon--sm')), label),
        value,
        h('p', { class: 'cd-stats__hint' }, hint)
      );
      return {
        el,
        set(text, title) {
          value.replaceChildren(text);
          if (title) value.setAttribute('title', title);
        },
      };
    };

    const total = item(STRINGS.totalOrders, STRINGS.totalOrdersHint, 'receipt', 'total');
    const progress = item(STRINGS.inProgress, STRINGS.inProgressHint, 'clock', 'progress');
    const completed = item(STRINGS.completed, STRINGS.completedHint, 'check-circle', 'completed');
    const bar = h('div', { class: 'cd-stats__bar', 'aria-hidden': 'true' });
    const note = h('p', { class: 'cd-stats__note' }, STRINGS.statsCancelledNote);
    const headingId = nextId('stats');

    const el = h(
      'section',
      { class: 'cd-card cd-stats', 'aria-labelledby': headingId },
      h('h2', { class: 'visually-hidden', id: headingId }, STRINGS.orderSummary),
      h('div', { class: 'cd-stats__grid' }, total.el, progress.el, completed.el),
      h('div', { class: 'cd-stats__footer' }, bar, note)
    );

    return {
      el,
      fill(stats) {
        if (stats.capped) {
          total.set(`${formatNumber(stats.total)}+`, STRINGS.statsCapped);
          progress.set('—', STRINGS.statsCapped);
          completed.set('—', STRINGS.statsCapped);
          bar.remove();
          return;
        }
        total.set(formatNumber(stats.total));
        progress.set(formatNumber(stats.inProgress));
        completed.set(formatNumber(stats.completed));
        const cancelled = Math.max(0, stats.total - stats.inProgress - stats.completed);
        if (!stats.total) {
          el.classList.add('cd-stats--empty');
          return;
        }
        const segment = (count, tone) =>
          count ? h('span', { class: `cd-stats__seg cd-stats__seg--${tone}`, style: `flex-grow: ${count}` }) : null;
        bar.replaceChildren(...[segment(stats.completed, 'completed'), segment(stats.inProgress, 'progress'), segment(cancelled, 'cancelled')].filter(Boolean));
        el.classList.add('is-loaded');
      },
      fail() {
        for (const entry of [total, progress, completed]) entry.set('—', STRINGS.statsUnavailable);
        bar.remove();
      },
    };
  }

  async function overviewView() {
    const data = await api.call('Overview');
    const customer = data.customer;
    setIdentity(customer);
    const orders = customer.orders.nodes;

    const stats = statsPanel();
    if (!orders.length) {
      stats.fill({ total: 0, inProgress: 0, completed: 0 });
    } else {
      cached('stats', computeStats, 5 * 60000)
        .then(stats.fill)
        .catch((error) => {
          if (error.kind !== 'auth') stats.fail();
        });
    }

    const since = customer.creationDate ? formatMonthYear(customer.creationDate) : '';

    const recentHeadingId = nextId('recent');
    const quickHeadingId = nextId('quick');
    const quickAction = (href, iconName, label, hint) =>
      h(
        'a',
        { href, class: 'cd-card cd-quick' },
        h('span', { class: 'cd-quick__icon' }, icon(iconName)),
        h('span', { class: 'cd-quick__text' }, h('span', { class: 'cd-quick__label' }, label), h('span', { class: 'cd-quick__hint' }, hint)),
        icon('chevron-right', 'cd-icon cd-quick__chevron')
      );

    return h(
      'div',
      { class: 'cd-stack' },
      h(
        'header',
        { class: 'cd-hero' },
        since ? h('p', { class: 'cd-eyebrow' }, STRINGS.customerSince(since)) : null,
        h('h1', { class: 'cd-title cd-title--display', tabindex: '-1' }, STRINGS.welcome(customer.firstName)),
        h('p', { class: 'cd-subtitle' }, STRINGS.overviewIntro)
      ),
      stats.el,
      h(
        'section',
        { class: 'cd-card cd-card--flush', 'aria-labelledby': recentHeadingId },
        h(
          'div',
          { class: 'cd-card__header' },
          h('h2', { class: 'cd-card__title', id: recentHeadingId }, STRINGS.recentOrders)
        ),
        orders.length ? recentOrdersTable(orders) : ordersEmptyState(),
        orders.length ? h('div', { class: 'cd-card__footer' }, button(STRINGS.viewAllOrders, { variant: 'secondary', href: '#orders' })) : null
      ),
      h(
        'section',
        { 'aria-labelledby': quickHeadingId },
        h('h2', { class: 'cd-section-title', id: quickHeadingId }, STRINGS.quickActions),
        h(
          'div',
          { class: 'cd-grid cd-grid--quick' },
          quickAction('#tracking', 'truck', STRINGS.trackOrders, STRINGS.trackOrdersHint),
          quickAction('#profile', 'user', STRINGS.manageProfile, STRINGS.manageProfileHint),
          quickAction('#addresses', 'pin', STRINGS.viewAddresses, STRINGS.viewAddressesHint),
          quickAction(config.shopUrl, 'bag', STRINGS.continueShopping, STRINGS.continueShoppingHint)
        )
      )
    );
  }

  function orderCard(order) {
    const items = order.lineItems ? order.lineItems.nodes : [];
    const hasMore = order.lineItems && order.lineItems.pageInfo && order.lineItems.pageInfo.hasNextPage;
    const names = items.map((item) => (item.quantity > 1 ? `${item.title} × ${item.quantity}` : item.title)).join(', ');
    const headingId = nextId('order');
    return h(
      'article',
      { class: 'cd-card cd-order', 'aria-labelledby': headingId },
      h(
        'div',
        { class: 'cd-order__header' },
        h('div', null, h('h2', { class: 'cd-order__name', id: headingId }, STRINGS.orderNamed(order.name)), h('p', { class: 'cd-muted' }, STRINGS.placedOn(formatDate(order.processedAt)))),
        h('div', { class: 'cd-order__total' }, h('span', { class: 'visually-hidden' }, `${STRINGS.total}: `), moneyWithCode(order.totalPrice))
      ),
      items.length
        ? h(
            'div',
            { class: 'cd-order__items' },
            h('div', { class: 'cd-order__thumbs' }, items.map((item) => thumbnail(item.image, 56)), hasMore ? h('span', { class: 'cd-thumb cd-thumb--more' }, '+') : null),
            h('p', { class: 'cd-order__names' }, names, hasMore ? `, ${STRINGS.andMore}` : '')
          )
        : null,
      h(
        'div',
        { class: 'cd-order__footer' },
        h(
          'div',
          { class: 'cd-badges' },
          order.cancelledAt ? badge(orderStatus(order)) : null,
          statusBadge(FINANCIAL_STATUS, order.financialStatus),
          statusBadge(FULFILLMENT_STATUS, order.fulfillmentStatus)
        ),
        h(
          'a',
          { href: orderHref(order), class: 'button button--secondary cd-button cd-button--small' },
          STRINGS.viewOrder,
          h('span', { class: 'visually-hidden' }, ` ${order.name}`)
        )
      )
    );
  }

  async function ordersView() {
    const list = h('div', { class: 'cd-list', 'aria-live': 'polite' });
    const header = pageHeader(STRINGS.myOrders, STRINGS.myOrdersIntro);
    const show = paginatedList({
      container: list,
      focusTarget: header.querySelector('h1'),
      load: (cursor) => api.call('Orders', cursor || {}),
      renderPage: (data, onPage) => {
        const connection = data.customer.orders;
        if (!connection.nodes.length && !cursorUsed(connection.pageInfo)) return ordersEmptyState();
        return h('div', { class: 'cd-stack cd-stack--tight' }, connection.nodes.map(orderCard), pager(connection.pageInfo, onPage));
      },
    });
    await show(null);
    return h('div', { class: 'cd-stack' }, header, list);
  }

  const cursorUsed = (pageInfo) => pageInfo && (pageInfo.hasPreviousPage || pageInfo.hasNextPage);

  async function orderDetailView(route) {
    const data = await api.call('Order', { id: `gid://shopify/Order/${route.id}` });
    const order = data.order;
    const back = h('a', { href: '#orders', class: 'cd-back' }, icon('arrow-left', 'cd-icon cd-icon--sm'), STRINGS.allOrders);
    if (!order) {
      return h('div', { class: 'cd-stack' }, back, emptyState({ iconName: 'package', title: STRINGS.orderNotFound, action: button(STRINGS.allOrders, { href: '#orders' }) }));
    }

    const lineItems = order.lineItems.nodes;
    const currency = order.currencyCode || (order.totalPrice && order.totalPrice.currencyCode);
    const discount = sumMoney(
      [...lineItems.flatMap((item) => item.discountAllocations || []), ...(order.shippingDiscountAllocations || [])],
      currency
    );
    const statusUrl = safeUrl(order.statusPageUrl);

    const itemRows = lineItems.map((item) => {
      const variant = item.variantTitle || (item.variantOptions || []).map((option) => `${option.name}: ${option.value}`).join(' / ');
      return h(
        'li',
        { class: 'cd-line' },
        thumbnail(item.image, 64),
        h(
          'div',
          { class: 'cd-line__info' },
          h('p', { class: 'cd-line__title' }, item.title),
          variant ? h('p', { class: 'cd-muted' }, variant) : null,
          h('p', { class: 'cd-muted' }, `${STRINGS.quantity}: ${item.quantity}`, item.price ? ` · ${formatMoney(item.price)} ${STRINGS.each}` : '')
        ),
        h('p', { class: 'cd-line__total' }, formatMoney(item.totalPrice))
      );
    });

    const summaryRow = (label, money, { strong = false, note, negative = false } = {}) =>
      h(
        'div',
        { class: `cd-summary__row${strong ? ' cd-summary__row--total' : ''}` },
        h('dt', null, label, note ? h('span', { class: 'cd-muted cd-summary__note' }, note) : null),
        h('dd', null, negative ? `−${formatMoney(money)}` : strong ? moneyWithCode(money) : formatMoney(money))
      );

    const addressLines = order.shippingAddress ? order.shippingAddress.formatted || [] : [];

    return h(
      'div',
      { class: 'cd-stack' },
      back,
      pageHeader(
        STRINGS.orderNamed(order.name),
        null,
        statusUrl ? externalLink(statusUrl, STRINGS.orderStatusPage, 'button button--secondary cd-button cd-button--small') : null
      ),
      h(
        'div',
        { class: 'cd-meta' },
        h('span', null, STRINGS.placedOn(formatDate(order.processedAt))),
        order.cancelledAt ? h('span', null, STRINGS.cancelledOn(formatDate(order.cancelledAt))) : null,
        h(
          'span',
          { class: 'cd-badges' },
          badge(orderStatus(order)),
          statusBadge(FINANCIAL_STATUS, order.financialStatus),
          statusBadge(FULFILLMENT_STATUS, order.fulfillmentStatus)
        )
      ),
      h(
        'div',
        { class: 'cd-grid cd-grid--detail' },
        h(
          'div',
          { class: 'cd-stack' },
          card(
            STRINGS.items,
            h('ul', { class: 'cd-lines', role: 'list' }, itemRows),
            order.lineItems.pageInfo.hasNextPage ? h('p', { class: 'cd-footnote' }, STRINGS.itemsTruncated) : null
          ),
          card(STRINGS.shipments, h('div', { class: 'cd-stack cd-stack--tight' }, shipments(order, order.fulfillments.nodes, { showItems: true })))
        ),
        h(
          'div',
          { class: 'cd-stack' },
          card(
            STRINGS.summary,
            h(
              'dl',
              { class: 'cd-summary' },
              order.subtotal ? summaryRow(STRINGS.subtotal, order.subtotal) : null,
              summaryRow(STRINGS.shipping, order.totalShipping, { note: order.shippingLine && order.shippingLine.title }),
              order.totalTax ? summaryRow(STRINGS.tax, order.totalTax) : null,
              isPositive(order.totalDuties) ? summaryRow(STRINGS.duties, order.totalDuties) : null,
              summaryRow(STRINGS.total, order.totalPrice, { strong: true }),
              isPositive(order.totalRefunded) ? summaryRow(STRINGS.refunded, order.totalRefunded, { negative: true }) : null,
              isPositive(discount) && !order.lineItems.pageInfo.hasNextPage
                ? summaryRow(STRINGS.discounts, discount, { negative: true, note: STRINGS.discountsIncluded })
                : null
            )
          ),
          card(
            STRINGS.shippingAddress,
            addressLines.length
              ? h('address', { class: 'cd-address' }, addressLines.map((line) => h('span', null, line)))
              : h('p', { class: 'cd-muted' }, STRINGS.noShippingAddress)
          )
        )
      )
    );
  }

  async function trackingView() {
    const list = h('div', { class: 'cd-list', 'aria-live': 'polite' });
    const header = pageHeader(STRINGS.trackingTitle, STRINGS.trackingIntro);
    const show = paginatedList({
      container: list,
      focusTarget: header.querySelector('h1'),
      load: (cursor) => api.call('Tracking', cursor || {}),
      renderPage: (data, onPage) => {
        const connection = data.customer.orders;
        if (!connection.nodes.length && !cursorUsed(connection.pageInfo)) return ordersEmptyState();
        return h(
          'div',
          { class: 'cd-stack cd-stack--tight' },
          connection.nodes.map((order) => {
            const headingId = nextId('track');
            return h(
              'article',
              { class: 'cd-card cd-track', 'aria-labelledby': headingId },
              h(
                'div',
                { class: 'cd-order__header' },
                h(
                  'div',
                  null,
                  h('h2', { class: 'cd-order__name', id: headingId }, h('a', { href: orderHref(order), class: 'cd-link-plain' }, STRINGS.orderNamed(order.name))),
                  h('p', { class: 'cd-muted' }, STRINGS.placedOn(formatDate(order.processedAt)))
                ),
                h('div', { class: 'cd-badges' }, order.cancelledAt ? badge(orderStatus(order)) : statusBadge(FULFILLMENT_STATUS, order.fulfillmentStatus))
              ),
              h('div', { class: 'cd-stack cd-stack--tight' }, shipments(order, order.fulfillments.nodes))
            );
          }),
          pager(connection.pageInfo, onPage)
        );
      },
    });
    await show(null);
    return h('div', { class: 'cd-stack' }, header, list);
  }

  // ---- Forms ----------------------------------------------------------------

  function field({ name, label, value = '', type = 'text', required = false, autocomplete, hint, readOnly = false, inputMode, maxLength = 255 }) {
    const id = nextId(name);
    const errorId = `${id}-error`;
    const hintId = hint ? `${id}-hint` : null;
    const input = h('input', {
      id,
      name,
      type,
      value,
      required,
      autocomplete,
      inputmode: inputMode,
      maxlength: maxLength,
      readonly: readOnly,
      class: 'cd-input',
      'aria-describedby': [hintId, errorId].filter(Boolean).join(' '),
    });
    input.value = value || '';
    return h(
      'div',
      { class: 'cd-field', 'data-field': name },
      h('label', { for: id, class: 'cd-field__label' }, label, required ? h('span', { class: 'cd-required', 'aria-hidden': 'true' }, ' *') : null),
      input,
      hint ? h('p', { class: 'cd-field__hint', id: hintId }, hint) : null,
      h('p', { class: 'cd-field__error', id: errorId, hidden: true })
    );
  }

  function selectField({ name, label, options, value, required = false, autocomplete, placeholder }) {
    const id = nextId(name);
    const errorId = `${id}-error`;
    const select = h(
      'select',
      { id, name, required, autocomplete, class: 'cd-input cd-select', 'aria-describedby': errorId },
      placeholder !== undefined ? h('option', { value: '' }, placeholder) : null,
      options.map(([optionValue, optionLabel]) => h('option', { value: optionValue }, optionLabel))
    );
    select.value = value || '';
    return h(
      'div',
      { class: 'cd-field', 'data-field': name },
      h('label', { for: id, class: 'cd-field__label' }, label, required ? h('span', { class: 'cd-required', 'aria-hidden': 'true' }, ' *') : null),
      h('div', { class: 'cd-select-wrap' }, select, icon('chevron-down', 'cd-icon cd-select-wrap__icon')),
      h('p', { class: 'cd-field__error', id: errorId, hidden: true })
    );
  }

  function setFieldError(form, name, message) {
    const wrapper = form.querySelector(`[data-field="${name}"]`);
    if (!wrapper) return false;
    const control = wrapper.querySelector('input, select');
    const error = wrapper.querySelector('.cd-field__error');
    if (message) {
      control.setAttribute('aria-invalid', 'true');
      error.textContent = message;
      error.hidden = false;
    } else {
      control.removeAttribute('aria-invalid');
      error.textContent = '';
      error.hidden = true;
    }
    return true;
  }

  function clearErrors(form) {
    for (const wrapper of form.querySelectorAll('[data-field]')) setFieldError(form, wrapper.dataset.field, null);
    const summary = form.querySelector('[data-form-error]');
    if (summary) {
      summary.hidden = true;
      summary.textContent = '';
    }
  }

  function showFormError(form, message) {
    const summary = form.querySelector('[data-form-error]');
    summary.textContent = message;
    summary.hidden = false;
    summary.focus();
  }

  function focusFirstInvalid(form) {
    const invalid = form.querySelector('[aria-invalid="true"]');
    if (invalid) invalid.focus();
  }

  function formError() {
    return h('div', { class: 'cd-form-error', role: 'alert', tabindex: '-1', 'data-form-error': true, hidden: true });
  }

  function setBusy(buttonEl, busy, busyLabel) {
    const label = buttonEl.querySelector('span:last-child') || buttonEl;
    if (busy) {
      buttonEl.dataset.label = label.textContent;
      label.textContent = busyLabel;
      buttonEl.disabled = true;
      buttonEl.setAttribute('aria-busy', 'true');
    } else {
      if (buttonEl.dataset.label) label.textContent = buttonEl.dataset.label;
      buttonEl.disabled = false;
      buttonEl.removeAttribute('aria-busy');
    }
  }

  // Maps Shopify userErrors ({ field: ['input', 'firstName'], message }) to inputs.
  function applyUserErrors(form, userErrors, fieldMap = {}) {
    let unmatched = [];
    for (const error of userErrors) {
      const path = Array.isArray(error.field) ? error.field : [];
      const last = path[path.length - 1];
      const name = fieldMap[last] || last;
      if (!name || !setFieldError(form, name, error.message)) unmatched.push(error.message);
    }
    unmatched = unmatched.filter(Boolean);
    showFormError(form, unmatched.length ? unmatched.join(' ') : STRINGS.formErrors);
    focusFirstInvalid(form);
  }

  // ---- Profile --------------------------------------------------------------

  async function profileView() {
    const data = await cached('profile', () => api.call('Profile'));
    const customer = data.customer;
    setIdentity(customer);

    const saveButton = button(STRINGS.save, { type: 'submit' });
    const form = h(
      'form',
      { class: 'cd-form', novalidate: true },
      formError(),
      h(
        'div',
        { class: 'cd-form-row cd-form-row--2' },
        field({ name: 'firstName', label: STRINGS.firstName, value: customer.firstName, autocomplete: 'given-name' }),
        field({ name: 'lastName', label: STRINGS.lastName, value: customer.lastName, autocomplete: 'family-name' })
      ),
      h('div', { class: 'cd-form__actions' }, saveButton)
    );

    const initial = { firstName: customer.firstName || '', lastName: customer.lastName || '' };
    const values = () => ({ firstName: form.elements.firstName.value.trim(), lastName: form.elements.lastName.value.trim() });
    const syncDirty = () => {
      const current = values();
      saveButton.disabled = current.firstName === initial.firstName && current.lastName === initial.lastName;
    };
    syncDirty();
    form.addEventListener('input', syncDirty);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      clearErrors(form);
      const input = values();
      let invalid = false;
      for (const [name, value] of Object.entries(input)) {
        if (value.length > 255) {
          setFieldError(form, name, STRINGS.tooLong);
          invalid = true;
        }
      }
      if (invalid) return focusFirstInvalid(form);

      setBusy(saveButton, true, STRINGS.saving);
      try {
        const result = await api.call('ProfileUpdate', { input });
        const payload = result.customerUpdate;
        if (payload.userErrors && payload.userErrors.length) {
          applyUserErrors(form, payload.userErrors);
          return;
        }
        Object.assign(initial, {
          firstName: payload.customer.firstName || '',
          lastName: payload.customer.lastName || '',
        });
        form.elements.firstName.value = initial.firstName;
        form.elements.lastName.value = initial.lastName;
        cache.delete('profile');
        setIdentity({ ...customer, ...payload.customer });
        toast(STRINGS.profileSaved);
      } catch (error) {
        if (error.kind !== 'auth') showFormError(form, `${STRINGS.saveFailed} ${errorMessage(error)}`);
      } finally {
        setBusy(saveButton, false);
        syncDirty();
      }
    });

    const email = customer.emailAddress && customer.emailAddress.emailAddress;
    const phone = customer.phoneNumber && customer.phoneNumber.phoneNumber;
    const profileLink = safeUrl(config.profileUrl);

    return h(
      'div',
      { class: 'cd-stack' },
      pageHeader(STRINGS.profileTitle, STRINGS.profileIntro),
      card(STRINGS.personalInfo, form),
      card(
        STRINGS.contactInfo,
        h(
          'dl',
          { class: 'cd-details' },
          h('div', null, h('dt', null, STRINGS.email), h('dd', null, email || STRINGS.notProvided)),
          h('div', null, h('dt', null, STRINGS.phone), h('dd', null, phone || STRINGS.notProvided))
        ),
        h('p', { class: 'cd-footnote' }, STRINGS.contactNote),
        profileLink ? externalLink(profileLink, STRINGS.manageContact, 'cd-link') : null
      )
    );
  }

  // ---- Addresses ------------------------------------------------------------

  let countriesPromise;
  function loadCountries() {
    if (!countriesPromise) {
      countriesPromise = fetch(config.countriesUrl, { credentials: 'omit' })
        .then((response) => {
          if (!response.ok) throw new ApiError('network');
          return response.json();
        })
        .then((list) => ({ list, byCode: new Map(list.map((country) => [country.c, country])) }))
        .catch((error) => {
          countriesPromise = null;
          throw error;
        });
    }
    return countriesPromise;
  }

  const FORMAT_FIELDS = ['country', 'firstName', 'lastName', 'company', 'address1', 'address2', 'city', 'province', 'zip', 'phone'];

  // Builds the fields for one country using Shopify's address format, labels,
  // required rules and zone codes (assets/customer-dashboard-countries.json).
  function addressFields(country, countries, values) {
    const labels = country.l || {};
    const provinceLabel = labels.province || STRINGS.province;
    const zipLabel = labels.zip || STRINGS.zip;
    const builders = {
      country: () =>
        selectField({
          name: 'countryCode',
          label: STRINGS.country,
          options: countries.list.map((c) => [c.c, c.n]),
          value: country.c,
          required: true,
          autocomplete: 'country',
        }),
      firstName: () => field({ name: 'firstName', label: STRINGS.firstName, value: values.firstName, autocomplete: 'given-name' }),
      lastName: () => field({ name: 'lastName', label: STRINGS.lastName, value: values.lastName, autocomplete: 'family-name' }),
      company: () => field({ name: 'company', label: STRINGS.optional(STRINGS.company), value: values.company, autocomplete: 'organization' }),
      address1: () => field({ name: 'address1', label: labels.address1 || STRINGS.address1, value: values.address1, required: true, autocomplete: 'address-line1' }),
      address2: () => field({ name: 'address2', label: STRINGS.optional(labels.address2 || STRINGS.address2), value: values.address2, autocomplete: 'address-line2' }),
      city: () => field({ name: 'city', label: labels.city || STRINGS.city, value: values.city, required: true, autocomplete: 'address-level2' }),
      province: () =>
        country.z && country.z.length
          ? selectField({
              name: 'zoneCode',
              label: country.po ? STRINGS.optional(provinceLabel) : provinceLabel,
              options: country.z,
              value: country.z.some(([code]) => code === values.zoneCode) ? values.zoneCode : '',
              required: !country.po,
              autocomplete: 'address-level1',
              placeholder: STRINGS.select(provinceLabel),
            })
          : null,
      zip: () =>
        field({
          name: 'zip',
          label: country.zo ? STRINGS.optional(zipLabel) : zipLabel,
          value: values.zip,
          required: !country.zo,
          autocomplete: 'postal-code',
          hint: country.ze ? `e.g. ${country.ze}` : null,
        }),
      phone: () =>
        field({ name: 'phoneNumber', label: STRINGS.optional(STRINGS.phone), value: values.phoneNumber, type: 'tel', autocomplete: 'tel', hint: STRINGS.phoneHint }),
    };

    const format = country.f || '{country}_{firstName}{lastName}_{company}_{address1}_{address2}_{city}{province}{zip}_{phone}';
    const rows = format.split('_').map((row) => (row.match(/\{(\w+)\}/g) || []).map((token) => token.slice(1, -1)).filter((name) => FORMAT_FIELDS.includes(name)));
    // Always include country first and name fields, even if a format omits them.
    if (!rows.flat().includes('country')) rows.unshift(['country']);

    return rows
      .map((names) => names.map((name) => builders[name]()).filter(Boolean))
      .filter((cells) => cells.length)
      .map((cells) => h('div', { class: `cd-form-row cd-form-row--${cells.length}` }, cells));
  }

  function readAddressForm(form) {
    const get = (name) => (form.elements[name] ? form.elements[name].value.trim() : '');
    return {
      countryCode: get('countryCode'),
      firstName: get('firstName'),
      lastName: get('lastName'),
      company: get('company'),
      address1: get('address1'),
      address2: get('address2'),
      city: get('city'),
      zoneCode: get('zoneCode'),
      zip: get('zip'),
      phoneNumber: get('phoneNumber'),
    };
  }

  function validateAddress(form, country) {
    let valid = true;
    for (const control of form.querySelectorAll('input, select')) {
      const name = control.name;
      if (!name || !form.querySelector(`[data-field="${name}"]`)) continue;
      const value = control.value.trim();
      const label = form.querySelector(`label[for="${control.id}"]`);
      const labelText = label ? label.firstChild.textContent : name;
      if (control.required && !value) {
        setFieldError(form, name, control.tagName === 'SELECT' ? STRINGS.select(labelText) : STRINGS.required(labelText));
        valid = false;
      } else if (value.length > 255) {
        setFieldError(form, name, STRINGS.tooLong);
        valid = false;
      }
    }
    const zip = form.elements.zip ? form.elements.zip.value.trim() : '';
    if (zip && country.zr) {
      let pattern = null;
      try {
        pattern = new RegExp(country.zr, 'i');
      } catch {
        // Pattern not supported by this browser; Shopify validates server-side.
      }
      if (pattern && !pattern.test(zip)) {
        setFieldError(form, 'zip', STRINGS.invalidZip(country.ze));
        valid = false;
      }
    }
    return valid;
  }

  function openDialog(content, { labelledBy, onClose } = {}) {
    const dialog = h('dialog', { class: 'cd-dialog', 'aria-labelledby': labelledBy }, content);
    root.append(dialog);
    dialog.addEventListener('close', () => {
      dialog.remove();
      if (onClose) onClose();
    });
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
    dialog.showModal();
    return dialog;
  }

  async function openAddressForm({ address, isDefault, onSaved, trigger }) {
    let countries;
    try {
      countries = await loadCountries();
    } catch {
      toast(STRINGS.addressFormUnavailable, 'error');
      return;
    }

    const editing = Boolean(address);
    const values = { ...(address || {}) };
    const initialCountry =
      (address && countries.byCode.get(address.countryCode)) ||
      countries.byCode.get(config.country) ||
      countries.byCode.get('US') ||
      countries.list[0];
    let country = initialCountry;

    const headingId = nextId('address-dialog');
    const fieldsWrap = h('div', { class: 'cd-form__fields' });
    const saveButton = button(STRINGS.saveAddress, { type: 'submit' });
    const defaultCheckbox = h('input', {
      type: 'checkbox',
      id: nextId('default'),
      name: 'defaultAddress',
      class: 'cd-checkbox',
      checked: Boolean(isDefault),
      disabled: Boolean(isDefault),
    });

    const form = h(
      'form',
      { class: 'cd-form', novalidate: true, method: 'dialog' },
      h(
        'div',
        { class: 'cd-dialog__header' },
        h('h2', { class: 'cd-dialog__title', id: headingId }, editing ? STRINGS.editAddress : STRINGS.addAddress),
        h('button', { type: 'button', class: 'cd-icon-button', 'aria-label': STRINGS.close, onClick: () => dialog.close() }, icon('close'))
      ),
      h('div', { class: 'cd-dialog__body' }, formError(), fieldsWrap, h(
        'div',
        { class: 'cd-check' },
        defaultCheckbox,
        h('label', { for: defaultCheckbox.id }, STRINGS.makeDefault),
        isDefault ? h('p', { class: 'cd-field__hint' }, STRINGS.defaultLocked) : null
      )),
      h(
        'div',
        { class: 'cd-dialog__footer' },
        button(STRINGS.cancel, { variant: 'secondary', onClick: () => dialog.close() }),
        saveButton
      )
    );

    const renderFields = () => fieldsWrap.replaceChildren(...addressFields(country, countries, values));
    renderFields();

    form.addEventListener('change', (event) => {
      if (event.target.name !== 'countryCode') return;
      Object.assign(values, readAddressForm(form));
      country = countries.byCode.get(event.target.value) || country;
      renderFields();
      form.elements.countryCode.focus();
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      clearErrors(form);
      if (!validateAddress(form, country)) {
        showFormError(form, STRINGS.formErrors);
        focusFirstInvalid(form);
        return;
      }

      const input = readAddressForm(form);
      // Send every field so cleared values are cleared in Shopify, and an
      // explicit null zone when the selected country has no provinces.
      const addressInput = {
        countryCode: input.countryCode,
        firstName: input.firstName,
        lastName: input.lastName,
        company: input.company,
        address1: input.address1,
        address2: input.address2,
        city: input.city,
        zip: input.zip,
        phoneNumber: input.phoneNumber,
        zoneCode: form.elements.zoneCode ? input.zoneCode || null : null,
      };

      setBusy(saveButton, true, STRINGS.saving);
      try {
        let payload;
        if (editing) {
          const variables = { addressId: address.id, address: addressInput };
          if (defaultCheckbox.checked && !isDefault) variables.defaultAddress = true;
          payload = (await api.call('AddressUpdate', variables)).customerAddressUpdate;
        } else {
          payload = (await api.call('AddressCreate', { address: addressInput, defaultAddress: defaultCheckbox.checked })).customerAddressCreate;
        }
        if (payload.userErrors && payload.userErrors.length) {
          applyUserErrors(form, payload.userErrors, { province: 'zoneCode', territoryCode: 'countryCode', phone: 'phoneNumber' });
          return;
        }
        dialog.close();
        toast(STRINGS.addressSaved);
        onSaved();
      } catch (error) {
        if (error.kind !== 'auth') showFormError(form, `${STRINGS.saveFailed} ${errorMessage(error)}`);
      } finally {
        setBusy(saveButton, false);
      }
    });

    const dialog = openDialog(form, { labelledBy: headingId, onClose: () => trigger && trigger.isConnected && trigger.focus() });
    const firstInput = form.querySelector('input:not([type="checkbox"]), select');
    if (firstInput) firstInput.focus();
  }

  function confirmDialog({ title, text, confirmLabel, onConfirm, trigger }) {
    const headingId = nextId('confirm');
    const confirmButton = button(confirmLabel, { className: 'cd-button--danger' });
    const errorEl = h('p', { class: 'cd-form-error', role: 'alert', hidden: true });
    const content = h(
      'div',
      { class: 'cd-dialog__inner cd-dialog__inner--small' },
      h('h2', { class: 'cd-dialog__title', id: headingId }, title),
      h('p', { class: 'cd-dialog__text' }, text),
      errorEl,
      h('div', { class: 'cd-dialog__footer' }, button(STRINGS.cancel, { variant: 'secondary', onClick: () => dialog.close() }), confirmButton)
    );
    const dialog = openDialog(content, { labelledBy: headingId, onClose: () => trigger && trigger.isConnected && trigger.focus() });
    confirmButton.addEventListener('click', async () => {
      setBusy(confirmButton, true, STRINGS.saving);
      try {
        const message = await onConfirm();
        if (message) {
          errorEl.textContent = message;
          errorEl.hidden = false;
          return;
        }
        dialog.close();
      } catch (error) {
        if (error.kind === 'auth') return;
        errorEl.textContent = errorMessage(error);
        errorEl.hidden = false;
      } finally {
        if (confirmButton.isConnected) setBusy(confirmButton, false);
      }
    });
    content.querySelector('.button--secondary').focus();
  }

  async function addressesView() {
    const list = h('div', { class: 'cd-list', 'aria-live': 'polite' });
    let addresses = [];
    let defaultId = null;
    let pageInfo = null;

    const reload = async () => {
      list.setAttribute('aria-busy', 'true');
      try {
        await fetchPage(null);
        renderList();
      } catch (error) {
        if (error.kind !== 'auth') list.replaceChildren(errorState(error, reload));
      } finally {
        list.setAttribute('aria-busy', 'false');
      }
    };

    async function fetchPage(after) {
      const data = await api.call('Addresses', after ? { after } : {});
      const connection = data.customer.addresses;
      defaultId = data.customer.defaultAddress ? data.customer.defaultAddress.id : null;
      addresses = after ? [...addresses, ...connection.nodes] : connection.nodes;
      pageInfo = connection.pageInfo;
    }

    const addButton = button(STRINGS.addAddress, { iconName: 'plus' });
    addButton.addEventListener('click', () => openAddressForm({ onSaved: reload, trigger: addButton }));

    function addressCard(address) {
      const isDefault = address.id === defaultId;
      const headingId = nextId('address');
      const name = [address.firstName, address.lastName].filter(Boolean).join(' ');
      const lines = (address.formatted || []).filter((line) => line !== name);
      const editButton = h('button', { type: 'button', class: 'cd-text-button' }, icon('edit', 'cd-icon cd-icon--sm'), STRINGS.edit);
      editButton.addEventListener('click', () => openAddressForm({ address, isDefault, onSaved: reload, trigger: editButton }));

      const deleteButton = h(
        'button',
        {
          type: 'button',
          class: 'cd-text-button cd-text-button--danger',
          'aria-disabled': isDefault ? 'true' : null,
          title: isDefault ? STRINGS.deleteDefaultBlocked : null,
        },
        icon('trash', 'cd-icon cd-icon--sm'),
        STRINGS.delete
      );
      deleteButton.addEventListener('click', () => {
        if (isDefault) {
          toast(STRINGS.deleteDefaultBlocked, 'error');
          return;
        }
        confirmDialog({
          title: STRINGS.deleteConfirmTitle,
          text: [name, ...lines].filter(Boolean).join(', '),
          confirmLabel: STRINGS.delete,
          trigger: deleteButton,
          onConfirm: async () => {
            const payload = (await api.call('AddressDelete', { addressId: address.id })).customerAddressDelete;
            if (payload.userErrors && payload.userErrors.length) return payload.userErrors.map((e) => e.message).join(' ');
            toast(STRINGS.addressDeleted);
            reload();
            return null;
          },
        });
      });

      const defaultButton = isDefault
        ? null
        : h('button', { type: 'button', class: 'cd-text-button' }, icon('star', 'cd-icon cd-icon--sm'), STRINGS.setDefault);
      if (defaultButton) {
        defaultButton.addEventListener('click', async () => {
          defaultButton.disabled = true;
          try {
            const payload = (await api.call('AddressUpdate', { addressId: address.id, defaultAddress: true })).customerAddressUpdate;
            if (payload.userErrors && payload.userErrors.length) {
              toast(payload.userErrors.map((e) => e.message).join(' '), 'error');
              defaultButton.disabled = false;
              return;
            }
            toast(STRINGS.defaultUpdated);
            reload();
          } catch (error) {
            if (error.kind !== 'auth') toast(errorMessage(error), 'error');
            defaultButton.disabled = false;
          }
        });
      }

      return h(
        'article',
        { class: `cd-card cd-address-card${isDefault ? ' cd-address-card--default' : ''}`, 'aria-labelledby': headingId },
        h(
          'div',
          { class: 'cd-address-card__head' },
          h('h2', { class: 'cd-address-card__name', id: headingId }, name || lines[0] || STRINGS.address1),
          isDefault ? badge([STRINGS.defaultAddress, 'success']) : null
        ),
        h('address', { class: 'cd-address' }, (name ? lines : lines.slice(1)).map((line) => h('span', null, line))),
        h('div', { class: 'cd-address-card__actions' }, editButton, defaultButton, deleteButton)
      );
    }

    function renderList() {
      if (!addresses.length) {
        const emptyAdd = button(STRINGS.addAddress, { iconName: 'plus' });
        emptyAdd.addEventListener('click', () => openAddressForm({ onSaved: reload, trigger: emptyAdd }));
        list.replaceChildren(emptyState({ iconName: 'pin', title: STRINGS.noAddressesTitle, text: STRINGS.noAddressesText, action: emptyAdd }));
        return;
      }
      const sorted = [...addresses].sort((a, b) => (a.id === defaultId ? -1 : b.id === defaultId ? 1 : 0));
      const more = pageInfo && pageInfo.hasNextPage ? button(STRINGS.loadMore, { variant: 'secondary' }) : null;
      if (more) {
        more.addEventListener('click', async () => {
          setBusy(more, true, STRINGS.loadMore);
          try {
            await fetchPage(pageInfo.endCursor);
            renderList();
          } catch (error) {
            if (error.kind !== 'auth') toast(errorMessage(error), 'error');
            setBusy(more, false);
          }
        });
      }
      list.replaceChildren(h('div', { class: 'cd-grid cd-grid--addresses' }, sorted.map(addressCard)));
      if (more) list.append(h('div', { class: 'cd-center' }, more));
    }

    await fetchPage(null);
    renderList();
    loadCountries().catch(() => {}); // warm the address form data

    return h('div', { class: 'cd-stack' }, pageHeader(STRINGS.addressesTitle, STRINGS.addressesIntro, addButton), list);
  }

  // ---------------------------------------------------------------------------
  // Router
  // ---------------------------------------------------------------------------
  const ROUTES = {
    overview: { view: overviewView, skeleton: 'list' },
    orders: { view: ordersView, skeleton: 'list' },
    order: { view: orderDetailView, skeleton: 'detail', nav: 'orders' },
    tracking: { view: trackingView, skeleton: 'list' },
    profile: { view: profileView, skeleton: 'form' },
    addresses: { view: addressesView, skeleton: 'list' },
  };

  function parseRoute() {
    const [name, param] = window.location.hash.replace(/^#/, '').split('/');
    if (name === 'order' && /^\d{1,20}$/.test(param || '')) return { name: 'order', id: param };
    return ROUTES[name] && name !== 'order' ? { name } : { name: 'overview' };
  }

  function setActiveNav(name) {
    for (const link of navLinks) {
      if (link.dataset.cdRoute === name) {
        link.setAttribute('aria-current', 'page');
        if (menuCurrent) menuCurrent.textContent = link.textContent.trim();
      } else {
        link.removeAttribute('aria-current');
      }
    }
  }

  function setMenuOpen(open) {
    if (!menuToggle) return;
    menuToggle.setAttribute('aria-expanded', String(open));
    sidebar.classList.toggle('is-open', open);
  }

  let renderId = 0;
  async function render({ focus = false } = {}) {
    const route = parseRoute();
    const definition = ROUTES[route.name];
    const id = ++renderId;
    setActiveNav(definition.nav || route.name);
    setMenuOpen(false);
    view.setAttribute('aria-busy', 'true');
    view.replaceChildren(skeleton(definition.skeleton));
    try {
      const content = await definition.view(route);
      if (id !== renderId) return;
      content.classList.add('cd-enter');
      view.replaceChildren(content);
    } catch (error) {
      if (id !== renderId || error.kind === 'auth') return;
      view.replaceChildren(errorState(error, () => render({ focus: true })));
    } finally {
      if (id === renderId) view.setAttribute('aria-busy', 'false');
    }
    if (focus) {
      const heading = view.querySelector('h1');
      (heading || view).focus({ preventScroll: true });
      const top = root.getBoundingClientRect().top + window.scrollY - 24;
      if (window.scrollY > top) window.scrollTo({ top, behavior: 'smooth' });
    }
  }

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------
  function bindChrome() {
    if (menuToggle) {
      menuToggle.addEventListener('click', () => setMenuOpen(menuToggle.getAttribute('aria-expanded') !== 'true'));
      root.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && sidebar.classList.contains('is-open')) {
          setMenuOpen(false);
          menuToggle.focus();
        }
      });
    }

    if (logoutForm) {
      logoutForm.addEventListener('submit', (event) => {
        clearProtectedContent();
        auth.resetAttempts();
        if (!config.authUrl) {
          event.preventDefault();
          if (config.logoutUrl) window.location.assign(config.logoutUrl);
        }
      });
    }

    // Never show account data restored from the back/forward cache (for example
    // after logging out and pressing Back): reload so the session is re-checked.
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) {
        clearProtectedContent();
        window.location.reload();
      }
    });
  }

  async function boot() {
    bindChrome();
    if (config.designMode) return renderDesignMode();
    if (!config.authUrl) return renderUnavailable();

    const url = new URL(window.location.href);
    const authError = url.searchParams.get('cd_auth_error');
    if (authError) {
      url.searchParams.delete('cd_auth_error');
      window.history.replaceState(window.history.state, '', url.toString());
      return renderAuthProblem(authError);
    }

    let authenticated;
    try {
      authenticated = await api.session();
    } catch (error) {
      view.setAttribute('aria-busy', 'false');
      view.replaceChildren(errorState(error, () => window.location.reload()));
      return;
    }
    if (!authenticated) {
      auth.signIn();
      return;
    }
    auth.resetAttempts();

    window.addEventListener('hashchange', () => render({ focus: true }));
    await render();
    if (!identityName.textContent.trim()) {
      cached('profile', () => api.call('Profile'))
        .then((data) => setIdentity(data.customer))
        .catch(() => {});
    }
  }

  boot();
})();
