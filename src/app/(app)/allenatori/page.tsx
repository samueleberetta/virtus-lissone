import { PageHeader } from "@/components/layout/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/table";
import { Semaforo } from "@/components/ui/semaforo";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/utils/auth";
import { certificateStatus } from "@/lib/utils/certificates";
import { formatDate } from "@/lib/utils/format";
import { COACH_ROLE_LABELS } from "@/lib/constants";
import { saveCoach, setCoachTeamRole } from "@/lib/actions/coaches";
import { fetchCurrentSeasonId } from "@/lib/queries/alerts";

export default async function AllenatoriPage() {
  await requireRole(["superadmin"]);
  const supabase = await createClient();
  const seasonId = await fetchCurrentSeasonId();

  const [{ data: coaches }, { data: teams }] = await Promise.all([
    supabase
      .from("coaches")
      .select(
        `
        id, nome, cognome, email, telefono,
        coach_certificates ( tipo, data_scadenza ),
        coach_team_roles ( id, team_id, season_id, ruolo, teams(nome) )
      `,
      )
      .order("cognome"),
    supabase.from("teams").select("id, nome").order("ordine"),
  ]);

  type CoachRow = {
    id: string;
    nome: string;
    cognome: string;
    email: string | null;
    telefono: string | null;
    coach_certificates: { tipo: "dae" | "patentino_csi"; data_scadenza: string }[];
    coach_team_roles: {
      id: string;
      team_id: string;
      season_id: string;
      ruolo: "principale" | "secondo" | "dirigente";
      teams: { nome: string } | null;
    }[];
  };

  return (
    <div>
      <PageHeader
        title="Allenatori"
        description="Gestione allenatori, dirigenti e certificati (DAE, patentino CSI)."
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Nuovo / modifica allenatore</CardTitle>
        </CardHeader>
        <CardBody>
          <form action={saveCoach} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
            <div className="md:col-span-1">
              <Label htmlFor="nome" required>Nome</Label>
              <Input id="nome" name="nome" required />
            </div>
            <div className="md:col-span-1">
              <Label htmlFor="cognome" required>Cognome</Label>
              <Input id="cognome" name="cognome" required />
            </div>
            <div className="md:col-span-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" />
            </div>
            <div className="md:col-span-1">
              <Label htmlFor="telefono">Telefono</Label>
              <Input id="telefono" name="telefono" />
            </div>
            <div>
              <Label htmlFor="dae_scadenza">Scad. DAE</Label>
              <Input id="dae_scadenza" name="dae_scadenza" type="date" />
            </div>
            <div>
              <Label htmlFor="patentino_scadenza">Scad. Patentino CSI</Label>
              <Input id="patentino_scadenza" name="patentino_scadenza" type="date" />
            </div>
            <div className="md:col-span-6 flex justify-end">
              <Button type="submit">Salva allenatore</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Elenco allenatori</CardTitle>
        </CardHeader>
        {(coaches ?? []).length === 0 ? (
          <EmptyState message="Nessun allenatore ancora inserito." />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Cognome e nome</TH>
                <TH>Contatti</TH>
                <TH>Squadra / ruolo</TH>
                <TH>DAE</TH>
                <TH>Patentino CSI</TH>
                <TH>Assegnazione</TH>
              </TR>
            </THead>
            <TBody>
              {((coaches ?? []) as unknown as CoachRow[]).map((c) => {
                const dae = c.coach_certificates.find((x) => x.tipo === "dae");
                const pat = c.coach_certificates.find((x) => x.tipo === "patentino_csi");
                const daeStatus = certificateStatus(dae?.data_scadenza ?? null);
                const patStatus = certificateStatus(pat?.data_scadenza ?? null);
                return (
                  <TR key={c.id}>
                    <TD>
                      <div className="font-medium">{c.cognome} {c.nome}</div>
                    </TD>
                    <TD className="text-xs text-neutral-600">
                      {c.email && <div>{c.email}</div>}
                      {c.telefono && <div>{c.telefono}</div>}
                    </TD>
                    <TD>
                      <div className="space-y-1">
                        {c.coach_team_roles
                          .filter((r) => !seasonId || r.season_id === seasonId)
                          .map((r) => (
                            <div key={r.id} className="flex items-center gap-2">
                              <Badge variant="default">{r.teams?.nome}</Badge>
                              <span className="text-xs text-neutral-600">
                                {COACH_ROLE_LABELS[r.ruolo]}
                              </span>
                            </div>
                          ))}
                        {c.coach_team_roles.filter((r) => !seasonId || r.season_id === seasonId).length === 0 && (
                          <span className="text-xs text-neutral-400">nessuna assegnazione</span>
                        )}
                      </div>
                    </TD>
                    <TD>
                      <div className="flex flex-col gap-1">
                        <Semaforo status={daeStatus} />
                        <span className="text-xs text-neutral-500">
                          {dae?.data_scadenza ? formatDate(dae.data_scadenza) : "—"}
                        </span>
                      </div>
                    </TD>
                    <TD>
                      <div className="flex flex-col gap-1">
                        <Semaforo status={patStatus} />
                        <span className="text-xs text-neutral-500">
                          {pat?.data_scadenza ? formatDate(pat.data_scadenza) : "—"}
                        </span>
                      </div>
                    </TD>
                    <TD>
                      {seasonId && (
                        <form action={setCoachTeamRole} className="flex flex-col gap-1">
                          <input type="hidden" name="coach_id" value={c.id} />
                          <input type="hidden" name="season_id" value={seasonId} />
                          <div className="flex items-center gap-1">
                            <select
                              name="team_id"
                              required
                              className="h-8 rounded border border-neutral-300 text-xs px-1"
                            >
                              <option value="">Squadra...</option>
                              {(teams ?? []).map((t) => (
                                <option key={t.id} value={t.id}>{t.nome}</option>
                              ))}
                            </select>
                            <select
                              name="ruolo"
                              required
                              className="h-8 rounded border border-neutral-300 text-xs px-1"
                            >
                              <option value="principale">Principale</option>
                              <option value="secondo">In seconda</option>
                              <option value="dirigente">Dirigente</option>
                            </select>
                            <Button type="submit" size="sm" variant="outline">+</Button>
                          </div>
                        </form>
                      )}
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
