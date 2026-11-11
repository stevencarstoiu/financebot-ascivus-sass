import type { Database as Generated } from "./database.types";
type Public = Generated["public"];
type Offer = Public["Tables"]["offers"];
/** PostgREST accepts exact numeric strings; keep them intact on writes. SQL also accepts NULL filter arguments. */
export type Database = {
  public: Omit<Public, "Tables" | "Functions"> & {
    Tables: Omit<Public["Tables"], "offers"> & {
      offers: Omit<Offer, "Insert" | "Update"> & {
        Insert: Omit<Offer["Insert"], "amount"> & { amount: string | number };
        Update: Omit<Offer["Update"], "amount"> & { amount?: string | number };
      };
    };
    Functions: Omit<Public["Functions"], "dashboard_metrics"> & {
      dashboard_metrics: Omit<
        Public["Functions"]["dashboard_metrics"],
        "Args"
      > & {
        Args: {
          p_org: string;
          p_currency?: string | null;
          p_customer?: string | null;
          p_from?: string | null;
          p_to?: string | null;
          p_status?: string | null;
        };
      };
    };
  };
};
export type CrmInsert =
  | Database["public"]["Tables"]["customers"]["Insert"]
  | Database["public"]["Tables"]["contacts"]["Insert"]
  | Database["public"]["Tables"]["offers"]["Insert"];
export type CrmUpdate =
  | Database["public"]["Tables"]["customers"]["Update"]
  | Database["public"]["Tables"]["contacts"]["Update"]
  | Database["public"]["Tables"]["offers"]["Update"];
