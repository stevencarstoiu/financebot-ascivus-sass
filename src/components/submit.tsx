"use client";
import { useFormStatus } from "react-dom";
export function Submit({
  children = "Save changes",
}: {
  children?: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button className="button" disabled={pending}>
      {pending ? "Saving…" : children}
    </button>
  );
}
