import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { AthleteForm } from "@/components/athletes/athlete-form";
import { createClient } from "@/lib/supabase/server";
import { requireUser, canManageData } from "@/lib/utils/auth";
import { redirect } from "next/navigation";
import { createAthlete } from "@/lib/actions/athletes";
import type { Team } from "@/lib/types/database";

export default async function NuovoAtletaPage() {
  const user = await requireUser();
  if (!canManageData(user.ruolo)) redirect("/atleti");

  const supabase = await createClient();
  const { data: teams } = await supabase
    .from("teams")
    .select("*")
    .order("ordine");

  return (
    <div>
      <PageHeader
        title="Nuovo atleta"
        description="Inserisci i dati anagrafici e l'iscrizione alla stagione corrente."
        actions={
          <Link href="/atleti" className="text-sm text-neutral-600 hover:text-virtus-red">
            ← Torna alla lista
          </Link>
        }
      />
      <AthleteForm teams={(teams ?? []) as Team[]} action={createAthlete} submitLabel="Crea atleta" />
    </div>
  );
}
