import { PageHeader } from "@/components/layout/page-header";
import { CriticalList } from "@/components/dashboard/critical-list";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/utils/auth";
import { fetchCriticalEntries } from "@/lib/queries/alerts";

export default async function AvvisiPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string; stato?: string }>;
}) {
  await requireUser();
  const params = await searchParams;
  const supabase = await createClient();
  const { data: teams } = await supabase
    .from("teams")
    .select("id, nome")
    .order("ordine");

  let entries = await fetchCriticalEntries({ teamId: params.team });
  if (params.stato) entries = entries.filter((e) => e.status === params.stato);

  return (
    <div>
      <PageHeader
        title="Avvisi e scadenze"
        description="Elenco completo di atleti e allenatori con certificati critici."
      />

      <Card className="mb-4">
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
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Stato</label>
            <select
              name="stato"
              defaultValue={params.stato ?? ""}
              className="h-9 rounded-md border border-neutral-300 px-2 text-sm"
            >
              <option value="">Tutti i critici</option>
              <option value="scaduto">Scaduti</option>
              <option value="in_scadenza">In scadenza (30gg)</option>
              <option value="mancante">Mancanti</option>
            </select>
          </div>
          <button
            type="submit"
            className="h-9 px-4 rounded-md border border-neutral-300 bg-white text-sm hover:bg-neutral-50"
          >
            Filtra
          </button>
        </form>
      </Card>

      <CriticalList entries={entries} />
    </div>
  );
}
