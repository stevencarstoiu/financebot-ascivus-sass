import { workspace } from "@/lib/workspace";
import { Shell } from "@/components/shell";
export const dynamic = "force-dynamic";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { org } = await workspace();
  return <Shell name={org.name}>{children}</Shell>;
}
