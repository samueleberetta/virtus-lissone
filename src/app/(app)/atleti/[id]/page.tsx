import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Semaforo } from "@/components/ui/semaforo";
import { Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import { requireUser, canManageData } from "@/lib/utils/auth";
import { AthleteForm } from "@/components/athletes/athlete-form";
import { updateAthlete } from "@/lib/actions/athletes";
import { DOCUMENT_KIND_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/constants";
import {
  certificateStatus,
  certificateStatusLabel,
} from "@/lib/utils/certificates";
import {
  computeAge,
  formatCurrency,
  formatDate,
  isMinorenne,
} from "@/lib/utils/format";
import type { Document, Payment, Team } from "@/lib/types/database";
import { fetchCurrentSeasonId } from "@/lib/queries/alerts";

export default async function AtletaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();
  const seasonId = await fetchCurrentSeasonId();

  const { data: athlete } = await supabase
    .from("athletes")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!athlete) notFound();

  const [
    { data: teams },
    { data: currentSeason },
    { data: documents },
    { data: payments },
    { data: allSeasons },
  ] = await Promise.all([
    supabase.from("teams").select("*").order("ordine"),
    seasonId
      ? supabase
          .from("athlete_seasons")
          .select("team_id, numero_maglia")
          .eq("athlete_id", id)
          .eq("season_id", seasonId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("documents")
      .select("*")
      .eq("athlete_id", id)
      .order("created_at", { ascending: false }),
    seasonId
      ? supabase
          .from("payments")
          .select("*")
          .eq("athlete_id", id)
          .eq("season_id", seasonId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("athlete_seasons")
      .select("season_id, team_id, numero_maglia, seasons(etichetta), teams(nome)")
      .eq("athlete_id", id),
  ]);

  const medical = (documents as Document[] | null)?.find(
    (d) => d.tipo === "certificato_medico",
  );
  const medStatus = certificateStatus(medical?.data_scadenza ?? null);
  const age = computeAge(athlete.data_nascita);
  const canEdit = canManageData(user.ruolo);
  const payment = payments as Payment | null;

  return (
    <div>
      <PageHeader
        title={`${athlete.cognome} ${athlete.nome}`}
        description={`${age} anni · ${isMinorenne(athlete.data_nascita) ? "Minorenne" : "Maggiorenne"}`}
        actions={
          <Link href="/atleti" className="text-sm text-neutral-600 hover:text-virtus-red">
            ← Lista
          </Link>
        }
      />

      <div className="flex items-center gap-2 mb-4">
        <Badge
          variant={
            athlete.stato === "attivo"
              ? "green"
              : athlete.stato === "sospeso"
                ? "yellow"
                : "neutral"
          }
        >
          {athlete.stato}
        </Badge>
        <Semaforo status={medStatus} label={`Certificato medico: ${certificateStatusLabel(medStatus)}`} />
        {athlete.consenso_gdpr && (
          <Badge variant="green">GDPR firmato ({formatDate(athlete.data_consenso_gdpr)})</Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Documenti */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Documenti</CardTitle>
                {canEdit && (
                  <Link href={`/documenti?atleta=${id}`} className="text-sm text-virtus-red hover:underline">
                    Gestisci →
                  </Link>
                )}
              </div>
            </CardHeader>
            {(documents ?? []).length === 0 ? (
              <EmptyState message="Nessun documento caricato." />
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Tipo</TH>
                    <TH>File</TH>
                    <TH>Scadenza</TH>
                    <TH>Stato</TH>
                  </TR>
                </THead>
                <TBody>
                  {((documents as Document[]) ?? []).map((d) => {
                    const status = certificateStatus(d.data_scadenza);
                    return (
                      <TR key={d.id}>
                        <TD>
                          {DOCUMENT_KIND_LABELS[d.tipo]}
                          {d.etichetta && (
                            <span className="text-xs text-neutral-500 block">
                              {d.etichetta}
                            </span>
                          )}
                        </TD>
                        <TD className="text-neutral-600 text-xs">
                          {d.file_name ?? "—"}
                        </TD>
                        <TD>{formatDate(d.data_scadenza)}</TD>
                        <TD>
                          {d.tipo === "certificato_medico" ? (
                            <Semaforo status={status} />
                          ) : (
                            <span className="text-xs text-neutral-500">—</span>
                          )}
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            )}
          </Card>

          {/* Quote */}
          {canManageData(user.ruolo) && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Quota stagione corrente</CardTitle>
                  <Link href="/quote" className="text-sm text-virtus-red hover:underline">
                    Gestisci →
                  </Link>
                </div>
              </CardHeader>
              <CardBody>
                {!payment ? (
                  <p className="text-sm text-neutral-500">Nessuna quota impostata.</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-neutral-500">Totale</div>
                      <div className="font-semibold">{formatCurrency(payment.importo_totale)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-neutral-500">Modalità</div>
                      <div>{payment.modalita === "unico" ? "Unica soluzione" : "Rate"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-neutral-500">Stato</div>
                      <Badge
                        variant={
                          payment.stato === "pagato"
                            ? "green"
                            : payment.stato === "parziale"
                              ? "yellow"
                              : "red"
                        }
                      >
                        {payment.stato.replace("_", " ")}
                      </Badge>
                    </div>
                    {payment.modalita === "unico" && payment.unico_data && (
                      <div>
                        <div className="text-xs text-neutral-500">Pagato il</div>
                        <div>
                          {formatDate(payment.unico_data)}{" "}
                          <span className="text-xs text-neutral-500">
                            ({payment.unico_metodo && PAYMENT_METHOD_LABELS[payment.unico_metodo]})
                          </span>
                        </div>
                      </div>
                    )}
                    {payment.modalita === "rate" && (
                      <>
                        <div>
                          <div className="text-xs text-neutral-500">Rata 1</div>
                          <div>
                            {payment.rata1_data ? "✓ " + formatDate(payment.rata1_data) : "✗"}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-neutral-500">Rata 2</div>
                          <div>
                            {payment.rata2_data ? "✓ " + formatDate(payment.rata2_data) : "✗"}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {/* Storico squadre */}
          <Card>
            <CardHeader>
              <CardTitle>Storico squadre</CardTitle>
            </CardHeader>
            {(allSeasons ?? []).length === 0 ? (
              <EmptyState message="Nessuna stagione." />
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Stagione</TH>
                    <TH>Squadra</TH>
                    <TH>N°</TH>
                  </TR>
                </THead>
                <TBody>
                  {(allSeasons as unknown as {
                    season_id: string;
                    numero_maglia: number | null;
                    seasons: { etichetta: string } | null;
                    teams: { nome: string } | null;
                  }[]).map((s) => (
                    <TR key={s.season_id}>
                      <TD>{s.seasons?.etichetta ?? "—"}</TD>
                      <TD>{s.teams?.nome ?? "—"}</TD>
                      <TD>{s.numero_maglia ?? "—"}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </Card>
        </div>

        {/* Sidebar: dati contatto + modifica */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contatti</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2 text-sm">
              <Row label="Email" value={athlete.email} />
              <Row label="Telefono" value={athlete.telefono} />
              <Row
                label="Indirizzo"
                value={
                  [athlete.indirizzo, athlete.cap, athlete.citta, athlete.provincia]
                    .filter(Boolean)
                    .join(", ") || null
                }
              />
              <Row label="Codice fiscale" value={athlete.codice_fiscale} />
              <hr className="my-2" />
              <div className="text-xs font-semibold text-neutral-500 uppercase">
                Genitore / tutore
              </div>
              <Row label="Nome" value={athlete.genitore_nome} />
              <Row label="Email" value={athlete.genitore_email} />
              <Row label="Telefono" value={athlete.genitore_telefono} />
            </CardBody>
          </Card>
        </div>
      </div>

      {canEdit && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-neutral-900 mb-3">Modifica scheda</h3>
          <AthleteForm
            teams={(teams ?? []) as Team[]}
            initial={{
              ...athlete,
              team_id: (currentSeason as { team_id?: string } | null)?.team_id ?? null,
              numero_maglia: (currentSeason as { numero_maglia?: number } | null)?.numero_maglia ?? null,
            }}
            action={async (fd) => {
              "use server";
              await updateAthlete(id, fd);
            }}
          />
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-neutral-500">{label}</span>
      <span className="text-neutral-800 text-right">{value ?? "—"}</span>
    </div>
  );
}
