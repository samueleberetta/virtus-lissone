import { PageHeader } from "@/components/layout/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/table";
import { Semaforo } from "@/components/ui/semaforo";
import { createClient } from "@/lib/supabase/server";
import { requireUser, canManageData } from "@/lib/utils/auth";
import { uploadDocument } from "@/lib/actions/documents";
import { DOCUMENT_KIND_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils/format";
import { certificateStatus } from "@/lib/utils/certificates";
import type { Document } from "@/lib/types/database";

export default async function DocumentiPage({
  searchParams,
}: {
  searchParams: Promise<{ atleta?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const supabase = await createClient();

  const { data: athletes } = await supabase
    .from("athletes")
    .select("id, nome, cognome")
    .order("cognome");

  let documentsQuery = supabase
    .from("documents")
    .select("*, athletes(nome, cognome)")
    .order("created_at", { ascending: false });
  if (params.atleta) documentsQuery = documentsQuery.eq("athlete_id", params.atleta);

  const { data: documents } = await documentsQuery;

  return (
    <div>
      <PageHeader
        title="Documenti"
        description="Certificati medici, documenti d'identità, foto tessera e altri allegati."
      />

      {canManageData(user.ruolo) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Carica nuovo documento</CardTitle>
          </CardHeader>
          <CardBody>
            <form
              action={uploadDocument}
              encType="multipart/form-data"
              className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end"
            >
              <div>
                <Label htmlFor="athlete_id" required>Atleta</Label>
                <Select id="athlete_id" name="athlete_id" required defaultValue={params.atleta ?? ""}>
                  <option value="" disabled>Seleziona...</option>
                  {(athletes ?? []).map((a) => (
                    <option key={a.id} value={a.id}>{a.cognome} {a.nome}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="tipo" required>Tipo</Label>
                <Select id="tipo" name="tipo" required>
                  {Object.entries(DOCUMENT_KIND_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="etichetta">Etichetta</Label>
                <Input id="etichetta" name="etichetta" placeholder="(opzionale)" />
              </div>
              <div>
                <Label htmlFor="data_scadenza">Scadenza</Label>
                <Input id="data_scadenza" name="data_scadenza" type="date" />
              </div>
              <div>
                <Label htmlFor="file" required>File</Label>
                <Input id="file" name="file" type="file" required />
              </div>
              <div className="md:col-span-5 flex justify-end">
                <Button type="submit">Carica</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Elenco documenti</CardTitle>
        </CardHeader>
        {(documents ?? []).length === 0 ? (
          <EmptyState message="Nessun documento trovato." />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Atleta</TH>
                <TH>Tipo</TH>
                <TH>File</TH>
                <TH>Scadenza</TH>
                <TH>Stato</TH>
              </TR>
            </THead>
            <TBody>
              {((documents as unknown) as (Document & {
                athletes: { nome: string; cognome: string };
              })[]).map((d) => {
                const status = certificateStatus(d.data_scadenza);
                return (
                  <TR key={d.id}>
                    <TD>
                      {d.athletes.cognome} {d.athletes.nome}
                    </TD>
                    <TD>{DOCUMENT_KIND_LABELS[d.tipo]}</TD>
                    <TD className="text-xs text-neutral-600">{d.file_name}</TD>
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
    </div>
  );
}
