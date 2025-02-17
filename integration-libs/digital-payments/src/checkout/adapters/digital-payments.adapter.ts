import { PaymentDetails } from '@spartacus/cart/base/root';
import { Observable } from 'rxjs';
import { DpPaymentRequest } from '../models';

export abstract class DigitalPaymentsAdapter {
  abstract createPaymentRequest(
    userId?: string,
    cartId?: string
  ): Observable<DpPaymentRequest>;
  abstract createPaymentDetails(
    sessionId: string,
    signature: string,
    userId?: string,
    cartId?: string
  ): Observable<PaymentDetails>;
}
