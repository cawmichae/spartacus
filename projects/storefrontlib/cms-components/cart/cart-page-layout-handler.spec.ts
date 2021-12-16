import { of } from 'rxjs';
import { CartPageLayoutHandler } from './cart-page-layout-handler';

describe('CartPageLayoutHandler', () => {
  const mockActiveCartService: any = {
    getActive() {
      return of({ totalItems: 0 });
    },
    getLoading() {
      return of(false);
    },
  };
  const mockSelectiveCartService: any = {
    getCart() {
      return of({ totalItems: 0 });
    },
    isEnabled() {
      return true;
    },
  };
  const mockSlots = [
    'test',
    'EmptyCartMiddleContent',
    'TopContent',
    'CenterRightContentSlot',
  ];
  const mockSlots$ = of(mockSlots);
  const cartPageTemplate = 'CartPageTemplate';
  it('should remove cart slots when cart and save for later are empty', () => {
    const handler = new CartPageLayoutHandler(
      mockActiveCartService,
      mockSelectiveCartService
    );

    let result;
    handler
      .handle(mockSlots$, cartPageTemplate)
      .subscribe((res) => (result = res));
    expect(result).toEqual(['test', 'EmptyCartMiddleContent']);
  });

  it('should remove empty content slot when cart has items', () => {
    jest
      .spyOn(mockActiveCartService, 'getActive')
      .mockReturnValue(of({ totalItems: 3 }));
    const handler = new CartPageLayoutHandler(
      mockActiveCartService,
      mockSelectiveCartService
    );

    let result;
    handler
      .handle(mockSlots$, cartPageTemplate)
      .subscribe((res) => (result = res));
    expect(result).toEqual(['test', 'TopContent', 'CenterRightContentSlot']);
  });

  it('should remove empty content slot when save for later has items', () => {
    jest
      .spyOn(mockSelectiveCartService, 'getCart')
      .mockReturnValue(of({ totalItems: 3 }));
    const handler = new CartPageLayoutHandler(
      mockActiveCartService,
      mockSelectiveCartService
    );

    let result;
    handler
      .handle(mockSlots$, cartPageTemplate)
      .subscribe((res) => (result = res));
    expect(result).toEqual(['test', 'TopContent']);
  });

  it('should not check save for later cart if the feature is disabled', () => {
    jest.spyOn(mockSelectiveCartService, 'getCart').mockImplementation();
    jest.spyOn(mockSelectiveCartService, 'isEnabled').mockReturnValue(false);
    const handler = new CartPageLayoutHandler(
      mockActiveCartService,
      mockSelectiveCartService
    );

    let result;
    handler
      .handle(mockSlots$, cartPageTemplate)
      .subscribe((res) => (result = res));
    expect(result).toEqual(['test', 'EmptyCartMiddleContent']);
    expect(mockSelectiveCartService.getCart).not.toHaveBeenCalled();
  });

  it('should return untouched stream if not a cart page template', () => {
    const handler = new CartPageLayoutHandler(
      mockActiveCartService,
      mockSelectiveCartService
    );
    const slots$ = handler.handle(mockSlots$, 'different page');
    expect(slots$).toBe(mockSlots$);
  });

  it('should not return content slots when cart is loading', () => {
    jest.spyOn(mockActiveCartService, 'getActive').mockReturnValue(of({}));
    jest.spyOn(mockActiveCartService, 'getLoading').mockReturnValue(of(true));
    const handler = new CartPageLayoutHandler(
      mockActiveCartService,
      mockSelectiveCartService
    );

    let result;
    handler
      .handle(mockSlots$, cartPageTemplate)
      .subscribe((res) => (result = res));
    expect(result).toEqual(['test']);
  });
});
