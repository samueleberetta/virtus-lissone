import { createClient } from "@/lib/supabase/server";
import { certificateStatus } from "@/lib/utils/certificates";
import type { CertificateStatus } from "@/lib/types/database";

export interface CriticalEntry {
  kind: "atleta" | "allenatore";
  subject: string;                // nome completo
  subject_id: string;
  squadra: string | null;
  cert_label: string;             // es. "Certificato medico", "DAE"
  status: CertificateStatus;
  data_scadenza: string | null;
}

export async function fetchCurrentSeasonId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("seasons")
    .select("id")
    .eq("corrente", true)
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

export async function fetchCriticalEntries(options?: {
  teamId?: string;
}): Promise<CriticalEntry[]> {
  const supabase = await createClient();
  const seasonId = await fetchCurrentSeasonId();
  if (!seasonId) return [];

  const entries: CriticalEntry[] = [];

  // ----- ATLETI: certificati medici -----
  let athletesQuery = supabase
    .from("athlete_seasons")
    .select(
      `
      team_id,
      teams ( nome ),
      athletes ( id, nome, cognome,
        documents ( tipo, data_scadenza )
      )
    `,
    )
    .eq("season_id", seasonId);

  if (options?.teamId) athletesQuery = athletesQuery.eq("team_id", options.teamId);

  const { data: athleteRows } = await athletesQuery;

  for (const row of (athleteRows ?? []) as unknown as Array<{
    team_id: string;
    teams: { nome: string } | null;
    athletes: {
      id: string;
      nome: string;
      cognome: string;
      documents: { tipo: string; data_scadenza: string | null }[] | null;
    } | null;
  }>) {
    const a = row.athletes;
    if (!a) continue;
    const medical = (a.documents ?? []).find(
      (d) => d.tipo === "certificato_medico",
    );
    const status = certificateStatus(medical?.data_scadenza ?? null);
    if (status === "ok") continue;
    entries.push({
      kind: "atleta",
      subject: `${a.cognome} ${a.nome}`,
      subject_id: a.id,
      squadra: row.teams?.nome ?? null,
      cert_label: "Certificato medico",
      status,
      data_scadenza: medical?.data_scadenza ?? null,
    });
  }

  // ----- ALLENATORI: DAE + patentino CSI -----
  const { data: coachRows } = await supabase
    .from("coaches")
    .select(
      `
      id, nome, cognome,
      coach_certificates ( tipo, data_scadenza ),
      coach_team_roles (
        team_id,
        season_id,
        teams ( nome )
      )
    `,
    );

  for (const c of (coachRows ?? []) as unknown as Array<{
    id: string;
    nome: string;
    cognome: string;
    coach_certificates: { tipo: "dae" | "patentino_csi"; data_scadenza: string }[];
    coach_team_roles: {
      team_id: string;
      season_id: string;
      teams: { nome: string } | null;
    }[];
  }>) {
    const teamsForCoach = (c.coach_team_roles ?? []).filter(
      (r) => r.season_id === seasonId,
    );
    if (options?.teamId && !teamsForCoach.some((t) => t.team_id === options.teamId))
      continue;
    const teamLabel =
      teamsForCoach
        .map((t) => t.teams?.nome)
        .filter(Boolean)
        .join(", ") || null;

    const types: { tipo: "dae" | "patentino_csi"; label: string }[] = [
      { tipo: "dae", label: "Certificato DAE" },
      { tipo: "patentino_csi", label: "Patentino allenatore CSI" },
    ];

    for (const t of types) {
      const cert = (c.coach_certificates ?? []).find((x) => x.tipo === t.tipo);
      const status = certificateStatus(cert?.data_scadenza ?? null);
      if (status === "ok") continue;
      entries.push({
        kind: "allenatore",
        subject: `${c.cognome} ${c.nome}`,
        subject_id: c.id,
        squadra: teamLabel,
        cert_label: t.label,
        status,
        data_scadenza: cert?.data_scadenza ?? null,
      });
    }
  }

  // Ordina: scaduto > mancante > in_scadenza
  const rank: Record<CertificateStatus, number> = {
    scaduto: 3,
    mancante: 2,
    in_scadenza: 1,
    ok: 0,
  };
  entries.sort((a, b) => rank[b.status] - rank[a.status]);

  return entries;
}

export async function fetchAlertCounts() {
  const entries = await fetchCriticalEntries();
  return {
    scaduti: entries.filter((e) => e.status === "scaduto").length,
    inScadenza: entries.filter((e) => e.status === "in_scadenza").length,
    mancanti: entries.filter((e) => e.status === "mancante").length,
  };
}

