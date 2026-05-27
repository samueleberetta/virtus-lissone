import { PageHeader } from "@/components/layout/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { requireUser, canManageData } from "@/lib/utils/auth";
import { createTrainingSession, saveAttendance } from "@/lib/actions/attendance";
import { formatDate } from "@/lib/utils/format";
import { fetchCurrentSeasonId } from "@/lib/queries/alerts";

export default async function PresenzePage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; team?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const supabase = await createClient();
  const seasonId = await fetchCurrentSeasonId();

  const { data: teams } = await supabase
    .from("teams")
    .select("id, nome")
    .order("ordine");

  const { data: sessions } = await supabase
    .from("training_sessions")
    .select("*, teams(nome)")
    .eq("season_id", seasonId ?? "")
    .order("data", { ascending: false })
    .limit(30);

  const openSession = params.session
    ? await supabase
        .from("training_sessions")
        .select("*, teams(nome)")
        .eq("id", params.session)
        .maybeSingle()
    : null;

  let athletesInTeam: {
    athlete_id: string;
    athletes: { id: string; nome: string; cognome: string };
  }[] = [];
  const currentAttendance: Record<string, string> = {};
  if (openSession?.data) {
    const session = openSession.data as unknown as { team_id: string; id: string };
    const { data: ath } = await supabase
      .from("athlete_seasons")
      .select("athlete_id, athletes(id, nome, cognome)")
      .eq("season_id", seasonId ?? "")
      .eq("team_id", session.team_id);
    athletesInTeam = (ath ?? []) as unknown as typeof athletesInTeam;

    const { data: att } = await supabase
      .from("attendance")
      .select("athlete_id, stato")
      .eq("session_id", session.id);
    for (const a of att ?? []) {
      currentAttendance[a.athlete_id] = a.stato;
    }
  }

  return (
    <div>
      <PageHeader
        title="Registro presenze allenamenti"
        description="Crea sessioni di allenamento e segna le presenze."
      />

      {canManageData(user.ruolo) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Nuova sessione</CardTitle>
          </CardHeader>
          <CardBody>
            <form
              action={createTrainingSession}
              className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end"
            >
              <div>
                <Label htmlFor="team_id" required>Squadra</Label>
                <Select id="team_id" name="team_id" required>
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
                <Label htmlFor="orario_inizio">Inizio</Label>
                <Input id="orario_inizio" name="orario_inizio" type="time" />
              </div>
              <div>
                <Label htmlFor="orario_fine">Fine</Label>
                <Input id="orario_fine" name="orario_fine" type="time" />
              </div>
              <div>
                <Label htmlFor="luogo">Luogo</Label>
                <Input id="luogo" name="luogo" />
              </div>
              <div className="md:col-span-5 flex justify-end">
                <Button type="submit">Crea sessione</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {openSession?.data && (
        <Card className="mb-6 border-virtus-yellow">
          <CardHeader>
            <CardTitle>
              Presenze — {(openSession.data as unknown as { teams: { nome: string } }).teams?.nome} ·{" "}
              {formatDate((openSession.data as unknown as { data: string }).data)}
            </CardTitle>
          </CardHeader>
          <CardBody>
            {canManageData(user.ruolo) ? (
              <form action={saveAttendance} className="space-y-3">
                <input type="hidden" name="session_id" value={params.session!} />
                <div className="divide-y divide-neutral-100">
                  {athletesInTeam.map((a) => {
                    const current = currentAttendance[a.athlete_id] ?? "presente";
                    return (
                      <div
                        key={a.athlete_id}
                        className="flex items-center justify-between py-2"
                      >
                        <div className="text-sm">
                          {a.athletes.cognome} {a.athletes.nome}
                        </div>
                        <div className="flex gap-3 text-xs">
                          <input type="hidden" name="athlete_id" value={a.athlete_id} />
                          {(["presente", "assente", "giustificato"] as const).map((s) => (
                            <label key={s} className="flex items-center gap-1">
                              <input
                                type="radio"
                                name={`stato_${a.athlete_id}`}
                                value={s}
                                defaultChecked={current === s}
                              />
                              {s}
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-end">
                  <Button type="submit">Salva presenze</Button>
                </div>
              </form>
            ) : (
              <Table>
                <THead>
                  <TR><TH>Atleta</TH><TH>Stato</TH></TR>
                </THead>
                <TBody>
                  {athletesInTeam.map((a) => (
                    <TR key={a.athlete_id}>
                      <TD>{a.athletes.cognome} {a.athletes.nome}</TD>
                      <TD>
                        <Badge
                          variant={
                            currentAttendance[a.athlete_id] === "presente"
                              ? "green"
                              : currentAttendance[a.athlete_id] === "giustificato"
                                ? "yellow"
                                : "red"
                          }
                        >
                          {currentAttendance[a.athlete_id] ?? "—"}
                        </Badge>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Sessioni recenti</CardTitle>
        </CardHeader>
        {(sessions ?? []).length === 0 ? (
          <EmptyState message="Nessuna sessione registrata." />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Data</TH>
                <TH>Squadra</TH>
                <TH>Luogo</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {((sessions ?? []) as unknown as {
                id: string;
                data: string;
                luogo: string | null;
                orario_inizio: string | null;
                teams: { nome: string } | null;
              }[]).map((s) => (
                <TR key={s.id}>
                  <TD>
                    <div className="font-medium">{formatDate(s.data)}</div>
                    <div className="text-xs text-neutral-500">{s.orario_inizio ?? ""}</div>
                  </TD>
                  <TD>{s.teams?.nome}</TD>
                  <TD className="text-neutral-600">{s.luogo ?? "—"}</TD>
                  <TD>
                    <a
                      href={`/presenze?session=${s.id}`}
                      className="text-sm text-virtus-red hover:underline"
                    >
                      Apri
                    </a>
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
