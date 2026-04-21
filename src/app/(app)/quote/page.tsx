import { PageHeader } from "@/components/layout/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/utils/auth";
import { savePayment } from "@/lib/actions/payments";
import { fetchCurrentSeasonId } from "@/lib/queries/alerts";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { Check, X } from "lucide-react";

export default async function QuotePage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string; edit?: string }>;
}) {
  await requireRole(["superadmin", "segretario"]);
  const params = await searchParams;
  const supabase = await createClient();
  const seasonId = await fetchCurrentSeasonId();

  const [{ data: teams }, { data: rows }] = await Promise.all([
    supabase.from("teams").select("id, nome").order("ordine"),
    supabase
      .from("athlete_seasons")
      .select(
        `
        athlete_id,
        team_id,
        teams (nome),
        athletes (id, nome, cognome,
          payments!payments_athlete_id_fkey (
            id, season_id, importo_totale, modalita, stato,
            unico_importo, unico_data, unico_metodo,
            rata1_importo, rata1_data, rata1_metodo,
            rata2_importo, rata2_data, rata2_metodo, note
          )
        )
      `,
      )
      .eq("season_id", seasonId ?? "")
      .order("cognome", { foreignTable: "athletes" }),
  ]);

  type Row = {
    athlete_id: string;
    team_id: string;
    teams: { nome: string } | null;
    athletes: {
      id: string;
      nome: string;
      cognome: string;
      payments: {
        id: string;
        season_id: string;
        importo_totale: number;
        modalita: "unico" | "rate";
        stato: "non_pagato" | "parziale" | "pagato";
        unico_data: string | null;
        unico_importo: number | null;
        unico_metodo: "contanti" | "bonifico" | null;
        rata1_data: string | null;
        rata1_importo: number | null;
        rata1_metodo: "contanti" | "bonifico" | null;
        rata2_data: string | null;
        rata2_importo: number | null;
        rata2_metodo: "contanti" | "bonifico" | null;
        note: string | null;
      }[];
    } | null;
  };

  let data = (rows ?? []) as unknown as Row[];
  if (params.team) data = data.filter((r) => r.team_id === params.team);

  const totals = data.reduce(
    (acc, r) => {
      const p = r.athletes?.payments?.find((x) => x.season_id === seasonId);
      if (p?.stato === "pagato") acc.pagato++;
      else if (p?.stato === "parziale") acc.parziale++;
      else acc.nonPagato++;
      return acc;
    },
    { pagato: 0, parziale: 0, nonPagato: 0 },
  );

  const editAthlete = params.edit
    ? data.find((r) => r.athlete_id === params.edit)
    : null;
  const editPayment =
    editAthlete?.athletes?.payments?.find((x) => x.season_id === seasonId) ?? null;

  return (
    <div>
      <PageHeader
        title="Quote di iscrizione"
        description="Gestione delle quote per la stagione corrente."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <KpiSmall label="Pagato per intero" value={totals.pagato} tone="green" />
        <KpiSmall label="Prima rata versata" value={totals.parziale} tone="yellow" />
        <KpiSmall label="Non ancora pagato" value={totals.nonPagato} tone="red" />
      </div>

      <Card className="mb-6">
        <form className="p-4 flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Squadra</label>
            <select
              name="team"
              defaultValue={params.team ?? ""}
              className="h-9 rounded-md border border-neutral-300 px-2 text-sm"
            >
              <option value="">Tutte</option>
              {(teams ?? []).map((t) => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
          </div>
          <Button type="submit" variant="outline" size="sm">Filtra</Button>
        </form>
      </Card>

      {editAthlete && (
        <Card className="mb-6 border-virtus-yellow">
          <CardHeader>
            <CardTitle>
              Modifica quota: {editAthlete.athletes?.cognome} {editAthlete.athletes?.nome}
            </CardTitle>
          </CardHeader>
          <CardBody>
            <form action={savePayment} className="space-y-4">
              <input type="hidden" name="athlete_id" value={editAthlete.athlete_id} />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label required>Importo totale</Label>
                  <Input
                    name="importo_totale"
                    type="number"
                    step="0.01"
                    required
                    defaultValue={editPayment?.importo_totale ?? ""}
                  />
                </div>
                <div>
                  <Label required>Modalità</Label>
                  <Select name="modalita" defaultValue={editPayment?.modalita ?? "unico"}>
                    <option value="unico">Pagamento unico</option>
                    <option value="rate">A rate</option>
                  </Select>
                </div>
              </div>

              <div className="rounded border border-neutral-200 p-3">
                <div className="text-sm font-semibold mb-2">Pagamento unico</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Importo</Label>
                    <Input
                      name="unico_importo"
                      type="number"
                      step="0.01"
                      defaultValue={editPayment?.unico_importo ?? ""}
                    />
                  </div>
                  <div>
                    <Label>Data pagamento</Label>
                    <Input name="unico_data" type="date" defaultValue={editPayment?.unico_data ?? ""} />
                  </div>
                  <div>
                    <Label>Metodo</Label>
                    <Select name="unico_metodo" defaultValue={editPayment?.unico_metodo ?? ""}>
                      <option value="">—</option>
                      <option value="contanti">Contanti</option>
                      <option value="bonifico">Bonifico</option>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="rounded border border-neutral-200 p-3">
                <div className="text-sm font-semibold mb-2">Rate</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <div>
                    <Label>Rata 1 — importo</Label>
                    <Input
                      name="rata1_importo"
                      type="number"
                      step="0.01"
                      defaultValue={editPayment?.rata1_importo ?? ""}
                    />
                  </div>
                  <div>
                    <Label>Rata 1 — data</Label>
                    <Input name="rata1_data" type="date" defaultValue={editPayment?.rata1_data ?? ""} />
                  </div>
                  <div>
                    <Label>Rata 1 — metodo</Label>
                    <Select name="rata1_metodo" defaultValue={editPayment?.rata1_metodo ?? ""}>
                      <option value="">—</option>
                      <option value="contanti">Contanti</option>
                      <option value="bonifico">Bonifico</option>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Rata 2 — importo</Label>
                    <Input
                      name="rata2_importo"
                      type="number"
                      step="0.01"
                      defaultValue={editPayment?.rata2_importo ?? ""}
                    />
                  </div>
                  <div>
                    <Label>Rata 2 — data</Label>
                    <Input name="rata2_data" type="date" defaultValue={editPayment?.rata2_data ?? ""} />
                  </div>
                  <div>
                    <Label>Rata 2 — metodo</Label>
                    <Select name="rata2_metodo" defaultValue={editPayment?.rata2_metodo ?? ""}>
                      <option value="">—</option>
                      <option value="contanti">Contanti</option>
                      <option value="bonifico">Bonifico</option>
                    </Select>
                  </div>
                </div>
              </div>

              <div>
                <Label>Note</Label>
                <Textarea name="note" rows={2} defaultValue={editPayment?.note ?? ""} />
              </div>

              <div className="flex justify-end gap-2">
                <a href="/quote" className="text-sm text-neutral-600 self-center hover:text-virtus-red">
                  Annulla
                </a>
                <Button type="submit">Salva quota</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Quote per atleta</CardTitle>
        </CardHeader>
        {data.length === 0 ? (
          <EmptyState message="Nessun atleta nella stagione corrente." />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Atleta</TH>
                <TH>Squadra</TH>
                <TH>Totale</TH>
                <TH>Unico</TH>
                <TH>Rata 1</TH>
                <TH>Rata 2</TH>
                <TH>Stato</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {data.map((r) => {
                const p = r.athletes?.payments?.find((x) => x.season_id === seasonId);
                return (
                  <TR key={r.athlete_id}>
                    <TD className="font-medium">
                      {r.athletes?.cognome} {r.athletes?.nome}
                    </TD>
                    <TD className="text-neutral-600">{r.teams?.nome}</TD>
                    <TD>{formatCurrency(p?.importo_totale ?? 0)}</TD>
                    <TD>
                      {p?.modalita === "unico" && p.unico_data ? (
                        <span className="text-green-700 flex items-center gap-1">
                          <Check className="h-4 w-4" /> {formatDate(p.unico_data)}
                        </span>
                      ) : (
                        <X className="h-4 w-4 text-neutral-300" />
                      )}
                    </TD>
                    <TD>
                      {p?.modalita === "rate" && p.rata1_data ? (
                        <span className="text-green-700 flex items-center gap-1">
                          <Check className="h-4 w-4" /> {formatDate(p.rata1_data)}
                        </span>
                      ) : (
                        <X className="h-4 w-4 text-neutral-300" />
                      )}
                    </TD>
                    <TD>
                      {p?.modalita === "rate" && p.rata2_data ? (
                        <span className="text-green-700 flex items-center gap-1">
                          <Check className="h-4 w-4" /> {formatDate(p.rata2_data)}
                        </span>
                      ) : (
                        <X className="h-4 w-4 text-neutral-300" />
                      )}
                    </TD>
                    <TD>
                      <Badge
                        variant={
                          p?.stato === "pagato"
                            ? "green"
                            : p?.stato === "parziale"
                              ? "yellow"
                              : "red"
                        }
                      >
                        {p?.stato?.replace("_", " ") ?? "non pagato"}
                      </Badge>
                    </TD>
                    <TD>
                      <a
                        href={`/quote?edit=${r.athlete_id}${params.team ? `&team=${params.team}` : ""}`}
                        className="text-sm text-virtus-red hover:underline"
                      >
                        Modifica
                      </a>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

function KpiSmall({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "yellow" | "red";
}) {
  const colorMap = {
    green: "text-green-700 border-green-200",
    yellow: "text-yellow-700 border-yellow-200",
    red: "text-virtus-red border-red-200",
  } as const;
  return (
    <div className={`rounded-lg border bg-white shadow-sm px-5 py-4 ${colorMap[tone]}`}>
      <div className="text-xs font-medium text-neutral-500 uppercase">{label}</div>
      <div className="text-3xl font-bold mt-1">{value}</div>
    </div>
  );
}
