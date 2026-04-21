import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/table";
import { Semaforo, SemaforoDot } from "@/components/ui/semaforo";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { requireUser, canManageData } from "@/lib/utils/auth";
import { certificateStatus, certificateStatusRank } from "@/lib/utils/certificates";
import { computeAge, formatDate } from "@/lib/utils/format";
import { fetchCurrentSeasonId } from "@/lib/queries/alerts";
import type { CertificateStatus } from "@/lib/types/database";

interface AthleteRow {
  id: string;
  nome: string;
  cognome: string;
  data_nascita: string;
  stato: "attivo" | "sospeso" | "ritirato";
  team_id: string;
  team_name: string;
  numero_maglia: number | null;
  cert_status: CertificateStatus;
  cert_scadenza: string | null;
}

export default async function AtletiPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string; q?: string; stato?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const supabase = await createClient();
  const seasonId = await fetchCurrentSeasonId();

  const { data: teams } = await supabase
    .from("teams")
    .select("id, nome")
    .order("ordine");

  let query = supabase
    .from("athlete_seasons")
    .select(
      `
      team_id,
      numero_maglia,
      teams ( nome ),
      athletes (
        id, nome, cognome, data_nascita, stato,
        documents ( tipo, data_scadenza )
      )
    `,
    )
    .eq("season_id", seasonId ?? "");

  if (params.team) query = query.eq("team_id", params.team);

  const { data: rows } = await query;

  let athletes: AthleteRow[] = (rows ?? [])
    .map((r) => {
      const row = r as unknown as {
        team_id: string;
        numero_maglia: number | null;
        teams: { nome: string } | null;
        athletes: {
          id: string;
          nome: string;
          cognome: string;
          data_nascita: string;
          stato: "attivo" | "sospeso" | "ritirato";
          documents: { tipo: string; data_scadenza: string | null }[] | null;
        } | null;
      };
      const a = row.athletes;
      if (!a) return null;
      const med = (a.documents ?? []).find((d) => d.tipo === "certificato_medico");
      return {
        id: a.id,
        nome: a.nome,
        cognome: a.cognome,
        data_nascita: a.data_nascita,
        stato: a.stato,
        team_id: row.team_id,
        team_name: row.teams?.nome ?? "—",
        numero_maglia: row.numero_maglia,
        cert_status: certificateStatus(med?.data_scadenza ?? null),
        cert_scadenza: med?.data_scadenza ?? null,
      };
    })
    .filter(Boolean) as AthleteRow[];

  if (params.q) {
    const q = params.q.toLowerCase();
    athletes = athletes.filter(
      (a) =>
        a.nome.toLowerCase().includes(q) || a.cognome.toLowerCase().includes(q),
    );
  }
  if (params.stato) {
    athletes = athletes.filter((a) => a.stato === params.stato);
  }

  athletes.sort((a, b) => {
    const rank = certificateStatusRank(b.cert_status) - certificateStatusRank(a.cert_status);
    if (rank !== 0) return rank;
    return a.cognome.localeCompare(b.cognome);
  });

  return (
    <div>
      <PageHeader
        title="Atleti"
        description={`${athletes.length} atlet${athletes.length === 1 ? "a" : "i"} nella stagione corrente`}
        actions={
          canManageData(user.ruolo) && (
            <Link href="/atleti/nuovo">
              <Button>
                <Plus className="h-4 w-4" /> Nuovo atleta
              </Button>
            </Link>
          )
        }
      />

      <Card className="mb-4">
        <form className="p-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">
              Squadra
            </label>
            <select
              name="team"
              defaultValue={params.team ?? ""}
              className="h-9 rounded-md border border-neutral-300 px-2 text-sm"
            >
              <option value="">Tutte</option>
              {(teams ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">
              Stato
            </label>
            <select
              name="stato"
              defaultValue={params.stato ?? ""}
              className="h-9 rounded-md border border-neutral-300 px-2 text-sm"
            >
              <option value="">Tutti</option>
              <option value="attivo">Attivo</option>
              <option value="sospeso">Sospeso</option>
              <option value="ritirato">Ritirato</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-neutral-600 mb-1">
              Cerca
            </label>
            <input
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="Nome o cognome"
              className="h-9 w-full rounded-md border border-neutral-300 px-3 text-sm"
            />
          </div>
          <Button type="submit" variant="outline" size="sm">
            Filtra
          </Button>
          {seasonId && (
            <a
              href={`/api/export/excel?season=${seasonId}${params.team ? `&team=${params.team}` : ""}`}
              className="text-sm text-virtus-red hover:underline"
            >
              Export Excel
            </a>
          )}
          {seasonId && params.team && (
            <a
              href={`/api/export/pdf?season=${seasonId}&team=${params.team}`}
              className="text-sm text-virtus-red hover:underline"
            >
              Export PDF
            </a>
          )}
        </form>
      </Card>

      <Card>
        {athletes.length === 0 ? (
          <EmptyState message="Nessun atleta trovato." />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Cognome e nome</TH>
                <TH>Squadra</TH>
                <TH>N°</TH>
                <TH>Età</TH>
                <TH>Certificato medico</TH>
                <TH>Stato</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {athletes.map((a) => (
                <TR key={a.id}>
                  <TD>
                    <div className="flex items-center gap-2">
                      <SemaforoDot status={a.cert_status} />
                      <Link
                        href={`/atleti/${a.id}`}
                        className="font-medium text-neutral-900 hover:text-virtus-red"
                      >
                        {a.cognome} {a.nome}
                      </Link>
                    </div>
                  </TD>
                  <TD className="text-neutral-600">{a.team_name}</TD>
                  <TD className="text-neutral-600">{a.numero_maglia ?? "—"}</TD>
                  <TD className="text-neutral-600">{computeAge(a.data_nascita)}</TD>
                  <TD>
                    <div className="flex items-center gap-2">
                      <Semaforo status={a.cert_status} />
                      <span className="text-xs text-neutral-500">
                        {a.cert_scadenza ? formatDate(a.cert_scadenza) : ""}
                      </span>
                    </div>
                  </TD>
                  <TD>
                    <Badge
                      variant={
                        a.stato === "attivo"
                          ? "green"
                          : a.stato === "sospeso"
                            ? "yellow"
                            : "neutral"
                      }
                    >
                      {a.stato}
                    </Badge>
                  </TD>
                  <TD className="text-right">
                    <Link
                      href={`/atleti/${a.id}`}
                      className="text-sm text-virtus-red hover:underline"
                    >
                      Dettagli
                    </Link>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
