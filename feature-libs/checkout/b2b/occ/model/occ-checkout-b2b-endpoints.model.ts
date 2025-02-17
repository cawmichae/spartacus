import { OccEndpoint } from '@spartacus/core';

export interface CheckoutB2BOccEndpoints {
  /**
   * Returns a list of the available payment types.
   */
  paymentTypes?: string | OccEndpoint;
  /**
   * Sets the cost center for the checkout cart.
   */
  setCartCostCenter?: string | OccEndpoint;
  /**
   * Sets the payment type for the checkout cart
   */
  setCartPaymentType?: string | OccEndpoint;
}

declare module '@spartacus/core' {
  interface OccEndpoints extends CheckoutB2BOccEndpoints {}
}
