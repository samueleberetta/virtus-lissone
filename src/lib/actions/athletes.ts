"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/utils/auth";
import { canManageData } from "@/lib/utils/auth";
import { isMinorenne } from "@/lib/utils/format";
import { fetchCurrentSeasonId } from "@/lib/queries/alerts";

const AthleteSchema = z.object({
  nome: z.string().min(1, "Nome obbligatorio"),
  cognome: z.string().min(1, "Cognome obbligatorio"),
  data_nascita: z.string().min(1, "Data di nascita obbligatoria"),
  codice_fiscale: z.string().optional().nullable(),
  indirizzo: z.string().optional().nullable(),
  citta: z.string().optional().nullable(),
  cap: z.string().optional().nullable(),
  provincia: z.string().optional().nullable(),
  telefono: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  genitore_nome: z.string().optional().nullable(),
  genitore_email: z.string().email().optional().or(z.literal("")).nullable(),
  genitore_telefono: z.string().optional().nullable(),
  stato: z.enum(["attivo", "sospeso", "ritirato"]).default("attivo"),
  consenso_gdpr: z.boolean().default(false),
  data_consenso_gdpr: z.string().optional().nullable(),
  team_id: z.string().uuid("Squadra obbligatoria"),
  numero_maglia: z.coerce.number().int().optional().nullable(),
  note: z.string().optional().nullable(),
});

function parseForm(fd: FormData) {
  const data = Object.fromEntries(fd.entries());
  return AthleteSchema.parse({
    ...data,
    consenso_gdpr: data.consenso_gdpr === "on" || data.consenso_gdpr === "true",
    numero_maglia: data.numero_maglia === "" ? null : data.numero_maglia,
    email: data.email || null,
    genitore_email: data.genitore_email || null,
    data_consenso_gdpr: data.data_consenso_gdpr || null,
  });
}

export async function createAthlete(fd: FormData) {
  const user = await requireUser();
  if (!canManageData(user.ruolo)) throw new Error("Non autorizzato");

  const input = parseForm(fd);

  // Obbligo consenso GDPR per minorenni
  if (isMinorenne(input.data_nascita) && !input.consenso_gdpr) {
    throw new Error("Per atleti minorenni è obbligatorio il consenso GDPR del genitore.");
  }

  const supabase = await createClient();
  const seasonId = await fetchCurrentSeasonId();
  if (!seasonId) throw new Error("Nessuna stagione corrente attiva.");

  // sport calcio come default
  const { data: sport } = await supabase
    .from("sports")
    .select("id")
    .eq("codice", "calcio")
    .single();
  if (!sport) throw new Error("Sport calcio non trovato.");

  const { data: athlete, error } = await supabase
    .from("athletes")
    .insert({
      sport_id: sport.id,
      nome: input.nome,
      cognome: input.cognome,
      data_nascita: input.data_nascita,
      codice_fiscale: input.codice_fiscale || null,
      indirizzo: input.indirizzo || null,
      citta: input.citta || null,
      cap: input.cap || null,
      provincia: input.provincia || null,
      telefono: input.telefono || null,
      email: input.email || null,
      genitore_nome: input.genitore_nome || null,
      genitore_email: input.genitore_email || null,
      genitore_telefono: input.genitore_telefono || null,
      stato: input.stato,
      consenso_gdpr: input.consenso_gdpr,
      data_consenso_gdpr: input.data_consenso_gdpr || null,
      note: input.note || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Iscrizione stagione
  await supabase.from("athlete_seasons").insert({
    athlete_id: athlete.id,
    season_id: seasonId,
    team_id: input.team_id,
    numero_maglia: input.numero_maglia || null,
  });

  await supabase.from("activity_logs").insert({
    user_id: user.id,
    azione: "modifica_atleta",
    entity_type: "athletes",
    entity_id: athlete.id,
    descrizione: `Creato atleta ${athlete.cognome} ${athlete.nome}`,
  });

  revalidatePath("/atleti");
  revalidatePath("/dashboard");
  redirect(`/atleti/${athlete.id}`);
}

export async function updateAthlete(id: string, fd: FormData) {
  const user = await requireUser();
  if (!canManageData(user.ruolo)) throw new Error("Non autorizzato");

  const input = parseForm(fd);
  const supabase = await createClient();
  const seasonId = await fetchCurrentSeasonId();

  const { error } = await supabase
    .from("athletes")
    .update({
      nome: input.nome,
      cognome: input.cognome,
      data_nascita: input.data_nascita,
      codice_fiscale: input.codice_fiscale || null,
      indirizzo: input.indirizzo || null,
      citta: input.citta || null,
      cap: input.cap || null,
      provincia: input.provincia || null,
      telefono: input.telefono || null,
      email: input.email || null,
      genitore_nome: input.genitore_nome || null,
      genitore_email: input.genitore_email || null,
      genitore_telefono: input.genitore_telefono || null,
      stato: input.stato,
      consenso_gdpr: input.consenso_gdpr,
      data_consenso_gdpr: input.data_consenso_gdpr || null,
      note: input.note || null,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  if (seasonId) {
    // Aggiorna iscrizione stagione (upsert per la stagione corrente)
    const { data: existing } = await supabase
      .from("athlete_seasons")
      .select("id")
      .eq("athlete_id", id)
      .eq("season_id", seasonId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("athlete_seasons")
        .update({
          team_id: input.team_id,
          numero_maglia: input.numero_maglia || null,
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("athlete_seasons").insert({
        athlete_id: id,
        season_id: seasonId,
        team_id: input.team_id,
        numero_maglia: input.numero_maglia || null,
      });
    }
  }

  await supabase.from("activity_logs").insert({
    user_id: user.id,
    azione: "modifica_atleta",
    entity_type: "athletes",
    entity_id: id,
    descrizione: `Aggiornato atleta ${input.cognome} ${input.nome}`,
  });

  revalidatePath("/atleti");
  revalidatePath(`/atleti/${id}`);
  revalidatePath("/dashboard");
}
