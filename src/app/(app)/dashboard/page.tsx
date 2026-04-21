import { Users, AlertCircle, Clock, Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { CriticalList } from "@/components/dashboard/critical-list";
import { TeamSummaryCard } from "@/components/dashboard/team-summary";
import { requireUser } from "@/lib/utils/auth";
import { fetchCriticalEntries } from "@/lib/queries/alerts";
import { fetchDashboardKpis, fetchTeamSummary } from "@/lib/queries/dashboard";

export default async function DashboardPage() {
  const user = await requireUser();

  const [kpis, critical, teams] = await Promise.all([
    fetchDashboardKpis(),
    fetchCriticalEntries(),
    fetchTeamSummary(),
  ]);

  const displayName =
    [user.nome, user.cognome].filter(Boolean).join(" ") || user.email;

  return (
    <div>
      <PageHeader
        title={`Ciao, ${displayName}`}
        description="Panoramica generale sullo stato della società."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Atleti totali"
          value={kpis.atletiTotali}
          sublabel="stagione corrente"
          icon={Users}
        />
        <KpiCard
          label="Certificati scaduti"
          value={kpis.certScaduti}
          sublabel="atleti + allenatori"
          tone="red"
          icon={AlertCircle}
        />
        <KpiCard
          label="In scadenza (30gg)"
          value={kpis.certInScadenza}
          sublabel="atleti + allenatori"
          tone="yellow"
          icon={Clock}
        />
        <KpiCard
          label="Quote in sospeso"
          value={kpis.quoteInSospeso}
          sublabel="non pagate o parziali"
          tone={kpis.quoteInSospeso > 0 ? "red" : "green"}
          icon={Wallet}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CriticalList entries={critical} limit={10} />
        </div>
        <div>
          <TeamSummaryCard teams={teams} />
        </div>
      </div>
    </div>
  );
}
