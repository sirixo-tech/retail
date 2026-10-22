export function formatInr(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(paise / 100);
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
}
