"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/utils/auth";

const CoachSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().min(1, "Nome obbligatorio"),
  cognome: z.string().min(1, "Cognome obbligatorio"),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  telefono: z.string().optional().nullable(),
  dae_scadenza: z.string().optional().nullable(),
  patentino_scadenza: z.string().optional().nullable(),
});

export async function saveCoach(fd: FormData) {
  const user = await requireRole(["superadmin"]);
  const parsed = CoachSchema.parse({
    id: (fd.get("id") as string) || undefined,
    nome: fd.get("nome"),
    cognome: fd.get("cognome"),
    email: fd.get("email") || null,
    telefono: fd.get("telefono") || null,
    dae_scadenza: fd.get("dae_scadenza") || null,
    patentino_scadenza: fd.get("patentino_scadenza") || null,
  });

  const supabase = await createClient();
  const payload = {
    nome: parsed.nome,
    cognome: parsed.cognome,
    email: parsed.email || null,
    telefono: parsed.telefono || null,
  };

  let coachId = parsed.id;
  if (coachId) {
    const { error } = await supabase.from("coaches").update(payload).eq("id", coachId);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await supabase
      .from("coaches")
      .insert(payload)
      .select()
      .single();
    if (error) throw new Error(error.message);
    coachId = data.id;
  }

  // Upsert certificati
  if (parsed.dae_scadenza) {
    await supabase
      .from("coach_certificates")
      .upsert(
        {
          coach_id: coachId!,
          tipo: "dae",
          data_scadenza: parsed.dae_scadenza,
        },
        { onConflict: "coach_id,tipo" },
      );
  }
  if (parsed.patentino_scadenza) {
    await supabase
      .from("coach_certificates")
      .upsert(
        {
          coach_id: coachId!,
          tipo: "patentino_csi",
          data_scadenza: parsed.patentino_scadenza,
        },
        { onConflict: "coach_id,tipo" },
      );
  }

  await supabase.from("activity_logs").insert({
    user_id: user.id,
    azione: "modifica_allenatore",
    entity_type: "coaches",
    entity_id: coachId,
    descrizione: `${parsed.id ? "Aggiornato" : "Creato"} allenatore ${parsed.cognome} ${parsed.nome}`,
  });

  revalidatePath("/allenatori");
  revalidatePath("/dashboard");
  revalidatePath("/avvisi");
}

export async function setCoachTeamRole(fd: FormData) {
  await requireRole(["superadmin"]);
  const coachId = fd.get("coach_id") as string;
  const teamId = fd.get("team_id") as string;
  const seasonId = fd.get("season_id") as string;
  const ruolo = fd.get("ruolo") as string;

  const supabase = await createClient();
  await supabase.from("coach_team_roles").upsert(
    { coach_id: coachId, team_id: teamId, season_id: seasonId, ruolo },
    { onConflict: "coach_id,team_id,season_id,ruolo" },
  );

  revalidatePath("/allenatori");
}

export async function removeCoachTeamRole(id: string) {
  await requireRole(["superadmin"]);
  const supabase = await createClient();
  await supabase.from("coach_team_roles").delete().eq("id", id);
  revalidatePath("/allenatori");
}
