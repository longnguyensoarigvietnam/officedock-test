export interface PaymentMethod {
  type: string;
  stripePaymentMethodId: string;
  isDefault: boolean;
  isRetryFailed: boolean;
  brand: string;
  last4: string;
  expMonth: string;
  expYear: string;
  id: number;
}
