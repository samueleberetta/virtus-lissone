import { createClient } from "@/lib/supabase/server";
import { certificateStatus } from "@/lib/utils/certificates";
import { fetchCurrentSeasonId } from "@/lib/queries/alerts";
import type { TeamSummary } from "@/components/dashboard/team-summary";

export interface DashboardKpis {
  atletiTotali: number;
  certScaduti: number;
  certInScadenza: number;
  quoteInSospeso: number;
}

export async function fetchDashboardKpis(): Promise<DashboardKpis> {
  const supabase = await createClient();
  const seasonId = await fetchCurrentSeasonId();
  if (!seasonId) {
    return { atletiTotali: 0, certScaduti: 0, certInScadenza: 0, quoteInSospeso: 0 };
  }

  // Atleti iscritti nella stagione corrente
  const { count: atletiTotali } = await supabase
    .from("athlete_seasons")
    .select("*", { count: "exact", head: true })
    .eq("season_id", seasonId);

  // Documenti: certificati medici con scadenza
  const { data: medDocs } = await supabase
    .from("documents")
    .select("data_scadenza")
    .eq("tipo", "certificato_medico");

  let certScaduti = 0;
  let certInScadenza = 0;
  for (const d of medDocs ?? []) {
    const s = certificateStatus(d.data_scadenza);
    if (s === "scaduto") certScaduti++;
    else if (s === "in_scadenza") certInScadenza++;
  }

  // Certificati allenatori
  const { data: coachCerts } = await supabase
    .from("coach_certificates")
    .select("data_scadenza");
  for (const c of coachCerts ?? []) {
    const s = certificateStatus(c.data_scadenza);
    if (s === "scaduto") certScaduti++;
    else if (s === "in_scadenza") certInScadenza++;
  }

  // Quote in sospeso (non_pagato o parziale)
  const { count: quoteInSospeso } = await supabase
    .from("payments")
    .select("*", { count: "exact", head: true })
    .eq("season_id", seasonId)
    .in("stato", ["non_pagato", "parziale"]);

  return {
    atletiTotali: atletiTotali ?? 0,
    certScaduti,
    certInScadenza,
    quoteInSospeso: quoteInSospeso ?? 0,
  };
}

export async function fetchTeamSummary(): Promise<TeamSummary[]> {
  const supabase = await createClient();
  const seasonId = await fetchCurrentSeasonId();
  if (!seasonId) return [];

  const { data: teams } = await supabase
    .from("teams")
    .select("id, nome")
    .eq("attiva", true)
    .order("ordine");

  const result: TeamSummary[] = [];

  for (const team of teams ?? []) {
    const { data: rows } = await supabase
      .from("athlete_seasons")
      .select(
        `
        athletes (
          id,
          documents ( tipo, data_scadenza )
        )
      `,
      )
      .eq("season_id", seasonId)
      .eq("team_id", team.id);

    let ok = 0;
    let inScad = 0;
    let crit = 0;
    const castRows = rows as unknown as Array<{
      athletes: {
        id: string;
        documents: { tipo: string; data_scadenza: string | null }[] | null;
      } | null;
    }>;

    for (const r of castRows ?? []) {
      const docs = r.athletes?.documents ?? [];
      const med = docs.find((d) => d.tipo === "certificato_medico");
      const status = certificateStatus(med?.data_scadenza ?? null);
      if (status === "ok") ok++;
      else if (status === "in_scadenza") inScad++;
      else crit++;
    }

    result.push({
      team_id: team.id,
      team_name: team.nome,
      totale: (rows ?? []).length,
      ok,
      in_scadenza: inScad,
      critici: crit,
    });
  }

  return result;
}
