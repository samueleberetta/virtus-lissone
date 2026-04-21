"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireUser, canManageData } from "@/lib/utils/auth";

export async function uploadDocument(fd: FormData) {
  const user = await requireUser();
  if (!canManageData(user.ruolo)) throw new Error("Non autorizzato");

  const athleteId = fd.get("athlete_id") as string;
  const tipo = fd.get("tipo") as string;
  const etichetta = (fd.get("etichetta") as string) || null;
  const dataScadenza = (fd.get("data_scadenza") as string) || null;
  const file = fd.get("file") as File | null;

  if (!athleteId || !tipo) throw new Error("Dati mancanti");
  if (!file || file.size === 0) throw new Error("Nessun file selezionato");

  if (tipo === "certificato_medico" && !dataScadenza) {
    throw new Error("La data di scadenza è obbligatoria per il certificato medico.");
  }

  const service = createServiceClient();
  const ext = file.name.split(".").pop() ?? "bin";
  const filePath = `${athleteId}/${tipo}_${Date.now()}.${ext}`;

  const { error: uploadErr } = await service.storage
    .from("documenti-atleti")
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false,
    });
  if (uploadErr) throw new Error(uploadErr.message);

  const supabase = await createClient();
  const { error } = await supabase.from("documents").insert({
    athlete_id: athleteId,
    tipo,
    etichetta,
    file_path: filePath,
    file_name: file.name,
    mime_type: file.type,
    file_size: file.size,
    data_scadenza: dataScadenza,
    uploaded_by: user.id,
  });
  if (error) throw new Error(error.message);

  await supabase.from("activity_logs").insert({
    user_id: user.id,
    azione: "upload_documento",
    entity_type: "documents",
    entity_id: athleteId,
    descrizione: `Upload ${tipo} per atleta ${athleteId}`,
  });

  revalidatePath(`/atleti/${athleteId}`);
  revalidatePath("/documenti");
  revalidatePath("/dashboard");
  revalidatePath("/avvisi");
}

export async function createSignedDocumentUrl(docId: string) {
  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("documents")
    .select("file_path")
    .eq("id", docId)
    .single();
  if (!doc) throw new Error("Documento non trovato");

  const service = createServiceClient();
  const { data, error } = await service.storage
    .from("documenti-atleti")
    .createSignedUrl(doc.file_path, 60 * 10); // 10 min
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export async function deleteDocument(docId: string) {
  const user = await requireUser();
  if (!canManageData(user.ruolo)) throw new Error("Non autorizzato");

  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("documents")
    .select("id, athlete_id, file_path")
    .eq("id", docId)
    .single();
  if (!doc) return;

  const service = createServiceClient();
  await service.storage.from("documenti-atleti").remove([doc.file_path]);
  await supabase.from("documents").delete().eq("id", docId);

  revalidatePath(`/atleti/${doc.athlete_id}`);
  revalidatePath("/documenti");
  revalidatePath("/avvisi");
}
