import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  Output,
  EventEmitter
} from '@angular/core';
import { FormGroup, Validators, FormBuilder } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import * as fromCheckoutStore from '../../../../store';
import { CheckoutService } from '../../../../services/checkout.service';
import { Card } from '../../../../../ui/components/card/card.component';

@Component({
  selector: 'y-payment-form',
  templateUrl: './payment-form.component.html',
  styleUrls: ['./payment-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaymentFormComponent implements OnInit {
  months = [];
  years = [];

  cardTypes$: Observable<any>;
  shippingAddress$: Observable<any>;
  sameAsShippingAddress = true;

  @Output() backToPayment = new EventEmitter<any>();
  @Output() addPaymentInfo = new EventEmitter<any>();

  payment: FormGroup = this.fb.group({
    defaultPayment: [false],
    accountHolderName: ['', Validators.required],
    cardNumber: ['', Validators.required],
    cardType: this.fb.group({
      code: ['', Validators.required]
    }),
    expiryMonth: ['', Validators.required],
    expiryYear: ['', Validators.required],
    cvn: ['', Validators.required]
  });

  constructor(
    protected store: Store<fromCheckoutStore.CheckoutState>,
    protected checkoutService: CheckoutService,
    private fb: FormBuilder
  ) {}

  ngOnInit() {
    this.expMonthAndYear();

    this.cardTypes$ = this.store.select(fromCheckoutStore.getAllCardTypes).pipe(
      tap(cardTypes => {
        if (Object.keys(cardTypes).length === 0) {
          this.checkoutService.loadSupportedCardTypes();
        }
      })
    );
    this.shippingAddress$ = this.store.select(
      fromCheckoutStore.getDeliveryAddress
    );
  }

  expMonthAndYear() {
    const year = new Date().getFullYear();
    for (let i = 0; i < 10; i++) {
      this.years.push({ id: i + 1, name: year + i });
    }
    for (let i = 1; i <= 12; i++) {
      if (i < 10) {
        this.months.push({ id: i, name: '0' + i.toString() });
      } else {
        this.months.push({ id: i, name: i.toString() });
      }
    }
  }

  toggleDefaultPaymentMethod() {
    this.payment.value.defaultPayment = !this.payment.value.defaultPayment;
  }

  paymentSelected(card) {
    this.payment['controls'].cardType['controls'].code.setValue(card.code);
  }

  monthSelected(month) {
    this.payment['controls'].expiryMonth.setValue(month.id);
  }

  yearSelected(year) {
    this.payment['controls'].expiryYear.setValue(year.name);
  }

  setSameAsShippingAddress() {
    this.sameAsShippingAddress = !this.sameAsShippingAddress;
  }

  getAddressCardContent(address): Card {
    let region = '';
    if (address.region && address.region.isocode) {
      region = address.region.isocode + ', ';
    }

    return {
      textBold: address.firstName + ' ' + address.lastName,
      text: [
        address.line1,
        address.line2,
        address.town + ', ' + region + address.country.isocode,
        address.postalCode,
        address.phone
      ]
    };
  }

  back() {
    this.backToPayment.emit();
  }

  next() {
    this.addPaymentInfo.emit(this.payment.value);
  }

  required(name: string) {
    return (
      this.payment.get(`${name}`).hasError('required') &&
      this.payment.get(`${name}`).touched
    );
  }

  notSelected(name: string) {
    return (
      this.payment.get(`${name}`).dirty && !this.payment.get(`${name}`).value
    );
  }
}
