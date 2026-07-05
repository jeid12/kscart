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
  };
}

module.exports = { publicVendor, managementVendor, item };
