import { Shell } from "@/components/shell";
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Shell demo name="Fieldwork Collective">
      {children}
    </Shell>
  );
}
