"use client";

import { useState, useTransition } from "react";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { computeAge } from "@/lib/utils/format";
import type { Athlete, Team } from "@/lib/types/database";

export interface AthleteFormInitial extends Partial<Athlete> {
  team_id?: string | null;
  numero_maglia?: number | null;
}

export function AthleteForm({
  teams,
  initial,
  action,
  submitLabel = "Salva",
}: {
  teams: Team[];
  initial?: AthleteFormInitial;
  action: (fd: FormData) => Promise<void>;
  submitLabel?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dataNascita, setDataNascita] = useState<string>(
    initial?.data_nascita ?? "",
  );
  const minorenne = dataNascita ? computeAge(dataNascita) < 18 : false;

  function onSubmit(fd: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await action(fd);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Errore durante il salvataggio.");
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Dati anagrafici</CardTitle>
        </CardHeader>
        <CardBody className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="nome" required>Nome</Label>
            <Input id="nome" name="nome" required defaultValue={initial?.nome ?? ""} />
          </div>
          <div>
            <Label htmlFor="cognome" required>Cognome</Label>
            <Input id="cognome" name="cognome" required defaultValue={initial?.cognome ?? ""} />
          </div>
          <div>
            <Label htmlFor="data_nascita" required>Data di nascita</Label>
            <Input
              id="data_nascita"
              name="data_nascita"
              type="date"
              required
              value={dataNascita}
              onChange={(e) => setDataNascita(e.target.value)}
            />
            {minorenne && (
              <p className="text-xs text-virtus-red mt-1">
                Atleta minorenne: consenso GDPR obbligatorio.
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="codice_fiscale">Codice fiscale</Label>
            <Input
              id="codice_fiscale"
              name="codice_fiscale"
              defaultValue={initial?.codice_fiscale ?? ""}
              maxLength={16}
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="indirizzo">Indirizzo</Label>
            <Input id="indirizzo" name="indirizzo" defaultValue={initial?.indirizzo ?? ""} />
          </div>
          <div>
            <Label htmlFor="citta">Città</Label>
            <Input id="citta" name="citta" defaultValue={initial?.citta ?? ""} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cap">CAP</Label>
              <Input id="cap" name="cap" maxLength={5} defaultValue={initial?.cap ?? ""} />
            </div>
            <div>
              <Label htmlFor="provincia">Prov.</Label>
              <Input id="provincia" name="provincia" maxLength={2} defaultValue={initial?.provincia ?? ""} />
            </div>
          </div>
          <div>
            <Label htmlFor="telefono">Telefono</Label>
            <Input id="telefono" name="telefono" defaultValue={initial?.telefono ?? ""} />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={initial?.email ?? ""} />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Contatto genitore/tutore {minorenne && <span className="text-virtus-red">*</span>}
          </CardTitle>
        </CardHeader>
        <CardBody className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="genitore_nome" required={minorenne}>Nome</Label>
            <Input
              id="genitore_nome"
              name="genitore_nome"
              required={minorenne}
              defaultValue={initial?.genitore_nome ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="genitore_email" required={minorenne}>Email</Label>
            <Input
              id="genitore_email"
              name="genitore_email"
              type="email"
              required={minorenne}
              defaultValue={initial?.genitore_email ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="genitore_telefono" required={minorenne}>Telefono</Label>
            <Input
              id="genitore_telefono"
              name="genitore_telefono"
              required={minorenne}
              defaultValue={initial?.genitore_telefono ?? ""}
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Squadra e stato</CardTitle>
        </CardHeader>
        <CardBody className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="team_id" required>Squadra</Label>
            <Select id="team_id" name="team_id" required defaultValue={initial?.team_id ?? ""}>
              <option value="" disabled>Seleziona...</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="numero_maglia">Numero maglia</Label>
            <Input
              id="numero_maglia"
              name="numero_maglia"
              type="number"
              min={1}
              max={99}
              defaultValue={initial?.numero_maglia ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="stato">Stato</Label>
            <Select id="stato" name="stato" defaultValue={initial?.stato ?? "attivo"}>
              <option value="attivo">Attivo</option>
              <option value="sospeso">Sospeso</option>
              <option value="ritirato">Ritirato</option>
            </Select>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Consenso GDPR</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="consenso_gdpr"
              defaultChecked={initial?.consenso_gdpr ?? false}
              className="mt-1 h-4 w-4"
            />
            <span className="text-sm text-neutral-700">
              Consenso al trattamento dei dati personali ai sensi del GDPR.{" "}
              {minorenne && (
                <span className="text-virtus-red font-medium">
                  Obbligatorio per atleti minorenni (firma del genitore/tutore).
                </span>
              )}
            </span>
          </label>
          <div className="max-w-xs">
            <Label htmlFor="data_consenso_gdpr">Data firma consenso</Label>
            <Input
              id="data_consenso_gdpr"
              name="data_consenso_gdpr"
              type="date"
              defaultValue={initial?.data_consenso_gdpr ?? ""}
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Note</CardTitle>
        </CardHeader>
        <CardBody>
          <Textarea name="note" defaultValue={initial?.note ?? ""} rows={3} />
        </CardBody>
      </Card>

      {error && (
        <div className="text-sm text-virtus-red bg-red-50 border border-red-200 rounded p-3">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvataggio..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
