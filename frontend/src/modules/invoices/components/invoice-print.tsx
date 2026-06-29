import type { InvoiceDto, InvoiceStatus, InvoiceType } from '@turbohesap/shared'

import { formatDate } from '@/lib/datetime'
import { formatMoney } from '../format'

const TYPE_LABEL: Record<InvoiceType, string> = { sales: 'Satış Faturası', purchase: 'Alış Faturası', return: 'İade Faturası' }
const STATUS_LABEL: Record<InvoiceStatus, string> = { draft: 'Taslak', issued: 'Kesildi', paid: 'Ödendi', cancelled: 'İptal' }

/**
 * A4-styled, print-only invoice. Hidden on screen; revealed by `window.print()`
 * via the injected @media print rules (everything else is hidden). "Save as PDF"
 * in the browser's print dialog produces the PDF — no extra library needed.
 */
export function InvoicePrint({ invoice }: { invoice: InvoiceDto }) {
  const c = invoice.currencyCode
  const paid = invoice.remainingTotal <= 0 ? 'Ödendi' : invoice.paidTotal > 0 ? 'Kısmi ödendi' : 'Ödenmedi'

  return (
    <>
      <style>{PRINT_CSS}</style>
      <div id="invoice-print" className="hidden print:block">
        <div className="invoice-sheet">
          {/* Header: company + document meta */}
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
              <p className="text-xl font-bold uppercase tracking-wide">{TYPE_LABEL[invoice.type]}</p>
              <p className="mt-1 font-mono text-sm">
                {invoice.series}
                {invoice.number || ' (taslak)'}
              </p>
              <p className="text-xs text-neutral-500">{STATUS_LABEL[invoice.status]}</p>
            </div>
          </header>

          {/* Parties + dates */}
          <section className="mt-5 grid grid-cols-2 gap-6 text-sm">
            <div>
              <p className="mb-1 text-2xs font-semibold uppercase tracking-wide text-neutral-500">Cari / Alıcı</p>
              <p className="font-medium">{invoice.contact?.name ?? '—'}</p>
            </div>
            <div className="grid grid-cols-2 gap-y-1 text-xs">
              <span className="text-neutral-500">Düzenleme Tarihi</span>
              <span className="text-right font-medium">{formatDate(invoice.date)}</span>
              <span className="text-neutral-500">Vade Tarihi</span>
              <span className="text-right font-medium">{invoice.dueDate ? formatDate(invoice.dueDate) : '—'}</span>
              <span className="text-neutral-500">Para Birimi</span>
              <span className="text-right font-medium">{invoice.currencyCode}</span>
              {invoice.ettn ? (
                <>
                  <span className="text-neutral-500">ETTN</span>
                  <span className="truncate text-right font-mono">{invoice.ettn}</span>
                </>
              ) : null}
            </div>
          </section>

          {/* Lines */}
          <table className="mt-5 w-full border-collapse text-xs">
            <thead>
              <tr className="border-y border-neutral-300 bg-neutral-100 text-2xs uppercase text-neutral-600">
                <th className="px-2 py-2 text-left font-semibold">#</th>
                <th className="px-2 py-2 text-left font-semibold">Açıklama</th>
                <th className="px-2 py-2 text-right font-semibold">Miktar</th>
                <th className="px-2 py-2 text-left font-semibold">Birim</th>
                <th className="px-2 py-2 text-right font-semibold">B. Fiyat</th>
                <th className="px-2 py-2 text-right font-semibold">İsk%</th>
                <th className="px-2 py-2 text-right font-semibold">KDV%</th>
                <th className="px-2 py-2 text-right font-semibold">Tutar</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map((l, i) => (
                <tr key={l.id} className="border-b border-neutral-200">
                  <td className="px-2 py-1.5 text-neutral-500">{i + 1}</td>
                  <td className="px-2 py-1.5 font-medium">{l.description}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{l.quantity}</td>
                  <td className="px-2 py-1.5 text-neutral-500">{l.unit}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{formatMoney(l.unitPrice, c)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{l.discountRate ? `%${l.discountRate}` : '—'}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">%{l.vatRate}</td>
                  <td className="px-2 py-1.5 text-right font-medium tabular-nums">{formatMoney(l.lineTotal, c)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <section className="mt-5 flex justify-end">
            <div className="w-72 space-y-1 text-sm">
              <Row label="Ara toplam" value={formatMoney(invoice.subtotal, c)} />
              {invoice.discountTotal ? <Row label="İskonto" value={`− ${formatMoney(invoice.discountTotal, c)}`} /> : null}
              <Row label="KDV matrahı" value={formatMoney(invoice.vatBase, c)} muted />
              {invoice.vatSummary.length > 0 ? (
                <div className="rounded bg-neutral-100 px-2 py-1.5">
                  <p className="mb-0.5 text-2xs uppercase text-neutral-500">KDV Özeti</p>
                  {invoice.vatSummary.map((v) => (
                    <Row key={v.rate} small label={`%${v.rate} (${formatMoney(v.base, c)})`} value={formatMoney(v.vat, c)} />
                  ))}
                </div>
              ) : null}
              <Row label="KDV toplam" value={formatMoney(invoice.vatTotal, c)} />
              {invoice.withholdingTotal > 0 ? <Row label="Tevkifat" value={`− ${formatMoney(invoice.withholdingTotal, c)}`} /> : null}
              <div className="mt-1 flex items-center justify-between border-t-2 border-neutral-800 pt-2 text-base font-bold">
                <span>Genel Toplam</span>
                <span className="tabular-nums">{formatMoney(invoice.grandTotal, c)}</span>
              </div>
              <Row label="Ödenen" value={formatMoney(invoice.paidTotal, c)} muted />
              <Row label="Kalan" value={formatMoney(invoice.remainingTotal, c)} />
              <p className="pt-1 text-right text-xs font-semibold text-neutral-600">Ödeme durumu: {paid}</p>
            </div>
          </section>

          {invoice.notes ? (
            <section className="mt-6 border-t border-neutral-200 pt-3 text-xs text-neutral-600">
              <p className="mb-1 font-semibold uppercase text-neutral-500">Notlar</p>
              <p className="whitespace-pre-wrap">{invoice.notes}</p>
            </section>
          ) : null}

          <footer className="mt-8 border-t border-neutral-200 pt-3 text-center text-2xs text-neutral-400">
            Bu belge TurboHesap ile düzenlenmiştir.
          </footer>
        </div>
      </div>
    </>
  )
}

function Row({ label, value, muted, small }: { label: string; value: string; muted?: boolean; small?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${small ? 'text-xs' : ''} ${muted ? 'text-neutral-500' : ''}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}

const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #invoice-print, #invoice-print * { visibility: visible !important; }
  #invoice-print {
    display: block !important;
    position: absolute;
    inset: 0;
    margin: 0;
    background: #fff;
    color: #111;
  }
  #invoice-print .invoice-sheet {
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
