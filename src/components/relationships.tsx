"use client";
import { useEffect, useState } from "react";
import type { Row } from "@/lib/crm";
export function Relationships({
  customerId = "",
  contactId = "",
  showContact,
  initialCustomers,
  initialContacts,
}: {
  customerId?: string;
  contactId?: string;
  showContact: boolean;
  initialCustomers: Row[];
  initialContacts: Row[];
}) {
  const [selected, setSelected] = useState(customerId);
  const [contact, setContact] = useState(contactId);
  const [q, setQ] = useState("");
  const [cq, setCq] = useState("");
  const [options, setOptions] = useState({
    customers: initialCustomers.slice(0, 30),
    contacts: initialContacts
      .filter((c) => c.customer_id === customerId)
      .slice(0, 30),
    selectedCustomer: initialCustomers.find((c) => c.id === customerId) || null,
    selectedContact: initialContacts.find((c) => c.id === contactId) || null,
  });
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(
        "/api/options?" +
          new URLSearchParams({ q, cq, customer: selected, contact }),
        { signal: controller.signal },
      )
        .then((r) => {
          if (!r.ok) throw new Error();
          return r.json();
        })
        .then((data) => {
          setOptions(data);
          setError("");
        })
        .catch((e) => {
          if (e.name !== "AbortError")
            setError("Could not load options. Try searching again.");
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, cq, selected, contact]);
  const customers = [...options.customers];
  if (
    options.selectedCustomer &&
    !customers.some((c) => c.id === options.selectedCustomer!.id)
  )
    customers.unshift(options.selectedCustomer);
  const contacts = [...options.contacts];
  if (
    options.selectedContact &&
    !contacts.some((c) => c.id === options.selectedContact!.id)
  )
    contacts.unshift(options.selectedContact);
  return (
    <>
      <div>
        <label>
          Find customer
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search all active customers"
          />
        </label>
        <label>
          Customer
          <select
            required
            aria-label="Customer"
            name="customer_id"
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value);
              setContact("");
            }}
          >
            <option value="">Select a customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id!}>
                {c.display_name}
              </option>
            ))}
          </select>
          <small>Search returns up to 30 matching records.</small>
        </label>
        {error && (
          <p role="status" className="notice error">
            {error}
          </p>
        )}
      </div>
      {showContact && (
        <div>
          <label>
            Find contact
            <input
              type="search"
              value={cq}
              onChange={(e) => setCq(e.target.value)}
              placeholder="Search this customer's contacts"
            />
          </label>
          <label>
            Primary contact
            <select
              aria-label="Primary contact"
              name="primary_contact_id"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            >
              <option value="">None</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id!}>
                  {c.full_name}
                </option>
              ))}
            </select>
            <small>Only contacts belonging to the selected customer.</small>
          </label>
        </div>
      )}
    </>
  );
}
