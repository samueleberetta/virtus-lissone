import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/utils/auth";
import { fetchCurrentSeasonId } from "@/lib/queries/alerts";
import { COACH_ROLE_LABELS } from "@/lib/constants";
import { Users } from "lucide-react";

export default async function SquadrePage() {
  await requireUser();
  const supabase = await createClient();
  const seasonId = await fetchCurrentSeasonId();

  const { data: teams } = await supabase
    .from("teams")
    .select("id, nome")
    .eq("attiva", true)
    .order("ordine");

  const results: {
    id: string;
    nome: string;
    atleti: number;
    coach: { nome: string; cognome: string; ruolo: string } | null;
  }[] = [];

  for (const t of teams ?? []) {
    const { count } = await supabase
      .from("athlete_seasons")
      .select("*", { count: "exact", head: true })
      .eq("team_id", t.id)
      .eq("season_id", seasonId ?? "");

    const { data: coachRow } = await supabase
      .from("coach_team_roles")
      .select("ruolo, coaches(nome, cognome)")
      .eq("team_id", t.id)
      .eq("season_id", seasonId ?? "")
      .eq("ruolo", "principale")
      .maybeSingle();

    const coach = coachRow
      ? ({
          nome: (coachRow as unknown as { coaches: { nome: string } }).coaches?.nome,
          cognome: (coachRow as unknown as { coaches: { cognome: string } }).coaches?.cognome,
          ruolo: (coachRow as unknown as { ruolo: string }).ruolo,
        } as { nome: string; cognome: string; ruolo: string })
      : null;

    results.push({ id: t.id, nome: t.nome, atleti: count ?? 0, coach });
  }

  return (
    <div>
      <PageHeader
        title="Squadre"
        description="Le 8 squadre calcio Virtus Lissone per la stagione corrente."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {results.map((t) => (
          <Link key={t.id} href={`/atleti?team=${t.id}`}>
            <Card className="hover:border-virtus-yellow transition-colors cursor-pointer h-full">
              <CardBody>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-neutral-900">{t.nome}</h3>
                  <Badge variant="neutral">
                    <Users className="h-3 w-3 mr-1" /> {t.atleti}
                  </Badge>
                </div>
                <div className="text-xs text-neutral-500">
                  {t.coach ? (
                    <>
                      <div className="font-medium text-neutral-700">
                        {t.coach.cognome} {t.coach.nome}
                      </div>
                      <div>{COACH_ROLE_LABELS[t.coach.ruolo as "principale"]}</div>
                    </>
                  ) : (
                    <span className="italic">Allenatore non assegnato</span>
                  )}
                </div>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
