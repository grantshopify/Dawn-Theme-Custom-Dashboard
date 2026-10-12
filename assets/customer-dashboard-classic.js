/* ARCHIVED: "Classic" dashboard design (git 2be4f65). Used by sections/customer-dashboard-classic.liquid. */
/*
 * Customer dashboard for Dawn.
 *
 * Vanilla JavaScript, no dependencies. All customer data comes directly from
 * the Shopify Customer Account API. Authentication is Shopify's documented
 * public-client flow for browser apps (authorization code + PKCE): tokens are
 * held in memory only and the customer's existing Shopify login is reused
 * silently with prompt=none. See docs/customer-dashboard.md.
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
    storeCredit: 'Store credit',
    storeCreditHint: 'Applied automatically at checkout',
    latestShipment: 'On its way',
    viewTracking: 'View all tracking',
    searchOrders: 'Search orders',
    searchPlaceholder: 'Order number, e.g. 1024',
    search: 'Search',
    clearSearch: 'Clear',
    noResultsTitle: 'No matching orders.',
    noResultsText: 'Check the order number and try again.',
    resultsFor: (term) => `Results for “${term}”`,
    buyAgain: 'Buy again',
    adding: 'Adding…',
    addedToCart: (count) => (count === 1 ? '1 item added to your cart.' : `${count} items added to your cart.`),
    someUnavailable: (names) => `Not available anymore: ${names}.`,
    nothingAdded: "These items aren't available anymore.",
    viewCart: 'View cart',
    printOrder: 'Print',
    fulfilledTitle: 'Fulfilled',
    shipmentCount: (index, total) => `${index} of ${total}`,
    unfulfilledTitle: 'Unfulfilled',
    payment: 'Payment',
    paidByCustomer: 'Paid',
    itemCount: (count) => (count === 1 ? '1 item' : `${count} items`),
    productCount: (count, more) => `${count}${more ? '+' : ''} ${count === 1 && !more ? 'product' : 'products'}`,
    taxes: 'Taxes',
    contact: 'Contact information',
    billingAddress: 'Billing address',
    sameAsShipping: 'Same as shipping address',
    shippingMethod: 'Shipping method',
    viewMap: 'View map',
    cancelledBanner: (date) => `This order was cancelled on ${date}.`,
    payment_status: 'Payment status',
    fulfillment_status: 'Fulfillment status',
    needHelp: 'Need help with this order?',
    contactUs: 'Contact us',
    copy: 'Copy',
    copied: 'Tracking number copied.',
    copyTracking: (number) => `Copy tracking number ${number}`,
    preferences: 'Communication preferences',
    marketingLabel: 'Email me with news and offers',
    marketingHint: 'You can unsubscribe at any time.',
    marketingPending: 'Check your inbox to confirm your subscription.',
    marketingUnavailable: "Email preferences can't be changed for this account.",
    marketingSaved: 'Your email preference has been updated.',
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
    authStorage: 'Your browser blocked the storage needed to sign in. Allow site data for this store and try again.',
    signIn: 'Sign in',
    unavailableTitle: 'Your account dashboard is temporarily unavailable.',
    unavailableText: 'You can still view your orders and details in your Shopify account.',
    goToAccount: 'Go to my account',
    designModeTitle: 'Customer dashboard',
    designModeText: 'Customer data is not loaded in the theme editor. Preview this page on your storefront while signed in to see the live dashboard.',
    opensInNewWindow: '(opens in a new window)',
  };

  // Tones follow Shopify admin conventions: completed states are neutral,
  // states that still need to happen are "attention" (yellow).
  const FULFILLMENT_STATUS = {
    FULFILLED: ['Fulfilled', 'neutral'],
    PARTIALLY_FULFILLED: ['Partially fulfilled', 'attention'],
    IN_PROGRESS: ['In progress', 'attention'],
    PENDING_FULFILLMENT: ['In progress', 'attention'],
    SCHEDULED: ['Scheduled', 'info'],
    ON_HOLD: ['On hold', 'warning'],
    UNFULFILLED: ['Unfulfilled', 'attention'],
    OPEN: ['Unfulfilled', 'attention'],
    RESTOCKED: ['Unfulfilled', 'attention'],
  };

  const FINANCIAL_STATUS = {
    PAID: ['Paid', 'neutral'],
    PARTIALLY_PAID: ['Partially paid', 'warning'],
    PENDING: ['Payment pending', 'warning'],
    AUTHORIZED: ['Authorized', 'warning'],
    PARTIALLY_REFUNDED: ['Partially refunded', 'neutral'],
    REFUNDED: ['Refunded', 'neutral'],
    VOIDED: ['Voided', 'neutral'],
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
    clientId: (root.dataset.clientId || '').trim(),
    redirectUri: root.dataset.redirectUri,
    shopOrigin: root.dataset.shopOrigin || window.location.origin,
    signedIn: root.dataset.signedIn === 'true',
    storefrontLoginUrl: root.dataset.storefrontLoginUrl,
    profileUrl: root.dataset.profileUrl,
    accountUrl: root.dataset.accountUrl,
    logoutUrl: root.dataset.logoutUrl,
    shopUrl: root.dataset.shopUrl || '/',
    helpUrl: root.dataset.helpUrl || '',
    cartUrl: root.dataset.cartUrl || '/cart',
    shopRoot: (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/',
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
  const logoutLink = root.querySelector('[data-cd-logout]');

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
  function toast(message, tone = 'success', action) {
    clearTimeout(toastTimer);
    toastRegion.replaceChildren(
      h(
        'div',
        { class: `cd-toast__message cd-toast__message--${tone}` },
        icon(tone === 'success' ? 'check-circle' : 'alert'),
        h('span', null, message),
        action ? h('a', { href: action.href, class: 'cd-toast__action' }, action.label) : null
      )
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

  const dateTimeFormat = safeFormatter(() => new Intl.DateTimeFormat(config.locale, { dateStyle: 'long', timeStyle: 'short' }));
  function formatDateTime(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return dateTimeFormat ? dateTimeFormat.format(date) : date.toString();
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
  // Customer Account API client: a public OAuth 2.0 client using the
  // authorization code flow with PKCE, as Shopify documents for browser apps.
  //
  // Tokens live only in this closure's memory. They are never written to
  // localStorage, sessionStorage, cookies or URLs, and never exposed on
  // `window`. A full page reload forgets them and the dashboard re-authorizes
  // silently (prompt=none) using the customer's existing Shopify login.
  // sessionStorage holds only the one-time PKCE/state/nonce values for the
  // redirect round trip, and they are deleted as soon as the customer returns.
  // ---------------------------------------------------------------------------
  class ApiError extends Error {
    constructor(kind, message) {
      super(message || kind);
      this.kind = kind;
    }
  }

  // Captured before any later script can wrap it.
  const nativeFetch = window.fetch.bind(window);
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const SCOPES = 'openid email customer-account-api:full';
  const SILENT_ERRORS = new Set(['login_required', 'interaction_required', 'consent_required']);
  const TRANSACTION_KEY = 'cd-oauth-transaction';
  const TRANSACTION_TTL = 10 * 60 * 1000;
  const REFRESH_MARGIN = 60 * 1000;

  let tokens = null;
  let discoveryPromise = null;

  function base64Url(bytes) {
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function randomToken(length = 32) {
    return base64Url(crypto.getRandomValues(new Uint8Array(length)));
  }

  async function pkceChallenge(verifier) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    return base64Url(new Uint8Array(digest));
  }

  function safeEqual(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  }

  function decodeJwtPayload(jwt) {
    const part = typeof jwt === 'string' ? jwt.split('.')[1] : null;
    if (!part) throw new ApiError('auth', 'Missing id_token');
    const binary = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0))));
  }

  async function fetchJson(url) {
    let response;
    try {
      response = await nativeFetch(url, { headers: { Accept: 'application/json' }, credentials: 'omit' });
    } catch {
      throw new ApiError('network');
    }
    if (!response.ok) throw new ApiError('config', `Discovery failed (${response.status})`);
    return response.json();
  }

  // Endpoints come from Shopify's discovery documents on the storefront domain.
  function discover() {
    if (!discoveryPromise) {
      discoveryPromise = Promise.all([
        fetchJson(`${config.shopOrigin}/.well-known/openid-configuration`),
        fetchJson(`${config.shopOrigin}/.well-known/customer-account-api`),
      ])
        .then(([openid, accountApi]) => {
          for (const key of ['issuer', 'authorization_endpoint', 'token_endpoint', 'end_session_endpoint']) {
            if (!openid[key]) throw new ApiError('config', `Discovery missing ${key}`);
          }
          if (!accountApi.graphql_api) throw new ApiError('config', 'Discovery missing graphql_api');
          return { ...openid, graphqlApi: accountApi.graphql_api };
        })
        .catch((error) => {
          discoveryPromise = null;
          throw error;
        });
    }
    return discoveryPromise;
  }

  function saveTransaction(transaction) {
    sessionStorage.setItem(TRANSACTION_KEY, JSON.stringify(transaction));
  }

  // Reads and deletes the transaction: each one can be used once.
  function takeTransaction() {
    try {
      const raw = sessionStorage.getItem(TRANSACTION_KEY);
      sessionStorage.removeItem(TRANSACTION_KEY);
      const transaction = raw ? JSON.parse(raw) : null;
      return transaction && transaction.exp > Date.now() ? transaction : null;
    } catch {
      return null;
    }
  }

  async function startAuthorization({ silent }) {
    const discovery = await discover();
    const state = randomToken();
    const nonce = randomToken();
    const verifier = randomToken(48);
    try {
      saveTransaction({ state, nonce, verifier, silent, returnHash: window.location.hash, exp: Date.now() + TRANSACTION_TTL });
    } catch {
      renderAuthProblem('storage');
      return;
    }
    const url = new URL(discovery.authorization_endpoint);
    url.searchParams.set('scope', SCOPES);
    url.searchParams.set('client_id', config.clientId);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('redirect_uri', config.redirectUri);
    url.searchParams.set('state', state);
    url.searchParams.set('nonce', nonce);
    url.searchParams.set('code_challenge', await pkceChallenge(verifier));
    url.searchParams.set('code_challenge_method', 'S256');
    if (silent) url.searchParams.set('prompt', 'none');
    if (config.locale) url.searchParams.set('locale', config.locale);
    // replace(), not assign(): the redirect round trip must not leave entries
    // that the Back button would replay.
    window.location.replace(url.toString());
  }

  async function tokenRequest(params) {
    const discovery = await discover();
    let response;
    try {
      response = await nativeFetch(discovery.token_endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body: new URLSearchParams({ client_id: config.clientId, ...params }),
        credentials: 'omit',
      });
    } catch {
      throw new ApiError('network');
    }
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.access_token) throw new ApiError('auth', body.error || `Token request failed (${response.status})`);
    return body;
  }

  function storeTokens(body) {
    tokens = {
      accessToken: body.access_token,
      expiresAt: Date.now() + Number(body.expires_in || 0) * 1000,
      refreshToken: body.refresh_token || (tokens && tokens.refreshToken) || null,
      idToken: body.id_token || (tokens && tokens.idToken) || null,
    };
  }

  async function refreshTokens() {
    if (!tokens || !tokens.refreshToken) throw new ApiError('auth');
    try {
      storeTokens(await tokenRequest({ grant_type: 'refresh_token', refresh_token: tokens.refreshToken }));
    } catch (error) {
      tokens = null;
      throw error.kind === 'network' ? error : new ApiError('auth');
    }
  }

  async function accessToken() {
    if (!tokens) throw new ApiError('auth');
    if (tokens.expiresAt - Date.now() < REFRESH_MARGIN) await refreshTokens();
    return tokens.accessToken;
  }

  // Handles the redirect back from Shopify. Returns 'authenticated', 'stopped'
  // (an error was shown or another redirect started), or null (not a callback).
  async function handleCallback() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');
    if (!state || (!code && !error)) return null;

    const transaction = takeTransaction();
    // Remove the authorization code from the address bar and history.
    window.history.replaceState(null, '', `${window.location.pathname}${transaction ? transaction.returnHash || '' : ''}`);

    // A stale or replayed callback (for example from history): start over.
    if (!transaction) return null;
    if (!safeEqual(state, transaction.state)) {
      renderAuthProblem('failed');
      return 'stopped';
    }
    if (error) {
      if (transaction.silent && SILENT_ERRORS.has(error)) {
        await startAuthorization({ silent: false });
        return 'stopped';
      }
      renderAuthProblem(error === 'access_denied' ? 'denied' : 'failed');
      return 'stopped';
    }

    const body = await tokenRequest({
      grant_type: 'authorization_code',
      redirect_uri: config.redirectUri,
      code,
      code_verifier: transaction.verifier,
    });
    // The ID token comes straight from the token endpoint over TLS, so its
    // claims are checked here (OpenID Connect Core 3.1.3.7).
    const discovery = await discover();
    const claims = decodeJwtPayload(body.id_token);
    const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (claims.iss !== discovery.issuer) throw new ApiError('auth', 'id_token issuer mismatch');
    if (!audience.includes(config.clientId)) throw new ApiError('auth', 'id_token audience mismatch');
    if (typeof claims.exp !== 'number' || claims.exp * 1000 < Date.now() - 120000) throw new ApiError('auth', 'id_token expired');
    if (!safeEqual(claims.nonce, transaction.nonce)) throw new ApiError('auth', 'id_token nonce mismatch');
    storeTokens(body);
    return 'authenticated';
  }

  async function graphqlRequest(query, variables, attempt = 0) {
    const discovery = await discover();
    const token = await accessToken();
    let response;
    try {
      response = await nativeFetch(discovery.graphqlApi, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: token },
        body: JSON.stringify({ query, variables }),
        credentials: 'omit',
        cache: 'no-store',
      });
    } catch {
      throw new ApiError('network');
    }
    if (response.status === 401) {
      if (attempt === 0 && tokens && tokens.refreshToken) {
        await refreshTokens();
        return graphqlRequest(query, variables, attempt + 1);
      }
      tokens = null;
      throw new ApiError('auth');
    }
    if (response.status === 429) {
      if (attempt >= 2) throw new ApiError('rate_limited');
      await sleep(Math.min(Number(response.headers.get('Retry-After')) || 2, 10) * 1000);
      return graphqlRequest(query, variables, attempt + 1);
    }
    if (!response.ok) throw new ApiError('server');
    const body = await response.json().catch(() => null);
    if (!body) throw new ApiError('server');
    const errors = Array.isArray(body.errors) ? body.errors : [];
    if (errors.some((e) => e && e.extensions && e.extensions.code === 'THROTTLED')) {
      if (attempt >= 2) throw new ApiError('rate_limited');
      await sleep(2000);
      return graphqlRequest(query, variables, attempt + 1);
    }
    return body;
  }

  // Requests run one at a time so only one refresh-token exchange can happen.
  let queue = Promise.resolve();
  function serialized(task) {
    const run = queue.then(task, task);
    queue = run.catch(() => {});
    return run;
  }

  // ---- Operations (fields verified against the 2026-10 API reference) ----
  // Every query is scoped by Shopify to the customer who owns the token; no
  // customer ID is ever sent.
  const MONEY = 'amount currencyCode';
  const ORDER_SUMMARY = `id name number processedAt cancelledAt financialStatus fulfillmentStatus totalPrice { ${MONEY} }`;
  const ADDRESS = 'id firstName lastName company address1 address2 city province zoneCode zip country countryCode phoneNumber formatted(withName: true)';
  const TRACKING_FULFILLMENT = 'id createdAt status latestShipmentStatus estimatedDeliveryAt requiresShipping trackingInformation { company number url }';
  const USER_ERRORS = 'userErrors { field message code }';
  const ORDERS_PAGE_SIZE = 10;
  const STATS_PAGE_SIZE = 100;
  const ADDRESSES_PAGE_SIZE = 50;
  // Kept small so the order detail query stays well under the per-query cost limit.
  const ORDER_LINE_ITEMS = 50;

  const pageVariables = (cursor = {}) =>
    cursor.before ? { last: ORDERS_PAGE_SIZE, before: cursor.before } : { first: ORDERS_PAGE_SIZE, after: cursor.after || null };

  const OPERATIONS = {
    Overview: {
      query: `query Overview {
        customer {
          id firstName lastName displayName creationDate
          orders(first: 5, sortKey: PROCESSED_AT, reverse: true) { nodes { ${ORDER_SUMMARY} } }
        }
      }`,
    },
    OrderStats: {
      query: `query OrderStats($after: String) {
        customer {
          orders(first: ${STATS_PAGE_SIZE}, after: $after) {
            nodes { fulfillmentStatus cancelledAt }
            pageInfo { hasNextPage endCursor }
          }
        }
      }`,
      variables: (v) => ({ after: v.after || null }),
    },
    Orders: {
      query: `query Orders($first: Int, $after: String, $last: Int, $before: String, $query: String) {
        customer {
          orders(first: $first, after: $after, last: $last, before: $before, query: $query, sortKey: PROCESSED_AT, reverse: true) {
            nodes {
              ${ORDER_SUMMARY}
              lineItems(first: 4) { nodes { title quantity image { url altText } } pageInfo { hasNextPage } }
            }
            pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
          }
        }
      }`,
      variables: (v) => ({ ...pageVariables(v), query: v.query || null }),
    },
    Order: {
      query: `query Order($id: ID!) {
        order(id: $id) {
          ${ORDER_SUMMARY}
          cancelReason currencyCode statusPageUrl requiresShipping
          subtotal { ${MONEY} }
          totalShipping { ${MONEY} }
          totalTax { ${MONEY} }
          totalDuties { ${MONEY} }
          totalRefunded { ${MONEY} }
          shippingDiscountAllocations { allocatedAmount { ${MONEY} } }
          email
          shippingAddress { formatted(withName: true) }
          billingAddress { formatted(withName: true) }
          shippingLine { title }
          lineItems(first: ${ORDER_LINE_ITEMS}) {
            nodes {
              id title variantTitle quantity sku variantId giftCard
              variantOptions { name value }
              price { ${MONEY} }
              totalPrice { ${MONEY} }
              discountAllocations { allocatedAmount { ${MONEY} } }
              image { url altText }
            }
            pageInfo { hasNextPage }
          }
          fulfillments(first: 5) {
            nodes {
              ${TRACKING_FULFILLMENT}
              fulfillmentLineItems(first: 25) { nodes { quantity lineItem { id title } } pageInfo { hasNextPage } }
            }
          }
        }
      }`,
      variables: (v) => ({ id: v.id }),
    },
    Tracking: {
      query: `query Tracking($first: Int, $after: String, $last: Int, $before: String) {
        customer {
          orders(first: $first, after: $after, last: $last, before: $before, sortKey: PROCESSED_AT, reverse: true) {
            nodes {
              id name processedAt cancelledAt fulfillmentStatus requiresShipping statusPageUrl
              fulfillments(first: 10) { nodes { ${TRACKING_FULFILLMENT} } }
            }
            pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
          }
        }
      }`,
      variables: pageVariables,
    },
    StoreCredit: {
      query: `query StoreCredit {
        customer { storeCreditAccounts(first: 5) { nodes { balance { ${MONEY} } } } }
      }`,
    },
    EmailSubscribe: {
      query: `mutation EmailSubscribe {
        customerEmailMarketingSubscribe { emailAddress { marketingState } ${USER_ERRORS} }
      }`,
    },
    EmailUnsubscribe: {
      query: `mutation EmailUnsubscribe {
        customerEmailMarketingUnsubscribe { emailAddress { marketingState } ${USER_ERRORS} }
      }`,
    },
    Profile: {
      query: `query Profile {
        customer { id firstName lastName emailAddress { emailAddress marketingState } phoneNumber { phoneNumber } }
      }`,
    },
    ProfileUpdate: {
      query: `mutation ProfileUpdate($input: CustomerUpdateInput!) {
        customerUpdate(input: $input) { customer { id firstName lastName } ${USER_ERRORS} }
      }`,
      variables: (v) => ({ input: v.input }),
    },
    Addresses: {
      query: `query Addresses($after: String) {
        customer {
          defaultAddress { id }
          addresses(first: ${ADDRESSES_PAGE_SIZE}, after: $after) { nodes { ${ADDRESS} } pageInfo { hasNextPage endCursor } }
        }
      }`,
      variables: (v) => ({ after: v.after || null }),
    },
    AddressCreate: {
      query: `mutation AddressCreate($address: CustomerAddressInput!, $defaultAddress: Boolean) {
        customerAddressCreate(address: $address, defaultAddress: $defaultAddress) { customerAddress { ${ADDRESS} } ${USER_ERRORS} }
      }`,
      variables: (v) => ({ address: v.address, defaultAddress: Boolean(v.defaultAddress) }),
    },
    AddressUpdate: {
      query: `mutation AddressUpdate($addressId: ID!, $address: CustomerAddressInput, $defaultAddress: Boolean) {
        customerAddressUpdate(addressId: $addressId, address: $address, defaultAddress: $defaultAddress) { customerAddress { ${ADDRESS} } ${USER_ERRORS} }
      }`,
      variables: (v) => {
        const out = { addressId: v.addressId };
        if (v.address) out.address = v.address;
        if (v.defaultAddress) out.defaultAddress = true;
        return out;
      },
    },
    AddressDelete: {
      query: `mutation AddressDelete($addressId: ID!) {
        customerAddressDelete(addressId: $addressId) { deletedAddressId ${USER_ERRORS} }
      }`,
      variables: (v) => ({ addressId: v.addressId }),
    },
  };

  const api = {
    async call(operation, variables = {}) {
      const definition = OPERATIONS[operation];
      const body = await serialized(async () => {
        try {
          return await graphqlRequest(definition.query, definition.variables ? definition.variables(variables) : {});
        } catch (error) {
          if (error.kind === 'auth') auth.signIn();
          throw error;
        }
      });
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
    handleCallback,

    // Counts sign-in redirects in a short window so a misconfiguration shows an
    // error instead of redirecting forever. Only timestamps are stored.
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

    // Signed in to the storefront: Shopify already knows the customer, so the
    // authorization request uses prompt=none and returns without a login form.
    // Otherwise the customer signs in once through Shopify's storefront login,
    // which returns here (now signed in) and continues silently.
    signIn({ interactive = false } = {}) {
      if (auth.recordAttempt() > 3) {
        renderAuthProblem('loop');
        return;
      }
      tokens = null;
      clearProtectedContent();
      if (!interactive && !config.signedIn && config.storefrontLoginUrl) {
        window.location.replace(config.storefrontLoginUrl);
        return;
      }
      startAuthorization({ silent: !interactive && config.signedIn }).catch((error) => {
        view.setAttribute('aria-busy', 'false');
        view.replaceChildren(errorState(error, () => window.location.reload()));
      });
    },

    async logout() {
      const idToken = tokens && tokens.idToken;
      tokens = null;
      clearProtectedContent();
      auth.resetAttempts();
      const storefrontLogout = new URL(config.logoutUrl || '/account/logout', window.location.origin).toString();
      if (idToken) {
        try {
          const discovery = await discover();
          const url = new URL(discovery.end_session_endpoint);
          url.searchParams.set('id_token_hint', idToken);
          url.searchParams.set('post_logout_redirect_uri', storefrontLogout);
          window.location.assign(url.toString());
          return;
        } catch {
          // Fall through to the storefront logout.
        }
      }
      window.location.assign(storefrontLogout);
    },
  };

  function clearProtectedContent() {
    cache.clear();
    view.replaceChildren(skeleton());
    identityName.replaceChildren(h('span', { class: 'cd-skeleton cd-skeleton--text', 'aria-hidden': 'true' }));
    identityAvatar.textContent = '';
  }

  function renderAuthProblem(reason) {
    const messages = { expired: STRINGS.authExpired, denied: STRINGS.authDenied, loop: STRINGS.authLoop, storage: STRINGS.authStorage };
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

  // Order index table, styled after Shopify admin's order list.
  function ordersTable(orders, { showItems = false } = {}) {
    const columns = [STRINGS.order, STRINGS.date, showItems ? STRINGS.items : null, STRINGS.total, STRINGS.payment_status, STRINGS.fulfillment_status].filter(Boolean);
    const head = h(
      'thead',
      null,
      h('tr', null, columns.map((label) => h('th', { scope: 'col' }, label)), h('th', { scope: 'col' }, h('span', { class: 'visually-hidden' }, STRINGS.viewDetails)))
    );
    const rows = orders.map((order) => {
      const items = showItems && order.lineItems ? order.lineItems.nodes : [];
      const more = showItems && order.lineItems && order.lineItems.pageInfo && order.lineItems.pageInfo.hasNextPage;
      return h(
        'tr',
        { class: 'cd-row' },
        h(
          'th',
          { scope: 'row', 'data-label': STRINGS.order },
          h('a', { href: orderHref(order), class: 'cd-row__link' }, order.name),
          order.cancelledAt ? h('span', { class: 'cd-row__flag' }, badge(orderStatus(order))) : null
        ),
        h('td', { 'data-label': STRINGS.date }, formatDate(order.processedAt)),
        showItems
          ? h(
              'td',
              { 'data-label': STRINGS.items },
              h(
                'span',
                { class: 'cd-row__items' },
                h('span', { class: 'cd-row__thumbs' }, items.slice(0, 3).map((item) => thumbnail(item.image, 32))),
                h('span', { class: 'cd-muted' }, STRINGS.productCount(items.length, more))
              )
            )
          : null,
        h('td', { 'data-label': STRINGS.total, class: 'cd-row__total' }, formatMoney(order.totalPrice)),
        h('td', { 'data-label': STRINGS.payment_status }, statusBadge(FINANCIAL_STATUS, order.financialStatus)),
        h('td', { 'data-label': STRINGS.fulfillment_status }, order.cancelledAt ? null : statusBadge(FULFILLMENT_STATUS, order.fulfillmentStatus)),
        h(
          'td',
          { class: 'cd-table__action' },
          h(
            'a',
            { href: orderHref(order), class: 'cd-row__chevron', tabindex: '-1', 'aria-hidden': 'true' },
            icon('chevron-right', 'cd-icon cd-icon--sm')
          )
        )
      );
    });
    return h('div', { class: 'cd-table-wrap' }, h('table', { class: 'cd-table' }, head, h('tbody', null, rows)));
  }

  function copyButton(text) {
    if (!navigator.clipboard) return null;
    const el = h('button', { type: 'button', class: 'cd-copy', 'aria-label': STRINGS.copyTracking(text) }, STRINGS.copy);
    el.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(text);
        toast(STRINGS.copied);
      } catch {
        // Clipboard permission denied; the number stays selectable.
      }
    });
    return el;
  }

  // ---- Cart (Shopify's storefront Ajax cart API, same origin) ----
  async function refreshCartBubble() {
    try {
      const response = await nativeFetch(`${config.shopRoot}?sections=cart-icon-bubble`, { credentials: 'same-origin' });
      const sections = await response.json();
      const fresh = new DOMParser().parseFromString(sections['cart-icon-bubble'], 'text/html').querySelector('.shopify-section');
      const target = document.getElementById('cart-icon-bubble');
      if (fresh && target) target.innerHTML = fresh.innerHTML;
    } catch {
      // The header count refreshes on the next page load.
    }
  }

  // Adds an order's items back to the cart. Each line is added on its own so
  // one sold-out or deleted product doesn't block the rest.
  async function buyAgain(lineItems) {
    let added = 0;
    const unavailable = [];
    for (const item of lineItems) {
      const variantId = numericId(item.variantId);
      if (!variantId || item.giftCard) {
        unavailable.push(item.title);
        continue;
      }
      try {
        const response = await nativeFetch(`${config.shopRoot}cart/add.js`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ items: [{ id: Number(variantId), quantity: item.quantity }] }),
        });
        if (response.ok) added += item.quantity;
        else unavailable.push(item.title);
      } catch {
        unavailable.push(item.title);
      }
    }
    if (added) await refreshCartBubble();
    return { added, unavailable };
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
        trackingBlock(fulfillment),
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

    // Optional extras load after the main view; a failure just hides them.
    const creditSlot = h('div', { class: 'cd-credit', hidden: true });
    cached('storeCredit', () => api.call('StoreCredit'), 5 * 60000)
      .then((credit) => {
        const balances = credit.customer.storeCreditAccounts.nodes.map((n) => n.balance).filter(isPositive);
        if (!balances.length) return;
        creditSlot.replaceChildren(
          h('span', { class: 'cd-credit__label' }, STRINGS.storeCredit),
          h('span', { class: 'cd-credit__value' }, balances.map(formatMoney).join(' · ')),
          h('span', { class: 'cd-credit__hint' }, STRINGS.storeCreditHint)
        );
        creditSlot.hidden = false;
      })
      .catch(() => {});

    const shipmentSlot = h('section', { class: 'cd-spotlight', hidden: true, 'aria-label': STRINGS.latestShipment });
    if (orders.length) {
      cached('tracking:first', () => api.call('Tracking', {}), 60000)
        .then((tracking) => {
          const active = tracking.customer.orders.nodes.find(
            (order) =>
              !order.cancelledAt &&
              order.fulfillments.nodes.some(
                (f) => f.status !== 'CANCELLED' && f.requiresShipping !== false && !['DELIVERED', 'PICKED_UP'].includes(f.latestShipmentStatus)
              )
          );
          if (!active) return;
          const fulfillments = active.fulfillments.nodes.filter((f) => f.status !== 'CANCELLED' && !['DELIVERED', 'PICKED_UP'].includes(f.latestShipmentStatus));
          shipmentSlot.replaceChildren(
            h(
              'div',
              { class: 'cd-section-head' },
              h('h2', { class: 'cd-section-title' }, STRINGS.latestShipment),
              h('a', { href: '#tracking', class: 'cd-link' }, STRINGS.viewTracking, icon('chevron-right', 'cd-icon cd-icon--sm'))
            ),
            h(
              'p',
              { class: 'cd-spotlight__order' },
              h('a', { href: orderHref(active), class: 'cd-link-plain' }, STRINGS.orderNamed(active.name)),
              h('span', { class: 'cd-muted' }, ` · ${STRINGS.placedOn(formatDate(active.processedAt))}`)
            ),
            ...shipments(active, fulfillments.slice(0, 1))
          );
          shipmentSlot.hidden = false;
        })
        .catch(() => {});
    }

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
        h('p', { class: 'cd-subtitle' }, STRINGS.overviewIntro),
        creditSlot
      ),
      stats.el,
      shipmentSlot,
      h(
        'section',
        { class: 'cd-card cd-card--flush', 'aria-labelledby': recentHeadingId },
        h(
          'div',
          { class: 'cd-card__header' },
          h('h2', { class: 'cd-card__title', id: recentHeadingId }, STRINGS.recentOrders)
        ),
        orders.length ? ordersTable(orders) : ordersEmptyState(),
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

  // Search uses the Customer Account API `order_number` filter.
  function orderSearchQuery(term) {
    const digits = term.replace(/^#/, '').trim();
    return /^\d{1,12}$/.test(digits) ? `order_number:${digits}` : null;
  }

  async function ordersView() {
    const list = h('div', { class: 'cd-list', 'aria-live': 'polite' });
    const header = pageHeader(STRINGS.myOrders, STRINGS.myOrdersIntro);
    let query = null;
    let term = '';

    const show = paginatedList({
      container: list,
      focusTarget: header.querySelector('h1'),
      load: (cursor) => api.call('Orders', { ...(cursor || {}), query }),
      renderPage: (data, onPage) => {
        const connection = data.customer.orders;
        if (!connection.nodes.length && !cursorUsed(connection.pageInfo)) {
          return query
            ? emptyState({ iconName: 'package', title: STRINGS.noResultsTitle, text: STRINGS.noResultsText })
            : ordersEmptyState();
        }
        return h(
          'div',
          { class: 'cd-orders' },
          query ? h('p', { class: 'cd-results' }, STRINGS.resultsFor(term)) : null,
          h('div', { class: 'cd-card cd-card--flush' }, ordersTable(connection.nodes, { showItems: true })),
          pager(connection.pageInfo, onPage)
        );
      },
    });

    const inputId = nextId('order-search');
    const input = h('input', {
      id: inputId,
      type: 'search',
      class: 'cd-input cd-search__input',
      placeholder: STRINGS.searchPlaceholder,
      inputmode: 'numeric',
      autocomplete: 'off',
      maxlength: 13,
    });
    const clear = h('button', { type: 'button', class: 'cd-text-button', hidden: true }, STRINGS.clearSearch);
    const form = h(
      'form',
      { class: 'cd-search', role: 'search' },
      h('label', { for: inputId, class: 'visually-hidden' }, STRINGS.searchOrders),
      input,
      button(STRINGS.search, { type: 'submit', variant: 'secondary', className: 'cd-button--small' }),
      clear
    );
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      term = input.value.trim();
      query = term ? orderSearchQuery(term) : null;
      if (term && !query) {
        input.setAttribute('aria-invalid', 'true');
        toast(STRINGS.noResultsText, 'error');
        return;
      }
      input.removeAttribute('aria-invalid');
      clear.hidden = !query;
      show(null);
    });
    clear.addEventListener('click', () => {
      input.value = '';
      term = '';
      query = null;
      clear.hidden = true;
      show(null);
      input.focus();
    });

    await show(null);
    return h('div', { class: 'cd-stack' }, h('div', { class: 'cd-page-header' }, header.firstChild, form), list);
  }

  const cursorUsed = (pageInfo) => pageInfo && (pageInfo.hasPreviousPage || pageInfo.hasNextPage);

  // Shopify admin-style section: icon + title above a card.
  function statusSection({ iconName, title, meta, aside }, ...content) {
    const id = nextId('section');
    return h(
      'section',
      { class: 'cd-sc', 'aria-labelledby': id },
      h(
        'div',
        { class: 'cd-sc__head' },
        h('span', { class: 'cd-sc__icon' }, icon(iconName, 'cd-icon cd-icon--sm')),
        h('h2', { class: 'cd-sc__title', id }, title, meta ? h('span', { class: 'cd-sc__meta' }, meta) : null),
        aside ? h('div', { class: 'cd-sc__aside' }, aside) : null
      ),
      h('div', { class: 'cd-card cd-sc__body' }, content)
    );
  }

  function variantLabel(item) {
    return item.variantTitle || (item.variantOptions || []).map((option) => `${option.name}: ${option.value}`).join(' / ');
  }

  // One item line: thumbnail, title, variant chip, "price × qty", line total.
  function itemRow(item, quantity) {
    const variant = variantLabel(item);
    const lineTotal =
      item.price && quantity !== item.quantity
        ? { amount: (Number(item.price.amount) * quantity).toFixed(2), currencyCode: item.price.currencyCode }
        : item.totalPrice;
    return h(
      'li',
      { class: 'cd-item' },
      thumbnail(item.image, 48),
      h('div', { class: 'cd-item__info' }, h('p', { class: 'cd-item__title' }, item.title), variant ? h('span', { class: 'cd-chip' }, variant) : null),
      h('p', { class: 'cd-item__qty' }, item.price ? formatMoney(item.price) : '', h('span', { class: 'cd-item__x' }, ' × '), h('span', { class: 'cd-qty' }, String(quantity))),
      h('p', { class: 'cd-item__total' }, formatMoney(lineTotal))
    );
  }

  function trackingBlock(fulfillment) {
    const tracking = (fulfillment.trackingInformation || []).filter((t) => t && (t.number || t.url || t.company));
    if (!tracking.length) return h('p', { class: 'cd-shipment-note' }, icon('clock', 'cd-icon cd-icon--sm'), STRINGS.trackingUnavailable);
    return tracking.map((info) => {
      const url = safeUrl(info.url);
      return h(
        'div',
        { class: 'cd-tracking' },
        h(
          'dl',
          { class: 'cd-tracking__details' },
          info.company ? h('div', null, h('dt', null, STRINGS.carrier), h('dd', null, info.company)) : null,
          info.number ? h('div', null, h('dt', null, STRINGS.trackingNumber), h('dd', { class: 'cd-mono cd-copyable' }, info.number, copyButton(info.number))) : null
        ),
        url ? externalLink(url, STRINGS.trackShipment, 'button button--secondary cd-button cd-button--small') : null
      );
    });
  }

  async function orderDetailView(route) {
    const data = await api.call('Order', { id: `gid://shopify/Order/${route.id}` });
    const order = data.order;
    const back = h('a', { href: '#orders', class: 'cd-back' }, icon('arrow-left', 'cd-icon cd-icon--sm'), STRINGS.allOrders);
    if (!order) {
      return h('div', { class: 'cd-stack' }, back, emptyState({ iconName: 'package', title: STRINGS.orderNotFound, action: button(STRINGS.allOrders, { href: '#orders' }) }));
    }

    const lineItems = order.lineItems.nodes;
    const truncated = order.lineItems.pageInfo.hasNextPage;
    const byId = new Map(lineItems.map((item) => [item.id, item]));
    const currency = order.currencyCode || (order.totalPrice && order.totalPrice.currencyCode);
    const discount = sumMoney([...lineItems.flatMap((item) => item.discountAllocations || []), ...(order.shippingDiscountAllocations || [])], currency);
    const statusUrl = safeUrl(order.statusPageUrl);
    const fulfillments = order.fulfillments.nodes.filter((f) => f.status !== 'CANCELLED');

    // Shipments, as Shopify groups them.
    const shipmentSections = fulfillments.map((fulfillment, index) => {
      const items = (fulfillment.fulfillmentLineItems ? fulfillment.fulfillmentLineItems.nodes : [])
        .map((fli) => {
          const item = fli.lineItem && byId.get(fli.lineItem.id);
          return item ? itemRow(item, fli.quantity || item.quantity) : null;
        })
        .filter(Boolean);
      return statusSection(
        {
          iconName: 'truck',
          title: STRINGS.fulfilledTitle,
          meta: fulfillments.length > 1 ? STRINGS.shipmentCount(index + 1, fulfillments.length) : null,
          aside: statusBadge(SHIPMENT_STATUS, fulfillment.latestShipmentStatus),
        },
        h(
          'div',
          { class: 'cd-sc__rows' },
          h('p', { class: 'cd-sc__line' }, icon('check-circle', 'cd-icon cd-icon--sm'), STRINGS.shippedOn(formatDate(fulfillment.createdAt))),
          fulfillment.estimatedDeliveryAt && fulfillment.latestShipmentStatus !== 'DELIVERED'
            ? h('p', { class: 'cd-sc__line' }, icon('clock', 'cd-icon cd-icon--sm'), STRINGS.estimatedDelivery(formatDate(fulfillment.estimatedDeliveryAt)))
            : null
        ),
        fulfillment.requiresShipping === false ? null : shipmentSteps(fulfillment.latestShipmentStatus),
        trackingBlock(fulfillment),
        items.length ? h('ul', { class: 'cd-items', role: 'list' }, items) : null
      );
    });

    // Items not yet in a shipment (only while the order isn't fully fulfilled).
    const shippedQuantities = new Map();
    for (const fulfillment of fulfillments) {
      for (const fli of fulfillment.fulfillmentLineItems ? fulfillment.fulfillmentLineItems.nodes : []) {
        const id = fli.lineItem && fli.lineItem.id;
        if (id) shippedQuantities.set(id, (shippedQuantities.get(id) || 0) + (fli.quantity || 0));
      }
    }
    const remaining =
      order.cancelledAt || order.fulfillmentStatus === 'FULFILLED'
        ? []
        : lineItems.map((item) => ({ item, quantity: item.quantity - (shippedQuantities.get(item.id) || 0) })).filter((entry) => entry.quantity > 0);
    const unfulfilledSection = remaining.length
      ? statusSection(
          { iconName: 'clock', title: STRINGS.unfulfilledTitle, aside: statusBadge(FULFILLMENT_STATUS, order.fulfillmentStatus) },
          order.requiresShipping !== false ? shipmentSteps(null, { preparing: true }) : null,
          h('p', { class: 'cd-shipment-note' }, order.requiresShipping === false ? STRINGS.noShippingRequired : STRINGS.preparing),
          h('ul', { class: 'cd-items', role: 'list' }, remaining.map(({ item, quantity }) => itemRow(item, quantity)))
        )
      : null;

    // Cancelled orders: show all items in one section.
    const cancelledSection = order.cancelledAt
      ? statusSection({ iconName: 'package', title: STRINGS.items }, h('ul', { class: 'cd-items', role: 'list' }, lineItems.map((item) => itemRow(item, item.quantity))))
      : null;

    const itemCount = lineItems.reduce((sum, item) => sum + item.quantity, 0);
    const paymentRow = (label, detail, money, { strong = false, negative = false } = {}) =>
      h(
        'div',
        { class: `cd-pay__row${strong ? ' cd-pay__row--strong' : ''}` },
        h('dt', null, label),
        h('dd', { class: 'cd-pay__detail' }, detail || ''),
        h('dd', { class: 'cd-pay__amount' }, money ? `${negative ? '−' : ''}${formatMoney(money)}` : '—')
      );
    const paid = ['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(order.financialStatus);
    const paymentSection = statusSection(
      { iconName: 'receipt', title: (FINANCIAL_STATUS[order.financialStatus] || [STRINGS.payment])[0] },
      h(
        'dl',
        { class: 'cd-pay' },
        order.subtotal ? paymentRow(STRINGS.subtotal, truncated ? '' : STRINGS.itemCount(itemCount), order.subtotal) : null,
        isPositive(discount) && !truncated ? paymentRow(STRINGS.discounts, STRINGS.discountsIncluded, discount, { negative: true }) : null,
        paymentRow(STRINGS.shipping, order.shippingLine && order.shippingLine.title, order.totalShipping),
        isPositive(order.totalTax) ? paymentRow(STRINGS.taxes, '', order.totalTax) : null,
        isPositive(order.totalDuties) ? paymentRow(STRINGS.duties, '', order.totalDuties) : null,
        paymentRow(STRINGS.total, '', order.totalPrice, { strong: true })
      ),
      paid || isPositive(order.totalRefunded)
        ? h(
            'dl',
            { class: 'cd-pay cd-pay--settled' },
            paid ? paymentRow(STRINGS.paidByCustomer, '', order.totalPrice) : null,
            isPositive(order.totalRefunded) ? paymentRow(STRINGS.refunded, '', order.totalRefunded, { negative: true }) : null
          )
        : null,
      truncated ? h('p', { class: 'cd-footnote' }, STRINGS.itemsTruncated) : null
    );

    // Side panel
    const shippingLines = order.shippingAddress ? order.shippingAddress.formatted || [] : [];
    const billingLines = order.billingAddress ? order.billingAddress.formatted || [] : [];
    const sameBilling = billingLines.length && billingLines.join('|') === shippingLines.join('|');
    const mapUrl = shippingLines.length ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shippingLines.slice(1).join(', '))}` : null;
    const asideBlock = (title, ...content) => h('div', { class: 'cd-aside__block' }, h('h2', { class: 'cd-aside__title' }, title), content);
    const helpUrl = safeUrl(config.helpUrl);

    const aside = h(
      'aside',
      { class: 'cd-card cd-aside' },
      order.email ? asideBlock(STRINGS.contact, h('p', { class: 'cd-aside__text' }, order.email)) : null,
      asideBlock(
        STRINGS.shippingAddress,
        shippingLines.length
          ? [h('address', { class: 'cd-address' }, shippingLines.map((line) => h('span', null, line))), externalLink(mapUrl, STRINGS.viewMap, 'cd-link cd-link--accent')]
          : h('p', { class: 'cd-aside__text cd-muted' }, STRINGS.noShippingAddress)
      ),
      billingLines.length
        ? asideBlock(
            STRINGS.billingAddress,
            sameBilling ? h('p', { class: 'cd-aside__text cd-muted' }, STRINGS.sameAsShipping) : h('address', { class: 'cd-address' }, billingLines.map((line) => h('span', null, line)))
          )
        : null,
      order.shippingLine && order.shippingLine.title ? asideBlock(STRINGS.shippingMethod, h('p', { class: 'cd-aside__text' }, order.shippingLine.title)) : null,
      helpUrl
        ? asideBlock(STRINGS.needHelp, h('a', { href: helpUrl, class: 'cd-link cd-link--accent' }, STRINGS.contactUs))
        : null
    );

    return h(
      'div',
      { class: 'cd-stack cd-stack--order' },
      back,
      h(
        'header',
        { class: 'cd-page-header cd-order-head' },
        h(
          'div',
          { class: 'cd-page-header__text' },
          h(
            'div',
            { class: 'cd-order-head__title' },
            h('h1', { class: 'cd-title', tabindex: '-1' }, order.name),
            h(
              'span',
              { class: 'cd-badges' },
              statusBadge(FINANCIAL_STATUS, order.financialStatus),
              order.cancelledAt ? badge(orderStatus(order)) : statusBadge(FULFILLMENT_STATUS, order.fulfillmentStatus)
            )
          ),
          h('p', { class: 'cd-order-head__meta' }, formatDateTime(order.processedAt))
        ),
        h(
          'div',
          { class: 'cd-page-header__actions' },
          h('button', { type: 'button', class: 'cd-text-button', onClick: () => window.print() }, STRINGS.printOrder),
          statusUrl ? externalLink(statusUrl, STRINGS.orderStatusPage, 'cd-text-button') : null,
          buyAgainButton(lineItems)
        )
      ),
      order.cancelledAt
        ? h('div', { class: 'cd-banner', role: 'status' }, icon('alert', 'cd-icon cd-icon--sm'), h('p', null, STRINGS.cancelledBanner(formatDate(order.cancelledAt))))
        : null,
      h('div', { class: 'cd-order-layout' }, h('div', { class: 'cd-order-main' }, shipmentSections, unfulfilledSection, cancelledSection, paymentSection), aside)
    );
  }

  function buyAgainButton(lineItems) {
    const eligible = lineItems.filter((item) => item.variantId && !item.giftCard);
    if (!eligible.length) return null;
    const el = button(STRINGS.buyAgain, { className: 'cd-button--small' });
    el.addEventListener('click', async () => {
      setBusy(el, true, STRINGS.adding);
      try {
        const { added, unavailable } = await buyAgain(lineItems);
        if (!added) {
          toast(STRINGS.nothingAdded, 'error');
        } else {
          const message = unavailable.length ? `${STRINGS.addedToCart(added)} ${STRINGS.someUnavailable(unavailable.join(', '))}` : STRINGS.addedToCart(added);
          toast(message, 'success', { href: config.cartUrl, label: STRINGS.viewCart });
        }
      } finally {
        setBusy(el, false);
      }
    });
    return el;
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
      ),
      customer.emailAddress ? marketingCard(customer.emailAddress.marketingState) : null
    );
  }

  // Email marketing consent via customerEmailMarketingSubscribe / Unsubscribe.
  function marketingCard(initialState) {
    let state = initialState;
    const locked = state === 'REDACTED' || state === 'INVALID';
    const id = nextId('marketing');
    const status = h('p', { class: 'cd-field__hint', id: `${id}-status` });
    const toggle = h('input', {
      type: 'checkbox',
      id,
      role: 'switch',
      class: 'cd-switch',
      'aria-describedby': `${id}-status`,
      disabled: locked,
    });
    const sync = () => {
      toggle.checked = state === 'SUBSCRIBED' || state === 'PENDING';
      status.textContent = locked ? STRINGS.marketingUnavailable : state === 'PENDING' ? STRINGS.marketingPending : STRINGS.marketingHint;
    };
    sync();

    toggle.addEventListener('change', async () => {
      const subscribe = toggle.checked;
      toggle.disabled = true;
      try {
        const data = await api.call(subscribe ? 'EmailSubscribe' : 'EmailUnsubscribe');
        const payload = subscribe ? data.customerEmailMarketingSubscribe : data.customerEmailMarketingUnsubscribe;
        if (payload.userErrors && payload.userErrors.length) {
          toast(payload.userErrors.map((e) => e.message).join(' '), 'error');
        } else {
          state = (payload.emailAddress && payload.emailAddress.marketingState) || (subscribe ? 'SUBSCRIBED' : 'UNSUBSCRIBED');
          cache.delete('profile');
          toast(STRINGS.marketingSaved);
        }
      } catch (error) {
        if (error.kind !== 'auth') toast(`${STRINGS.saveFailed} ${errorMessage(error)}`, 'error');
      } finally {
        toggle.disabled = locked;
        sync();
      }
    });

    return card(STRINGS.preferences, h('div', { class: 'cd-preference' }, h('label', { for: id, class: 'cd-preference__label' }, STRINGS.marketingLabel), toggle), status);
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

    if (logoutLink) {
      logoutLink.addEventListener('click', (event) => {
        event.preventDefault();
        auth.logout();
      });
    }

    // Never show account data restored from the back/forward cache (for example
    // after logging out and pressing Back): reload so the session is re-checked.
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) {
        tokens = null;
        clearProtectedContent();
        window.location.reload();
      }
    });
  }

  async function boot() {
    bindChrome();
    if (config.designMode) return renderDesignMode();
    if (!config.clientId || !config.redirectUri) return renderUnavailable();

    let result;
    try {
      result = await auth.handleCallback();
    } catch (error) {
      tokens = null;
      if (error.kind === 'network') {
        view.setAttribute('aria-busy', 'false');
        view.replaceChildren(errorState(error, () => window.location.reload()));
      } else {
        renderAuthProblem('failed');
      }
      return;
    }
    if (result === 'stopped') return;
    // Tokens are only kept in memory, so a fresh page load always starts a
    // (normally silent) authorization round trip.
    if (result !== 'authenticated') {
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
