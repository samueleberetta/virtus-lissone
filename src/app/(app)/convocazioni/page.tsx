import { PageHeader } from "@/components/layout/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { requireUser, canManageData } from "@/lib/utils/auth";
import { createMatchWithConvocations } from "@/lib/actions/convocations";
import { formatDate } from "@/lib/utils/format";
import { fetchCurrentSeasonId } from "@/lib/queries/alerts";

export default async function ConvocazioniPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const supabase = await createClient();
  const seasonId = await fetchCurrentSeasonId();

  const { data: teams } = await supabase
    .from("teams")
    .select("id, nome")
    .order("ordine");

  // Atleti per la squadra selezionata
  const selectedTeam = params.team ?? teams?.[0]?.id ?? "";
  const { data: teamAthletes } = await supabase
    .from("athlete_seasons")
    .select("athlete_id, athletes(nome, cognome)")
    .eq("season_id", seasonId ?? "")
    .eq("team_id", selectedTeam);

  const { data: matches } = await supabase
    .from("matches")
    .select("*, teams(nome), convocations(id, convocato, athletes(nome, cognome))")
    .eq("season_id", seasonId ?? "")
    .order("data", { ascending: false })
    .limit(20);

  return (
    <div>
      <PageHeader title="Convocazioni" description="Gestione gare e atleti convocati." />

      {canManageData(user.ruolo) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Nuova convocazione</CardTitle>
          </CardHeader>
          <CardBody>
            <form action={createMatchWithConvocations} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <Label htmlFor="team_id" required>Squadra</Label>
                  <Select id="team_id" name="team_id" required defaultValue={selectedTeam}>
                    {(teams ?? []).map((t) => (
                      <option key={t.id} value={t.id}>{t.nome}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="data" required>Data</Label>
                  <Input id="data" name="data" type="date" required />
                </div>
                <div>
                  <Label htmlFor="orario">Orario</Label>
                  <Input id="orario" name="orario" type="time" />
                </div>
                <div>
                  <Label htmlFor="casa_trasferta">Casa/Trasferta</Label>
                  <Select id="casa_trasferta" name="casa_trasferta">
                    <option value="casa">Casa</option>
                    <option value="trasferta">Trasferta</option>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="luogo">Luogo</Label>
                  <Input id="luogo" name="luogo" placeholder="Campo sportivo" />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="avversario">Avversario</Label>
                  <Input id="avversario" name="avversario" />
                </div>
              </div>

              <div>
                <Label>Atleti convocati</Label>
                <div className="max-h-56 overflow-y-auto border border-neutral-200 rounded-md p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1">
                  {((teamAthletes ?? []) as unknown as {
                    athlete_id: string;
                    athletes: { nome: string; cognome: string } | null;
                  }[]).map((a) => (
                    <label key={a.athlete_id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="athlete_ids" value={a.athlete_id} />
                      {a.athletes?.cognome} {a.athletes?.nome}
                    </label>
                  ))}
                  {(teamAthletes ?? []).length === 0 && (
                    <p className="text-xs text-neutral-500 col-span-full">
                      Seleziona una squadra con atleti iscritti.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="note">Note</Label>
                <Textarea id="note" name="note" rows={2} />
              </div>

              <div className="flex justify-end">
                <Button type="submit">Crea convocazione</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Convocazioni recenti</CardTitle>
        </CardHeader>
        {(matches ?? []).length === 0 ? (
          <EmptyState message="Nessuna convocazione." />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Data</TH>
                <TH>Squadra</TH>
                <TH>Avversario</TH>
                <TH>Luogo</TH>
                <TH>Convocati</TH>
              </TR>
            </THead>
            <TBody>
              {((matches ?? []) as unknown as {
                id: string;
                data: string;
                orario: string | null;
                avversario: string | null;
                luogo: string | null;
                casa_trasferta: "casa" | "trasferta" | null;
                teams: { nome: string } | null;
                convocations: {
                  id: string;
                  convocato: boolean;
                  athletes: { nome: string; cognome: string };
                }[];
              }[]).map((m) => (
                <TR key={m.id}>
                  <TD>
                    <div className="font-medium">{formatDate(m.data)}</div>
                    <div className="text-xs text-neutral-500">{m.orario ?? ""}</div>
                  </TD>
                  <TD>{m.teams?.nome}</TD>
                  <TD>
                    {m.avversario ?? "—"}
                    {m.casa_trasferta && (
                      <Badge variant="neutral" className="ml-2">
                        {m.casa_trasferta}
                      </Badge>
                    )}
                  </TD>
                  <TD className="text-neutral-600 text-xs">{m.luogo ?? "—"}</TD>
                  <TD>
                    <div className="text-xs text-neutral-700 space-y-0.5 max-h-24 overflow-y-auto">
                      {m.convocations.filter((c) => c.convocato).map((c) => (
                        <div key={c.id}>
                          {c.athletes.cognome} {c.athletes.nome}
                        </div>
                      ))}
                      {m.convocations.length === 0 && (
                        <span className="text-neutral-400">nessun convocato</span>
                      )}
                    </div>
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
