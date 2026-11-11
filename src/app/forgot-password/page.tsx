import { AuthPage } from "@/components/auth-page";
export const dynamic = "force-dynamic";
export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  return <AuthPage kind="forgot-password" searchParams={searchParams} />;
}
