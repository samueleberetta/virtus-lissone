import { PageHeader } from "@/components/layout/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/utils/auth";

export default async function ImpostazioniPage() {
  await requireRole(["superadmin"]);
  const supabase = await createClient();

  const [{ data: users }, { data: seasons }, { data: sports }] = await Promise.all([
    supabase.from("users").select("*").order("cognome"),
    supabase.from("seasons").select("*").order("data_inizio", { ascending: false }),
    supabase.from("sports").select("*").order("nome"),
  ]);

  return (
    <div>
      <PageHeader
        title="Impostazioni"
        description="Gestione utenti, stagioni e sport abilitati."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Utenti del gestionale</CardTitle></CardHeader>
          <Table>
            <THead>
              <TR>
                <TH>Nome</TH>
                <TH>Email</TH>
                <TH>Ruolo</TH>
                <TH>Stato</TH>
              </TR>
            </THead>
            <TBody>
              {(users ?? []).map((u) => (
                <TR key={u.id}>
                  <TD>{(u.cognome ?? "") + " " + (u.nome ?? "")}</TD>
                  <TD className="text-xs text-neutral-600">{u.email}</TD>
                  <TD>
                    <Badge variant={u.ruolo === "superadmin" ? "red" : u.ruolo === "segretario" ? "yellow" : "neutral"}>
                      {u.ruolo}
                    </Badge>
                  </TD>
                  <TD>
                    {u.attivo ? <Badge variant="green">attivo</Badge> : <Badge variant="neutral">disabilitato</Badge>}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>

        <Card>
          <CardHeader><CardTitle>Stagioni sportive</CardTitle></CardHeader>
          <Table>
            <THead>
              <TR>
                <TH>Etichetta</TH>
                <TH>Periodo</TH>
                <TH>Corrente</TH>
              </TR>
            </THead>
            <TBody>
              {(seasons ?? []).map((s) => (
                <TR key={s.id}>
                  <TD>{s.etichetta}</TD>
                  <TD className="text-xs text-neutral-600">
                    {s.data_inizio} → {s.data_fine}
                  </TD>
                  <TD>
                    {s.corrente && <Badge variant="yellow">corrente</Badge>}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>

        <Card>
          <CardHeader><CardTitle>Sport abilitati</CardTitle></CardHeader>
          <CardBody>
            <ul className="space-y-2 text-sm">
              {(sports ?? []).map((s) => (
                <li key={s.id} className="flex items-center justify-between">
                  <span className="font-medium">{s.nome}</span>
                  {s.attivo ? (
                    <Badge variant="green">attivo</Badge>
                  ) : (
                    <Badge variant="neutral">in preparazione</Badge>
                  )}
                </li>
              ))}
            </ul>
            <p className="text-xs text-neutral-500 mt-3">
              Il modulo basket è già predisposto a livello di schema e sarà attivabile nei prossimi rilasci.
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
