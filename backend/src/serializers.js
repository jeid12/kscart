// Shapes DB rows into API responses. Sensitive fields (management_token hash)
// are never sent to clients.

function publicVendor(v) {
  return {
    vendorId: v.vendor_id,
    businessName: v.business_name,
    phoneNumber: v.phone_number,
    storeSlug: v.store_slug,
    language: v.language,
  };
}

// Includes the momo merchant code — only used on management responses.
function managementVendor(v) {
  return {
    ...publicVendor(v),
    momoMerchantCode: v.momo_merchant_code,
    createdAt: v.created_at,
  };
}

function item(i) {
  return {
    itemId: i.item_id,
    name: i.name,
    price: i.price,
    photoUrl: i.photo_url,
    available: i.available,
    position: i.position,
    categoryId: i.category_id || null,
  };
}

function category(c) {
  return {
    categoryId: c.category_id,
    name: c.name,
    position: c.position,
  };
}

function order(o) {
  return {
    orderId: o.order_id,
    orderRef: o.order_ref,
    buyerTag: o.buyer_tag,
    buyerName: o.buyer_name,
    buyerLocation: o.buyer_location,
    payerName: o.payer_name,
    items: o.items,
    total: o.total,
    status: o.status,
    fulfillment: o.fulfillment,
    note: o.note,
    createdAt: o.created_at,
  };
}

module.exports = { publicVendor, managementVendor, item, category, order };
