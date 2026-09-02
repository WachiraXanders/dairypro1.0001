// Payment methods that indicate a transaction was settled immediately
const CASH_METHODS = ['Cash', 'Mobile Money', 'Bank Transfer', 'Check'];

// Vendor payment terms that indicate a credit relationship
const CREDIT_TERMS = ['Net 7', 'Net 14', 'Net 30', 'Net 60'];

// A vendor is on credit if their payment terms are a Net term
export function isCreditVendor(paymentTerms) {
  return CREDIT_TERMS.includes(paymentTerms);
}

// A transaction is outstanding (unpaid) if the vendor has credit terms
// AND the transaction was not settled via a cash-equivalent payment method
export function isOutstandingTransaction(transaction, vendorPaymentTerms) {
  if (!isCreditVendor(vendorPaymentTerms)) return false;
  if (CASH_METHODS.includes(transaction.payment_method)) return false;
  return true;
}

// Inventory purchases have no payment_method field, so outstanding
// depends solely on the vendor's payment terms
export function isOutstandingInventory(vendorPaymentTerms) {
  return isCreditVendor(vendorPaymentTerms);
}
