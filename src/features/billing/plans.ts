export type PlanId = "preview";
export type Entitlement = "crm" | "imports" | "advancedDashboard";
export type PlanFeatures = {
  offers: number;
  customers: number;
  contacts: number;
  importRows: number;
  entitlements: readonly Entitlement[];
};
export const preview: PlanFeatures = {
  offers: 10000,
  customers: 10000,
  contacts: 20000,
  importRows: 1000,
  entitlements: ["crm", "imports", "advancedDashboard"],
};
export interface BillingProvider {
  readonly enabled: boolean;
  planForOrganization(organizationId: string): Promise<PlanId>;
}
