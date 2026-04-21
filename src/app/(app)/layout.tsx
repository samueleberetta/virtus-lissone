import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { AlertBanner } from "@/components/layout/alert-banner";
import { requireUser } from "@/lib/utils/auth";
import { fetchAlertCounts } from "@/lib/queries/alerts";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const { scaduti, inScadenza } = await fetchAlertCounts();

  return (
    <div className="flex min-h-screen">
      <Sidebar role={user.ruolo} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar user={user} />
        <AlertBanner scaduti={scaduti} inScadenza={inScadenza} />
        <main className="flex-1 p-6 max-w-[1400px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
