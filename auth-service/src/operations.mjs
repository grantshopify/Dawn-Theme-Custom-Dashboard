// Allowlisted Customer Account API operations (API version from discovery;
// fields verified against the 2026-10 reference). The browser can only name an
// operation and pass validated variables. It cannot send arbitrary GraphQL, and
// it never sends a customer ID: every query is scoped by Shopify to the
// customer who owns the access token in the session cookie.

export class ValidationError extends Error {}

const MONEY = 'amount currencyCode';

const ORDER_SUMMARY = `
  id
  name
  number
  processedAt
  cancelledAt
  financialStatus
  fulfillmentStatus
  totalPrice { ${MONEY} }
`;

const ADDRESS = `
  id
  firstName
  lastName
  company
  address1
  address2
  city
  province
  zoneCode
  zip
  country
  countryCode
  phoneNumber
  formatted(withName: true)
`;

const TRACKING_FULFILLMENT = `
  id
  createdAt
  status
  latestShipmentStatus
  estimatedDeliveryAt
  requiresShipping
  trackingInformation { company number url }
`;

const USER_ERRORS = 'userErrors { field message code }';

// ---- Variable validators --------------------------------------------------

const CURSOR = /^[A-Za-z0-9+/=_\-:.]{1,1024}$/;
const ORDER_ID = /^gid:\/\/shopify\/Order\/\d{1,20}$/;
const ADDRESS_ID = /^gid:\/\/shopify\/CustomerAddress\/\d{1,20}(\?[A-Za-z0-9_=&]{0,64})?$/;
const COUNTRY_CODE = /^[A-Z]{2}$/;
const ZONE_CODE = /^[A-Za-z0-9-]{1,12}$/;
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

function plainObject(value, name) {
  if (value === undefined || value === null) return {};
  if (typeof value !== 'object' || Array.isArray(value)) throw new ValidationError(`${name} must be an object`);
  return value;
}

function allowOnly(object, keys, name) {
  for (const key of Object.keys(object)) {
    if (!keys.includes(key)) throw new ValidationError(`Unexpected ${name} field: ${key}`);
  }
}

function optionalCursor(value, name) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' || !CURSOR.test(value)) throw new ValidationError(`Invalid ${name}`);
  return value;
}

function requiredId(value, pattern, name) {
  if (typeof value !== 'string' || !pattern.test(value)) throw new ValidationError(`Invalid ${name}`);
  return value;
}

function text(value, name, { max = 255 } = {}) {
  if (value === undefined) return undefined;
  if (value === null) return '';
  if (typeof value !== 'string') throw new ValidationError(`${name} must be a string`);
  const trimmed = value.trim();
  if (trimmed.length > max) throw new ValidationError(`${name} is too long`);
  if (CONTROL_CHARS.test(trimmed)) throw new ValidationError(`${name} contains invalid characters`);
  return trimmed;
}

function optionalBoolean(value, name) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'boolean') throw new ValidationError(`${name} must be a boolean`);
  return value;
}

function pageVariables(input, pageSize) {
  const vars = plainObject(input, 'variables');
  allowOnly(vars, ['after', 'before'], 'variables');
  const after = optionalCursor(vars.after, 'after');
  const before = optionalCursor(vars.before, 'before');
  if (after && before) throw new ValidationError('Use either after or before');
  return before ? { last: pageSize, before } : { first: pageSize, after };
}

const ADDRESS_TEXT_FIELDS = ['firstName', 'lastName', 'company', 'address1', 'address2', 'city', 'zip', 'phoneNumber'];

function addressInput(input) {
  const address = plainObject(input, 'address');
  allowOnly(address, [...ADDRESS_TEXT_FIELDS, 'countryCode', 'zoneCode'], 'address');
  const out = {};
  for (const field of ADDRESS_TEXT_FIELDS) {
    const value = text(address[field], field);
    if (value !== undefined) out[field] = value;
  }
  if (address.countryCode !== undefined) {
    if (typeof address.countryCode !== 'string' || !COUNTRY_CODE.test(address.countryCode)) {
      throw new ValidationError('Invalid countryCode');
    }
    out.countryCode = address.countryCode;
  }
  if (address.zoneCode !== undefined) {
    if (address.zoneCode === null || address.zoneCode === '') {
      out.zoneCode = null;
    } else if (typeof address.zoneCode === 'string' && ZONE_CODE.test(address.zoneCode)) {
      out.zoneCode = address.zoneCode;
    } else {
      throw new ValidationError('Invalid zoneCode');
    }
  }
  return out;
}

// ---- Operations -----------------------------------------------------------

export const ORDERS_PAGE_SIZE = 10;
export const TRACKING_PAGE_SIZE = 10;
export const STATS_PAGE_SIZE = 100;
export const ADDRESSES_PAGE_SIZE = 50;
// Kept small enough that the order detail query stays well under Shopify's
// per-query cost limit (connections cost roughly `first` x child objects).
export const ORDER_LINE_ITEMS = 50;

export const OPERATIONS = {
  Overview: {
    query: `query Overview {
      customer {
        id
        firstName
        lastName
        displayName
        creationDate
        orders(first: 5, sortKey: PROCESSED_AT, reverse: true) {
          nodes { ${ORDER_SUMMARY} }
        }
      }
    }`,
    variables: (input) => {
      allowOnly(plainObject(input, 'variables'), [], 'variables');
      return {};
    },
  },

  // Paged through by the dashboard to compute exact summary counts, because the
  // Customer Account API exposes no order count field.
  OrderStats: {
    query: `query OrderStats($after: String) {
      customer {
        orders(first: ${STATS_PAGE_SIZE}, after: $after) {
          nodes { fulfillmentStatus cancelledAt }
          pageInfo { hasNextPage endCursor }
        }
      }
    }`,
    variables: (input) => {
      const vars = plainObject(input, 'variables');
      allowOnly(vars, ['after'], 'variables');
      return { after: optionalCursor(vars.after, 'after') };
    },
  },

  Orders: {
    query: `query Orders($first: Int, $after: String, $last: Int, $before: String) {
      customer {
        orders(first: $first, after: $after, last: $last, before: $before, sortKey: PROCESSED_AT, reverse: true) {
          nodes {
            ${ORDER_SUMMARY}
            lineItems(first: 4) {
              nodes { title quantity image { url altText } }
              pageInfo { hasNextPage }
            }
          }
          pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
        }
      }
    }`,
    variables: (input) => pageVariables(input, ORDERS_PAGE_SIZE),
  },

  Order: {
    query: `query Order($id: ID!) {
      order(id: $id) {
        ${ORDER_SUMMARY}
        cancelReason
        currencyCode
        statusPageUrl
        requiresShipping
        subtotal { ${MONEY} }
        totalShipping { ${MONEY} }
        totalTax { ${MONEY} }
        totalDuties { ${MONEY} }
        totalRefunded { ${MONEY} }
        shippingDiscountAllocations { allocatedAmount { ${MONEY} } }
        shippingAddress { formatted(withName: true) }
        shippingLine { title }
        lineItems(first: ${ORDER_LINE_ITEMS}) {
          nodes {
            id
            title
            variantTitle
            variantOptions { name value }
            quantity
            sku
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
            fulfillmentLineItems(first: 25) {
              nodes { quantity lineItem { id title } }
              pageInfo { hasNextPage }
            }
          }
        }
      }
    }`,
    variables: (input) => {
      const vars = plainObject(input, 'variables');
      allowOnly(vars, ['id'], 'variables');
      return { id: requiredId(vars.id, ORDER_ID, 'order id') };
    },
  },

  Tracking: {
    query: `query Tracking($first: Int, $after: String, $last: Int, $before: String) {
      customer {
        orders(first: $first, after: $after, last: $last, before: $before, sortKey: PROCESSED_AT, reverse: true) {
          nodes {
            id
            name
            processedAt
            cancelledAt
            fulfillmentStatus
            requiresShipping
            statusPageUrl
            fulfillments(first: 10) { nodes { ${TRACKING_FULFILLMENT} } }
          }
          pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
        }
      }
    }`,
    variables: (input) => pageVariables(input, TRACKING_PAGE_SIZE),
  },

  Profile: {
    query: `query Profile {
      customer {
        id
        firstName
        lastName
        emailAddress { emailAddress }
        phoneNumber { phoneNumber }
      }
    }`,
    variables: (input) => {
      allowOnly(plainObject(input, 'variables'), [], 'variables');
      return {};
    },
  },

  ProfileUpdate: {
    query: `mutation ProfileUpdate($input: CustomerUpdateInput!) {
      customerUpdate(input: $input) {
        customer { id firstName lastName }
        ${USER_ERRORS}
      }
    }`,
    variables: (input) => {
      const vars = plainObject(input, 'variables');
      allowOnly(vars, ['input'], 'variables');
      const fields = plainObject(vars.input, 'input');
      allowOnly(fields, ['firstName', 'lastName'], 'input');
      const out = {};
      for (const field of ['firstName', 'lastName']) {
        const value = text(fields[field], field);
        if (value !== undefined) out[field] = value;
      }
      if (!Object.keys(out).length) throw new ValidationError('Nothing to update');
      return { input: out };
    },
  },

  Addresses: {
    query: `query Addresses($after: String) {
      customer {
        defaultAddress { id }
        addresses(first: ${ADDRESSES_PAGE_SIZE}, after: $after) {
          nodes { ${ADDRESS} }
          pageInfo { hasNextPage endCursor }
        }
      }
    }`,
    variables: (input) => {
      const vars = plainObject(input, 'variables');
      allowOnly(vars, ['after'], 'variables');
      return { after: optionalCursor(vars.after, 'after') };
    },
  },

  AddressCreate: {
    query: `mutation AddressCreate($address: CustomerAddressInput!, $defaultAddress: Boolean) {
      customerAddressCreate(address: $address, defaultAddress: $defaultAddress) {
        customerAddress { ${ADDRESS} }
        ${USER_ERRORS}
      }
    }`,
    variables: (input) => {
      const vars = plainObject(input, 'variables');
      allowOnly(vars, ['address', 'defaultAddress'], 'variables');
      return {
        address: addressInput(vars.address),
        defaultAddress: optionalBoolean(vars.defaultAddress, 'defaultAddress') ?? false,
      };
    },
  },

  AddressUpdate: {
    query: `mutation AddressUpdate($addressId: ID!, $address: CustomerAddressInput, $defaultAddress: Boolean) {
      customerAddressUpdate(addressId: $addressId, address: $address, defaultAddress: $defaultAddress) {
        customerAddress { ${ADDRESS} }
        ${USER_ERRORS}
      }
    }`,
    variables: (input) => {
      const vars = plainObject(input, 'variables');
      allowOnly(vars, ['addressId', 'address', 'defaultAddress'], 'variables');
      const out = { addressId: requiredId(vars.addressId, ADDRESS_ID, 'address id') };
      if (vars.address !== undefined) out.address = addressInput(vars.address);
      const defaultAddress = optionalBoolean(vars.defaultAddress, 'defaultAddress');
      if (defaultAddress !== undefined) out.defaultAddress = defaultAddress;
      if (!out.address && out.defaultAddress === undefined) throw new ValidationError('Nothing to update');
      return out;
    },
  },

  AddressDelete: {
    query: `mutation AddressDelete($addressId: ID!) {
      customerAddressDelete(addressId: $addressId) {
        deletedAddressId
        ${USER_ERRORS}
      }
    }`,
    variables: (input) => {
      const vars = plainObject(input, 'variables');
      allowOnly(vars, ['addressId'], 'variables');
      return { addressId: requiredId(vars.addressId, ADDRESS_ID, 'address id') };
    },
  },
};
