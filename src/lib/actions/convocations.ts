"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser, canManageData } from "@/lib/utils/auth";
import { fetchCurrentSeasonId } from "@/lib/queries/alerts";

export async function createMatchWithConvocations(fd: FormData) {
  const user = await requireUser();
  if (!canManageData(user.ruolo)) throw new Error("Non autorizzato");

  const teamId = fd.get("team_id") as string;
  const data = fd.get("data") as string;
  const orario = (fd.get("orario") as string) || null;
  const luogo = (fd.get("luogo") as string) || null;
  const avversario = (fd.get("avversario") as string) || null;
  const casaTrasferta = (fd.get("casa_trasferta") as string) || null;
  const note = (fd.get("note") as string) || null;
  const athleteIds = fd.getAll("athlete_ids").map(String);

  const seasonId = await fetchCurrentSeasonId();
  if (!seasonId) throw new Error("Nessuna stagione corrente.");

  const supabase = await createClient();
  const { data: match, error } = await supabase
    .from("matches")
    .insert({
      team_id: teamId,
      season_id: seasonId,
      data,
      orario,
      luogo,
      avversario,
      casa_trasferta: casaTrasferta,
      note,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  if (athleteIds.length > 0) {
    await supabase.from("convocations").insert(
      athleteIds.map((aid) => ({
        match_id: match.id,
        athlete_id: aid,
        convocato: true,
      })),
    );
  }

  await supabase.from("activity_logs").insert({
    user_id: user.id,
    azione: "nuova_convocazione",
    entity_type: "matches",
    entity_id: match.id,
    descrizione: `Nuova convocazione vs ${avversario ?? "—"} (${athleteIds.length} atleti)`,
  });

  revalidatePath("/convocazioni");
}
