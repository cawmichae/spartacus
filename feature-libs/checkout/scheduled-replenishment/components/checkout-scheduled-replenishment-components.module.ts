import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { CheckoutScheduledReplenishmentPlaceOrderModule } from './checkout-place-order/checkout-place-order.module';
import { CheckoutScheduleReplenishmentOrderModule } from './checkout-schedule-replenishment-order/checkout-schedule-replenishment-order.module';

@NgModule({
  imports: [
    CommonModule,
    CheckoutScheduleReplenishmentOrderModule,
    CheckoutScheduledReplenishmentPlaceOrderModule,
  ],
})
export class CheckoutScheduledReplenishmentComponentsModule {}
