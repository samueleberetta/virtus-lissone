import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/utils/auth";
import { certificateStatus, certificateStatusLabel } from "@/lib/utils/certificates";
import { computeAge } from "@/lib/utils/format";

export async function GET(request: NextRequest) {
  await requireUser();
  const { searchParams } = new URL(request.url);
  const seasonId = searchParams.get("season");
  const teamId = searchParams.get("team");
  if (!seasonId) {
    return NextResponse.json({ error: "Stagione richiesta" }, { status: 400 });
  }

  const supabase = await createClient();
  let query = supabase
    .from("athlete_seasons")
    .select(
      `
      numero_maglia,
      team_id,
      teams (nome),
      athletes (
        id, nome, cognome, data_nascita, codice_fiscale,
        indirizzo, citta, cap, provincia, telefono, email,
        genitore_nome, genitore_email, genitore_telefono,
        stato, consenso_gdpr, data_consenso_gdpr,
        documents ( tipo, data_scadenza ),
        payments!payments_athlete_id_fkey (
          season_id, importo_totale, modalita, stato,
          unico_data, rata1_data, rata2_data
        )
      )
    `,
    )
    .eq("season_id", seasonId);
  if (teamId) query = query.eq("team_id", teamId);

  const { data: rows, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "Virtus Lissone";
  wb.created = new Date();
  const ws = wb.addWorksheet("Atleti");

  ws.columns = [
    { header: "Cognome", key: "cognome", width: 18 },
    { header: "Nome", key: "nome", width: 15 },
    { header: "Data nascita", key: "data_nascita", width: 12 },
    { header: "Età", key: "eta", width: 6 },
    { header: "Codice fiscale", key: "cf", width: 18 },
    { header: "Squadra", key: "squadra", width: 14 },
    { header: "N°", key: "maglia", width: 5 },
    { header: "Stato", key: "stato", width: 10 },
    { header: "Indirizzo", key: "indirizzo", width: 25 },
    { header: "Città", key: "citta", width: 14 },
    { header: "CAP", key: "cap", width: 7 },
    { header: "Prov.", key: "prov", width: 6 },
    { header: "Telefono", key: "telefono", width: 13 },
    { header: "Email", key: "email", width: 22 },
    { header: "Genitore", key: "gen_nome", width: 18 },
    { header: "Email genitore", key: "gen_email", width: 22 },
    { header: "Tel. genitore", key: "gen_tel", width: 13 },
    { header: "Cert. medico", key: "cert", width: 14 },
    { header: "Scad. cert.", key: "cert_scad", width: 12 },
    { header: "GDPR", key: "gdpr", width: 12 },
    { header: "Quota — modalità", key: "modalita", width: 12 },
    { header: "Quota — importo", key: "importo", width: 12 },
    { header: "Quota — stato", key: "quota_stato", width: 12 },
    { header: "Unico pagato il", key: "unico", width: 14 },
    { header: "Rata 1 pagata il", key: "r1", width: 14 },
    { header: "Rata 2 pagata il", key: "r2", width: 14 },
  ];

  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE8C01A" },
  };

  type Row = {
    numero_maglia: number | null;
    teams: { nome: string } | null;
    athletes: {
      id: string;
      nome: string;
      cognome: string;
      data_nascita: string;
      codice_fiscale: string | null;
      indirizzo: string | null;
      citta: string | null;
      cap: string | null;
      provincia: string | null;
      telefono: string | null;
      email: string | null;
      genitore_nome: string | null;
      genitore_email: string | null;
      genitore_telefono: string | null;
      stato: string;
      consenso_gdpr: boolean;
      data_consenso_gdpr: string | null;
      documents: { tipo: string; data_scadenza: string | null }[] | null;
      payments: {
        season_id: string;
        importo_totale: number;
        modalita: string;
        stato: string;
        unico_data: string | null;
        rata1_data: string | null;
        rata2_data: string | null;
      }[] | null;
    } | null;
  };

  for (const r of (rows ?? []) as unknown as Row[]) {
    const a = r.athletes;
    if (!a) continue;
    const med = (a.documents ?? []).find((d) => d.tipo === "certificato_medico");
    const status = certificateStatus(med?.data_scadenza ?? null);
    const p = (a.payments ?? []).find((x) => x.season_id === seasonId);

    ws.addRow({
      cognome: a.cognome,
      nome: a.nome,
      data_nascita: a.data_nascita,
      eta: computeAge(a.data_nascita),
      cf: a.codice_fiscale,
      squadra: r.teams?.nome,
      maglia: r.numero_maglia,
      stato: a.stato,
      indirizzo: a.indirizzo,
      citta: a.citta,
      cap: a.cap,
      prov: a.provincia,
      telefono: a.telefono,
      email: a.email,
      gen_nome: a.genitore_nome,
      gen_email: a.genitore_email,
      gen_tel: a.genitore_telefono,
      cert: certificateStatusLabel(status),
      cert_scad: med?.data_scadenza ?? "",
      gdpr: a.consenso_gdpr ? `Sì (${a.data_consenso_gdpr ?? ""})` : "No",
      modalita: p?.modalita ?? "",
      importo: p?.importo_totale ?? "",
      quota_stato: p?.stato ?? "non_pagato",
      unico: p?.unico_data ?? "",
      r1: p?.rata1_data ?? "",
      r2: p?.rata2_data ?? "",
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  const filename = `atleti_virtus_lissone_${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
