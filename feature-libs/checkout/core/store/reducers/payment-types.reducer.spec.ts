import { CheckoutActions } from '../actions/index';
import * as fromReducer from './payment-types.reducer';

describe('Payment Types Reducer', () => {
  describe('undefined action', () => {
    it('should return the default state', () => {
      const { initialState } = fromReducer;
      const action = {} as CheckoutActions.PaymentTypesAction;
      const state = fromReducer.reducer(undefined, action);

      expect(state).toBe(initialState);
    });
  });

  describe('SET_PAYMENT_TYPE_SUCCESS action', () => {
    it('should populate the selected field', () => {
      const { initialState } = fromReducer;
      const action = new CheckoutActions.SetPaymentTypeSuccess({
        code: 'testCart',
        paymentType: { code: 'CARD' },
      });
      const state = fromReducer.reducer(initialState, action);
      expect(state.selected).toEqual('CARD');
    });
  });

  describe('CHECKOUT_CLEAR_MISCS_DATA action', () => {
    it('should clear the mics data', () => {
      const { initialState } = fromReducer;
      const action = new CheckoutActions.ClearCheckoutData();
      const state = fromReducer.reducer(initialState, action);
      expect(state).toEqual(initialState);
    });
  });

  describe('CLEAR_CHECKOUT_DATA action', () => {
    it('should clear checkout data', () => {
      const { initialState } = fromReducer;
      fromReducer.reducer(
        initialState,
        new CheckoutActions.SetPaymentType({
          userId: 'testUser',
          cartId: 'testCart',
          typeCode: 'CARD',
        })
      );

      const action = new CheckoutActions.ClearCheckoutData();
      const state = fromReducer.reducer(initialState, action);
      expect(state.selected).toEqual(undefined);
    });
  });
});
