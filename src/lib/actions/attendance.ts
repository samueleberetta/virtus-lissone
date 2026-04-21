"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser, canManageData } from "@/lib/utils/auth";
import { fetchCurrentSeasonId } from "@/lib/queries/alerts";

export async function createTrainingSession(fd: FormData) {
  const user = await requireUser();
  if (!canManageData(user.ruolo)) throw new Error("Non autorizzato");

  const teamId = fd.get("team_id") as string;
  const data = fd.get("data") as string;
  const orarioInizio = (fd.get("orario_inizio") as string) || null;
  const orarioFine = (fd.get("orario_fine") as string) || null;
  const luogo = (fd.get("luogo") as string) || null;

  const seasonId = await fetchCurrentSeasonId();
  if (!seasonId) throw new Error("Nessuna stagione corrente.");

  const supabase = await createClient();
  const { error } = await supabase.from("training_sessions").insert({
    team_id: teamId,
    season_id: seasonId,
    data,
    orario_inizio: orarioInizio,
    orario_fine: orarioFine,
    luogo,
    created_by: user.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/presenze");
}

export async function saveAttendance(fd: FormData) {
  const user = await requireUser();
  if (!canManageData(user.ruolo)) throw new Error("Non autorizzato");

  const sessionId = fd.get("session_id") as string;
  const athleteIds = fd.getAll("athlete_id").map(String);

  const supabase = await createClient();

  const rows = athleteIds.map((aid) => {
    const stato = (fd.get(`stato_${aid}`) as string) || "assente";
    return {
      session_id: sessionId,
      athlete_id: aid,
      stato,
    };
  });

  await supabase.from("attendance").delete().eq("session_id", sessionId);
  if (rows.length > 0) await supabase.from("attendance").insert(rows);

  await supabase.from("activity_logs").insert({
    user_id: user.id,
    azione: "nuova_presenza",
    entity_type: "training_sessions",
    entity_id: sessionId,
    descrizione: `Registrate presenze per sessione ${sessionId}`,
  });

  revalidatePath("/presenze");
}
