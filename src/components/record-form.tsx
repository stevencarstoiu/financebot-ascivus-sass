import { Relationships } from "./relationships";
import { saveRecord } from "@/app/app/crm-actions";
import { Submit } from "./submit";
import { type Entity, type Row, labels } from "@/lib/crm";
import { statuses } from "@/lib/validation";
export function RecordForm({
  entity,
  row,
  customers = [],
  contacts = [],
  currency = "EUR",
}: {
  entity: Entity;
  row?: Row;
  customers?: Row[];
  contacts?: Row[];
  currency?: string;
}) {
  const v = (key: string) => row?.[key] || "";
  const input = (
    key: string,
    label: string,
    required = false,
    maxLength = 200,
  ) => (
    <label key={key}>
      {label}
      <input
        name={key}
        defaultValue={v(key)}
        required={required}
        maxLength={maxLength}
      />
    </label>
  );
  return (
    <form action={saveRecord}>
      <input type="hidden" name="entity" value={entity} />
      <input type="hidden" name="id" value={v("id")} />
      <input type="hidden" name="version" value={v("updated_at")} />
      <div className="form-grid">
        {entity === "customers" ? (
          <>
            {input("display_name", "Customer name", true)}
            <label>
              Type
              <select
                name="customer_type"
                defaultValue={v("customer_type") || "company"}
              >
                <option value="company">Company</option>
                <option value="person">Person</option>
              </select>
            </label>
            {input("external_reference", "External reference", false, 120)}
            {input("website", "Website (https://…) ", false, 500)}
          </>
        ) : (
          <>
            <Relationships
              customerId={v("customer_id")}
              contactId={v("primary_contact_id")}
              showContact={entity === "offers"}
              initialCustomers={customers}
              initialContacts={contacts}
            />
            {entity === "contacts" ? (
              <>
                {input("full_name", "Full name", true)}
                <label>
                  Email
                  <input
                    name="email"
                    type="email"
                    defaultValue={v("email")}
                    maxLength={254}
                  />
                </label>
                {input("phone", "Phone", false, 60)}
                {input("position", "Position", false, 120)}
              </>
            ) : (
              <>
                {input("title", "Offer title", true, 240)}
                {input("external_reference", "External reference", false, 120)}
                <label>
                  Offer value
                  <input
                    required
                    name="amount"
                    inputMode="decimal"
                    pattern="[0-9]{1,14}(\.[0-9]{1,4})?"
                    defaultValue={v("exact_amount") || v("amount")}
                    placeholder="1250.00"
                  />
                  <small>Decimal point, no thousands separators.</small>
                </label>
                <label>
                  ISO currency
                  <input
                    name="currency"
                    required
                    defaultValue={v("currency") || currency}
                    maxLength={3}
                    pattern="[A-Z]{3}"
                  />
                </label>
                <label>
                  Status
                  <select name="status" defaultValue={v("status") || "draft"}>
                    {statuses.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Sent date
                  <input
                    type="date"
                    name="sent_at"
                    defaultValue={v("sent_at").slice(0, 10)}
                  />
                  <small>
                    Required for sent, replied, won or lost. Draft clears dates.
                    Manual corrections appear in history.
                  </small>
                </label>
              </>
            )}
          </>
        )}
        {entity !== "contacts" && (
          <label className="full">
            Notes
            <textarea name="notes" defaultValue={v("notes")} maxLength={4000} />
          </label>
        )}
      </div>
      <Submit>
        {row ? "Save changes" : "Create " + labels[entity].toLowerCase()}
      </Submit>
    </form>
  );
}
