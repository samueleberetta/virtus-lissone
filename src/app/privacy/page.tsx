import Link from "next/link";
import { FOUNDED_YEAR } from "@/lib/constants";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-virtus-dark text-white py-4 px-6 border-b-4 border-virtus-yellow">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-virtus-red flex items-center justify-center text-virtus-yellow font-bold text-xs border-2 border-virtus-yellow">
              VL
            </div>
            <div>
              <div className="font-semibold">Virtus Lissone</div>
              <div className="text-xs text-neutral-400">
                Fondata nel {FOUNDED_YEAR} · Affiliata CSI
              </div>
            </div>
          </div>
          <Link href="/login" className="text-sm text-virtus-yellow hover:underline">
            Accedi
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto py-10 px-6">
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">
          Informativa sulla privacy
        </h1>
        <p className="text-sm text-neutral-500 mb-8">
          Ultimo aggiornamento: aprile 2026
        </p>

        <div className="prose prose-neutral max-w-none space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold">Titolare del trattamento</h2>
            <p>
              Polisportiva Virtus Lissone, società sportiva dilettantistica
              affiliata al Centro Sportivo Italiano (CSI), con sede in Lissone.
              Per qualsiasi richiesta è possibile scrivere a{" "}
              <a href="mailto:privacy@virtuslissone.it" className="text-virtus-red underline">
                privacy@virtuslissone.it
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Dati trattati</h2>
            <ul className="list-disc ml-5">
              <li>
                Dati anagrafici e di contatto di atleti, genitori/tutori e allenatori.
              </li>
              <li>
                Certificati medici agonistici, documenti d&apos;identità, certificati
                DAE e patentini allenatore CSI.
              </li>
              <li>
                Iscrizioni alle stagioni sportive, quote di pagamento, convocazioni
                e presenze agli allenamenti.
              </li>
              <li>Log di accesso e attività effettuate sul gestionale.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Base giuridica e finalità</h2>
            <p>
              Il trattamento è necessario per l&apos;esecuzione del rapporto di
              iscrizione all&apos;associazione sportiva e per adempimenti
              amministrativi, assicurativi e CSI. Per i dati dei minori è richiesto
              il consenso esplicito del genitore/tutore, registrato tramite flag
              e data nella scheda atleta.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Conservazione</h2>
            <p>
              I dati sono conservati per la durata dell&apos;iscrizione e per il
              periodo necessario agli obblighi di legge. Il gestionale prevede un
              campo di data di cancellazione programmata per la gestione della
              retention.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Sicurezza e accesso ai file</h2>
            <p>
              I documenti sono archiviati su storage protetto senza URL pubblici.
              L&apos;accesso avviene esclusivamente tramite link firmati, limitato
              al personale autorizzato del gestionale (superadmin, segretariato e
              allenatore della squadra dell&apos;atleta).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Diritti dell&apos;interessato</h2>
            <p>
              È possibile esercitare in qualsiasi momento i diritti di accesso,
              rettifica, cancellazione, limitazione e portabilità dei dati
              scrivendo al titolare del trattamento.
            </p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-neutral-200">
          <Link href="/login" className="text-virtus-red text-sm hover:underline">
            ← Torna al login
          </Link>
        </div>
      </main>
    </div>
  );
}
