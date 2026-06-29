import type { PayslipDto } from '@turbohesap/shared'

import { formatMoney, periodLabel } from '../format'

/**
 * A4-styled, print-only maaş pusulası (payslip). Hidden on screen; revealed by
 * `window.print()` via the injected @media print rules. Mirrors invoice-print.
 */
export function PayslipPrint({ payslip }: { payslip: PayslipDto }) {
  const s = payslip
  const gvNet = s.gelirVergisi - s.gvIstisna
  const damgaNet = s.damga - s.damgaIstisna

  return (
    <>
      <style>{PRINT_CSS}</style>
      <div id="payslip-print" className="hidden print:block">
        <div className="payslip-sheet">
          <header className="flex items-start justify-between gap-6 border-b-2 border-neutral-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex size-14 items-center justify-center rounded-lg bg-neutral-900 text-lg font-bold text-white">
                TH
              </div>
              <div>
                <p className="text-lg font-bold tracking-tight">Şirket Ünvanı A.Ş.</p>
                <p className="text-xs text-neutral-500">
                  Adres satırı · Şehir / Ülke
                  <br />
                  VKN: 0000000000 · Vergi Dairesi
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold uppercase tracking-wide">Maaş Pusulası</p>
              <p className="mt-1 text-sm">{periodLabel(s.year, s.month)}</p>
              <p className="text-xs text-neutral-500">{s.paidAt ? 'Ödendi' : 'Ödenmedi'}</p>
            </div>
          </header>

          <section className="mt-5 grid grid-cols-2 gap-6 text-sm">
            <div>
              <p className="mb-1 text-2xs font-semibold uppercase tracking-wide text-neutral-500">Personel</p>
              <p className="font-medium">{s.employeeName}</p>
            </div>
            <div className="grid grid-cols-2 gap-y-1 text-xs">
              <span className="text-neutral-500">Dönem</span>
              <span className="text-right font-medium">{periodLabel(s.year, s.month)}</span>
              <span className="text-neutral-500">Çalışılan Gün</span>
              <span className="text-right font-medium">{s.days}</span>
            </div>
          </section>

          {/* Kazanç & kesintiler */}
          <table className="mt-5 w-full border-collapse text-xs">
            <thead>
              <tr className="border-y border-neutral-300 bg-neutral-100 text-2xs uppercase text-neutral-600">
                <th className="px-2 py-2 text-left font-semibold">Açıklama</th>
                <th className="px-2 py-2 text-right font-semibold">Matrah</th>
                <th className="px-2 py-2 text-right font-semibold">Tutar</th>
              </tr>
            </thead>
            <tbody>
              <Line label="Brüt Ücret" amount={formatMoney(s.brut)} strong />
              <Line label="SGK İşçi Payı (%14)" base={formatMoney(s.sgkMatrah)} amount={`− ${formatMoney(s.sgkIsci)}`} />
              <Line label="İşsizlik İşçi Payı (%1)" base={formatMoney(s.sgkMatrah)} amount={`− ${formatMoney(s.issizlikIsci)}`} />
              <Line label="Gelir Vergisi" base={formatMoney(s.gvMatrah)} amount={`− ${formatMoney(s.gelirVergisi)}`} />
              {s.gvIstisna > 0 ? <Line label="Gelir Vergisi İstisnası" amount={`+ ${formatMoney(s.gvIstisna)}`} /> : null}
              <Line label="Damga Vergisi" amount={`− ${formatMoney(s.damga)}`} />
              {s.damgaIstisna > 0 ? <Line label="Damga İstisnası" amount={`+ ${formatMoney(s.damgaIstisna)}`} /> : null}
            </tbody>
          </table>

          {/* Net */}
          <section className="mt-5 flex justify-end">
            <div className="w-80 space-y-1 text-sm">
              <Row label="Brüt" value={formatMoney(s.brut)} />
              <Row label="Toplam SGK kesintisi" value={`− ${formatMoney(s.sgkIsci + s.issizlikIsci)}`} muted />
              <Row label="Gelir vergisi (istisna sonrası)" value={`− ${formatMoney(gvNet)}`} muted />
              <Row label="Damga vergisi (istisna sonrası)" value={`− ${formatMoney(damgaNet)}`} muted />
              <div className="mt-1 flex items-center justify-between border-t-2 border-neutral-800 pt-2 text-base font-bold">
                <span>Net Ödenen</span>
                <span className="tabular-nums">{formatMoney(s.net)}</span>
              </div>
            </div>
          </section>

          {/* İşveren maliyeti */}
          <section className="mt-6 border-t border-neutral-200 pt-3 text-xs">
            <p className="mb-1 font-semibold uppercase text-neutral-500">İşveren Maliyeti</p>
            <div className="grid w-80 grid-cols-2 gap-y-1">
              <span className="text-neutral-500">Brüt</span>
              <span className="text-right tabular-nums">{formatMoney(s.brut)}</span>
              <span className="text-neutral-500">SGK İşveren Payı</span>
              <span className="text-right tabular-nums">{formatMoney(s.sgkIsveren)}</span>
              <span className="text-neutral-500">İşsizlik İşveren Payı</span>
              <span className="text-right tabular-nums">{formatMoney(s.issizlikIsveren)}</span>
              <span className="font-semibold text-neutral-700">Toplam Maliyet</span>
              <span className="text-right font-semibold tabular-nums">{formatMoney(s.isverenMaliyet)}</span>
            </div>
          </section>

          <footer className="mt-8 border-t border-neutral-200 pt-3 text-center text-2xs text-neutral-400">
            Bu belge TurboHesap ile düzenlenmiştir.
          </footer>
        </div>
      </div>
    </>
  )
}

function Line({
  label,
  base,
  amount,
  strong,
}: {
  label: string
  base?: string
  amount: string
  strong?: boolean
}) {
  return (
    <tr className="border-b border-neutral-200">
      <td className={`px-2 py-1.5 ${strong ? 'font-semibold' : ''}`}>{label}</td>
      <td className="px-2 py-1.5 text-right tabular-nums text-neutral-500">{base ?? '—'}</td>
      <td className={`px-2 py-1.5 text-right tabular-nums ${strong ? 'font-semibold' : ''}`}>{amount}</td>
    </tr>
  )
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${muted ? 'text-neutral-500' : ''}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}

const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #payslip-print, #payslip-print * { visibility: visible !important; }
  #payslip-print {
    display: block !important;
    position: absolute;
    inset: 0;
    margin: 0;
    background: #fff;
    color: #111;
  }
  #payslip-print .payslip-sheet {
    box-sizing: border-box;
    width: 210mm;
    min-height: 297mm;
    padding: 14mm 16mm;
    margin: 0 auto;
    background: #fff;
  }
  @page { size: A4; margin: 0; }
}
`
