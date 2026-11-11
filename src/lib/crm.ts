export const entities = ["customers", "contacts", "offers"] as const;
export type Entity = (typeof entities)[number];
export function isEntity(s: string): s is Entity {
  return entities.includes(s as Entity);
}
export type Row = Record<string, string | null>;
export const labels = {
  customers: "Customer",
  contacts: "Contact",
  offers: "Offer",
};
export function title(entity: Entity, row: Row) {
  return (
    row[
      entity === "customers"
        ? "display_name"
        : entity === "contacts"
          ? "full_name"
          : "title"
    ] || "Untitled"
  );
}
export function money(value: string, currency: string) {
  const [whole, decimal = ""] = value.split(".");
  const digits = Number(
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
    }).resolvedOptions().maximumFractionDigits ?? 2,
  );
  return `${currency} ${BigInt(whole || "0").toLocaleString("en-US")}${decimal && digits ? "." + decimal.slice(0, Math.max(digits, decimal.replace(/0+$/, "").length)).padEnd(digits, "0") : digits ? "." + "0".repeat(digits) : ""}`;
}
