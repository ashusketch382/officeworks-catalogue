export function formatPrice(price: { amount: number; currency: string }): string {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: price.currency }).format(price.amount);
}
