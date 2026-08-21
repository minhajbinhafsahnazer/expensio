export const CURRENCIES = [
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "AED", symbol: "AED", name: "UAE Dirham" },
  { code: "SAR", symbol: "SAR", name: "Saudi Riyal" },
  { code: "QAR", symbol: "QAR", name: "Qatari Riyal" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "CAD", symbol: "CAD", name: "Canadian Dollar" },
  { code: "AUD", symbol: "AUD", name: "Australian Dollar" }
] as const;

export type CurrencyCode = typeof CURRENCIES[number]["code"];
