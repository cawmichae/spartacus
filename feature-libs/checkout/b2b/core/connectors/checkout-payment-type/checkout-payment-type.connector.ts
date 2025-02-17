import { Injectable } from '@angular/core';
import { PaymentType } from '@spartacus/cart/base/root';
import { Observable } from 'rxjs';
import { CheckoutPaymentTypeAdapter } from './checkout-payment-type.adapter';

@Injectable()
export class CheckoutPaymentTypeConnector {
  constructor(protected adapter: CheckoutPaymentTypeAdapter) {}

  getPaymentTypes(): Observable<PaymentType[]> {
    return this.adapter.getPaymentTypes();
  }

  setPaymentType(
    userId: string,
    cartId: string,
    typeCode: string,
    purchaseOrderNumber?: string
  ): Observable<unknown> {
    return this.adapter.setPaymentType(
      userId,
      cartId,
      typeCode,
      purchaseOrderNumber
    );
  }
}
