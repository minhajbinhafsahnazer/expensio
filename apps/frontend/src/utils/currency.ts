export function formatCurrency(amount: number, currencyCode: string = "INR", maximumFractionDigits: number = 0): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits,
    }).format(amount);
  } catch (error) {
    // Graceful fallback to INR if invalid/missing currency
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "INR",
      maximumFractionDigits,
    }).format(amount);
  }
}
