import "server-only";
import { preview, type Entitlement } from "./plans";
export function requireEntitlement(feature: Entitlement) {
  if (!preview.entitlements.includes(feature))
    throw new Error("Feature unavailable");
  return preview;
}
