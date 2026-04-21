"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser, canManageData } from "@/lib/utils/auth";
import { fetchCurrentSeasonId } from "@/lib/queries/alerts";

function parseNum(v: FormDataEntryValue | null): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

export async function savePayment(fd: FormData) {
  const user = await requireUser();
  if (!canManageData(user.ruolo)) throw new Error("Non autorizzato");

  const athleteId = fd.get("athlete_id") as string;
  const modalita = fd.get("modalita") as "unico" | "rate";
  const importoTotale = parseNum(fd.get("importo_totale")) ?? 0;

  const seasonId = await fetchCurrentSeasonId();
  if (!seasonId) throw new Error("Nessuna stagione corrente attiva.");

  const unicoImporto = modalita === "unico" ? parseNum(fd.get("unico_importo")) : null;
  const unicoData = modalita === "unico" ? (fd.get("unico_data") as string) || null : null;
  const unicoMetodo =
    modalita === "unico" ? (fd.get("unico_metodo") as "contanti" | "bonifico") || null : null;

  const rata1Importo = modalita === "rate" ? parseNum(fd.get("rata1_importo")) : null;
  const rata1Data = modalita === "rate" ? (fd.get("rata1_data") as string) || null : null;
  const rata1Metodo =
    modalita === "rate" ? (fd.get("rata1_metodo") as "contanti" | "bonifico") || null : null;
  const rata2Importo = modalita === "rate" ? parseNum(fd.get("rata2_importo")) : null;
  const rata2Data = modalita === "rate" ? (fd.get("rata2_data") as string) || null : null;
  const rata2Metodo =
    modalita === "rate" ? (fd.get("rata2_metodo") as "contanti" | "bonifico") || null : null;

  // Calcola stato
  let stato: "non_pagato" | "parziale" | "pagato" = "non_pagato";
  if (modalita === "unico") {
    if (unicoData) stato = "pagato";
  } else {
    if (rata1Data && rata2Data) stato = "pagato";
    else if (rata1Data || rata2Data) stato = "parziale";
  }

  const payload = {
    athlete_id: athleteId,
    season_id: seasonId,
    importo_totale: importoTotale,
    modalita,
    stato,
    unico_importo: unicoImporto,
    unico_data: unicoData,
    unico_metodo: unicoMetodo,
    rata1_importo: rata1Importo,
    rata1_data: rata1Data,
    rata1_metodo: rata1Metodo,
    rata2_importo: rata2Importo,
    rata2_data: rata2Data,
    rata2_metodo: rata2Metodo,
    note: (fd.get("note") as string) || null,
  };

  const supabase = await createClient();
  await supabase.from("payments").upsert(payload, { onConflict: "athlete_id,season_id" });

  await supabase.from("activity_logs").insert({
    user_id: user.id,
    azione: "modifica_quota",
    entity_type: "payments",
    entity_id: athleteId,
    descrizione: `Aggiornata quota atleta ${athleteId}: ${stato}`,
  });

  revalidatePath("/quote");
  revalidatePath(`/atleti/${athleteId}`);
  revalidatePath("/dashboard");
}
