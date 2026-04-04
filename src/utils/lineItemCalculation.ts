import { Cart } from '../types/Inventory';

export function getInvoiceItemSubTotal(item: Cart) {
  let subtotal = Math.abs(item.price) * Math.abs(item.quantity);
  if (item.product_type === 'post-tax-discount') {
    // remove inclusive tax to apply tax on price
    let inclusive_tax_amount = getInclusiveTaxAmount(item, subtotal);
    // add exclusive tax amount as tax is apply on tax amount too
    subtotal += getExclusiveTaxAmount(item, subtotal - inclusive_tax_amount);
    // subtract discount from subtotal which includes both inclusiive and exclusive tax amount
    subtotal -= applyDiscount(item, subtotal);
  } else if (item.product_type === 'pre-tax-discount') {
    // subtract inclusive tax amount from subtotal
    subtotal -= getInclusiveTaxAmount(item, subtotal);
    // apply diisocunt after subtracting inclusive tax amount
    subtotal -= applyDiscount(item, subtotal);
    // sub total is without tax amount to apply all taxes on sub total and add in it
    subtotal += getTotalTaxAmount(item, subtotal);
  }
  return subtotal;
}

function getInclusiveTaxAmount(item: Cart, subtotal: number) {
  let tax_amount = 0;

  // Check for sale taxes
  if (item.sale_taxes) {
    tax_amount += item.sale_taxes.reduce((total, tax) => {
      // Check if tax type is inclusive
      if (tax.tax_type === 'inclusive') {
        return total + (subtotal * tax.tax_rate) / (100 + tax.tax_rate);
      }
      return total;
    }, 0);
  }
  // Check for purchase taxes
  if (item.purchase_taxes) {
    tax_amount += item.purchase_taxes.reduce((total, tax) => {
      // Check if tax type is inclusive
      if (tax.tax_type === 'inclusive') {
        return total + (subtotal * tax.tax_rate) / (100 + tax.tax_rate);
      }
      return total;
    }, 0);
  }

  return tax_amount;
}

function getExclusiveTaxAmount(item: Cart, subtotal: number) {
  let tax_amount = 0;
  // Check for sale taxes
  if (item.sale_taxes) {
    tax_amount += item.sale_taxes.reduce((total, tax) => {
      // Check if tax type is inclusive
      if (tax.tax_type === 'exclusive') {
        return total + (subtotal * tax.tax_rate) / 100;
      }
      return total;
    }, 0);
  }
  // Check for purchase taxes
  if (item.purchase_taxes) {
    tax_amount += item.purchase_taxes.reduce((total, tax) => {
      // Check if tax type is inclusive
      if (tax.tax_type === 'exclusive') {
        return total + (subtotal * tax.tax_rate) / 100;
      }
      return total;
    }, 0);
  }
  return tax_amount;
}
function applyDiscount(item: Cart, subtotal: number): number {
  return item.discount_type === 'flat' && item.discount
    ? item.discount
    : item.discount_type === 'percentage' && item.discount
    ? (subtotal * item.discount) / 100
    : 0;
}

function getTotalTaxAmount(item: Cart, subtotal: number) {
  var tax_amount = 0;
  if (item.sale_taxes) {
    tax_amount += item.sale_taxes.reduce((total, tax) => {
      return total + (subtotal * tax.tax_rate) / 100;
    }, 0);
  }
  if (item.purchase_taxes) {
    tax_amount += item.purchase_taxes.reduce((total, tax) => {
      return total + (subtotal * tax.tax_rate) / 100;
    }, 0);
  }
  return tax_amount;
}
