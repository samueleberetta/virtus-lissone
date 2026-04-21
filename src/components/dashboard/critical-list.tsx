import Link from "next/link";
import { Semaforo } from "@/components/ui/semaforo";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/table";
import { formatDate } from "@/lib/utils/format";
import type { CriticalEntry } from "@/lib/queries/alerts";

export function CriticalList({
  entries,
  limit,
}: {
  entries: CriticalEntry[];
  limit?: number;
}) {
  const rows = limit ? entries.slice(0, limit) : entries;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Certificati critici</CardTitle>
          {limit && entries.length > limit && (
            <Link
              href="/avvisi"
              className="text-sm text-virtus-red hover:underline"
            >
              Vedi tutti ({entries.length})
            </Link>
          )}
        </div>
      </CardHeader>
      {rows.length === 0 ? (
        <EmptyState message="Nessun certificato critico. Tutto in regola. 🎉" />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Nome</TH>
              <TH>Tipo</TH>
              <TH>Squadra</TH>
              <TH>Certificato</TH>
              <TH>Scadenza</TH>
              <TH>Stato</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((e, i) => (
              <TR key={`${e.kind}-${e.subject_id}-${e.cert_label}-${i}`}>
                <TD>
                  <Link
                    href={
                      e.kind === "atleta"
                        ? `/atleti/${e.subject_id}`
                        : `/allenatori`
                    }
                    className="font-medium text-neutral-900 hover:text-virtus-red"
                  >
                    {e.subject}
                  </Link>
                </TD>
                <TD>
                  <Badge variant={e.kind === "atleta" ? "default" : "yellow"}>
                    {e.kind === "atleta" ? "Atleta" : "Allenatore"}
                  </Badge>
                </TD>
                <TD className="text-neutral-600">{e.squadra ?? "—"}</TD>
                <TD>{e.cert_label}</TD>
                <TD className="text-neutral-600">{formatDate(e.data_scadenza)}</TD>
                <TD>
                  <Semaforo status={e.status} />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </Card>
  );
}
