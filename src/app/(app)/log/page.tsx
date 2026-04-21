import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/utils/auth";

const ACTION_LABELS: Record<string, string> = {
  upload_documento: "Upload documento",
  modifica_atleta: "Modifica atleta",
  modifica_quota: "Modifica quota",
  modifica_allenatore: "Modifica allenatore",
  modifica_certificato: "Modifica certificato",
  nuova_convocazione: "Nuova convocazione",
  nuova_presenza: "Nuova presenza",
};

export default async function LogPage() {
  await requireRole(["superadmin"]);
  const supabase = await createClient();
  const { data: logs } = await supabase
    .from("activity_logs")
    .select("*, users(nome, cognome, email)")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div>
      <PageHeader
        title="Log attività"
        description="Ultime 200 azioni registrate sul gestionale."
      />
      <Card>
        {(logs ?? []).length === 0 ? (
          <EmptyState message="Nessuna attività registrata." />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Data/ora</TH>
                <TH>Utente</TH>
                <TH>Azione</TH>
                <TH>Descrizione</TH>
              </TR>
            </THead>
            <TBody>
              {((logs ?? []) as unknown as {
                id: string;
                created_at: string;
                azione: string;
                descrizione: string | null;
                users: { nome: string | null; cognome: string | null; email: string } | null;
              }[]).map((l) => (
                <TR key={l.id}>
                  <TD className="text-xs text-neutral-600">
                    {new Date(l.created_at).toLocaleString("it-IT")}
                  </TD>
                  <TD className="text-sm">
                    {l.users
                      ? `${l.users.cognome ?? ""} ${l.users.nome ?? ""}`.trim() || l.users.email
                      : "—"}
                  </TD>
                  <TD>
                    <Badge variant="default">{ACTION_LABELS[l.azione] ?? l.azione}</Badge>
                  </TD>
                  <TD className="text-sm text-neutral-700">{l.descrizione ?? "—"}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
