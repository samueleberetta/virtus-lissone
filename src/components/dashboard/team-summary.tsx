import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";

export interface TeamSummary {
  team_id: string;
  team_name: string;
  totale: number;
  ok: number;
  in_scadenza: number;
  critici: number;    // scaduto + mancante
}

export function TeamSummaryCard({ teams }: { teams: TeamSummary[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Stato squadre</CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        {teams.length === 0 && (
          <p className="text-sm text-neutral-500">Nessuna squadra configurata.</p>
        )}
        {teams.map((t) => {
          const total = t.totale || 1;
          const okPct = (t.ok / total) * 100;
          const warnPct = (t.in_scadenza / total) * 100;
          const critPct = (t.critici / total) * 100;
          return (
            <div key={t.team_id}>
              <div className="flex items-center justify-between mb-1.5">
                <Link
                  href={`/atleti?team=${t.team_id}`}
                  className="text-sm font-medium text-neutral-800 hover:text-virtus-red"
                >
                  {t.team_name}
                </Link>
                <span className="text-xs text-neutral-500">
                  {t.totale} atlet{t.totale === 1 ? "a" : "i"}
                </span>
              </div>
              <div className="team-status-bar">
                <div
                  className={cn("bg-status-green")}
                  style={{ width: `${okPct}%` }}
                  title={`${t.ok} in regola`}
                />
                <div
                  className={cn("bg-status-yellow")}
                  style={{ width: `${warnPct}%` }}
                  title={`${t.in_scadenza} in scadenza`}
                />
                <div
                  className={cn("bg-status-red")}
                  style={{ width: `${critPct}%` }}
                  title={`${t.critici} critici`}
                />
              </div>
              <div className="flex gap-4 mt-1 text-[11px] text-neutral-500">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-status-green" /> {t.ok}
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-status-yellow" />{" "}
                  {t.in_scadenza}
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-status-red" /> {t.critici}
                </span>
              </div>
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
}
