import type { InvoiceDto } from '@turbohesap/shared'

// UBL-TR (GİB) invoice XML generation. This produces a structurally UBL-TR-shaped
// e-Fatura/e-Arşiv document (header, supplier/customer parties, per-rate KDV
// TaxTotal, LegalMonetaryTotal, InvoiceLines). NOTE: live GİB transmission also
// requires a mali mühür/imza + an integrator account — out of scope here; this is
// the document the integrator would sign & send.

export interface SellerProfile {
  name: string
  taxNumber: string
  taxOffice: string
  address: string
  city: string
}

export interface UblBuyer {
  name: string
  isCompany: boolean
  taxNumber: string | null
  nationalId: string | null
  taxOffice: string | null
  address: string | null
  city: string | null
}

function esc(v: string | number | null | undefined): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function money(n: number): string {
  return (Math.round((n + Number.EPSILON) * 100) / 100).toFixed(2)
}

function party(name: string, vkn: string | null, tckn: string | null, taxOffice: string | null, address: string | null, city: string | null): string {
  const idScheme = vkn ? 'VKN' : 'TCKN'
  const idValue = vkn ?? tckn ?? ''
  return `<cac:Party>
      <cac:PartyIdentification><cbc:ID schemeID="${idScheme}">${esc(idValue)}</cbc:ID></cac:PartyIdentification>
      <cac:PartyName><cbc:Name>${esc(name)}</cbc:Name></cac:PartyName>
      <cac:PostalAddress><cbc:StreetName>${esc(address)}</cbc:StreetName><cbc:CityName>${esc(city)}</cbc:CityName><cac:Country><cbc:Name>Türkiye</cbc:Name></cac:Country></cac:PostalAddress>
      <cac:PartyTaxScheme><cac:TaxScheme><cbc:Name>${esc(taxOffice)}</cbc:Name></cac:TaxScheme></cac:PartyTaxScheme>
    </cac:Party>`
}

export function buildInvoiceUbl(invoice: InvoiceDto, buyer: UblBuyer, seller: SellerProfile): string {
  const cur = invoice.currencyCode
  const taxSubtotals = invoice.vatSummary
    .map(
      (v) => `    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${cur}">${money(v.base)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${cur}">${money(v.vat)}</cbc:TaxAmount>
      <cac:TaxCategory><cbc:Percent>${v.rate}</cbc:Percent><cac:TaxScheme><cbc:Name>KDV</cbc:Name><cbc:TaxTypeCode>0015</cbc:TaxTypeCode></cac:TaxScheme></cac:TaxCategory>
    </cac:TaxSubtotal>`,
    )
    .join('\n')

  const lines = invoice.lines
    .map(
      (l, i) => `  <cac:InvoiceLine>
    <cbc:ID>${i + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="${esc(l.unit)}">${l.quantity}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${cur}">${money(l.lineNet)}</cbc:LineExtensionAmount>
    <cac:TaxTotal><cbc:TaxAmount currencyID="${cur}">${money(l.lineVat)}</cbc:TaxAmount></cac:TaxTotal>
    <cac:Item><cbc:Name>${esc(l.description)}</cbc:Name></cac:Item>
    <cac:Price><cbc:PriceAmount currencyID="${cur}">${money(l.unitPrice)}</cbc:PriceAmount></cac:Price>
  </cac:InvoiceLine>`,
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>TR1.2</cbc:CustomizationID>
  <cbc:ProfileID>${esc(invoice.senaryo)}</cbc:ProfileID>
  <cbc:ID>${esc(invoice.series + invoice.number)}</cbc:ID>
  <cbc:UUID>${esc(invoice.ettn)}</cbc:UUID>
  <cbc:IssueDate>${esc(invoice.date)}</cbc:IssueDate>
  <cbc:InvoiceTypeCode>${esc(invoice.faturaTipi)}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${cur}</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty>${party(seller.name, seller.taxNumber, null, seller.taxOffice, seller.address, seller.city)}</cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>${party(buyer.name, buyer.taxNumber, buyer.nationalId, buyer.taxOffice, buyer.address, buyer.city)}</cac:AccountingCustomerParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${cur}">${money(invoice.vatTotal)}</cbc:TaxAmount>
${taxSubtotals}
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${cur}">${money(invoice.vatBase)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${cur}">${money(invoice.vatBase)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${cur}">${money(invoice.vatBase + invoice.vatTotal)}</cbc:TaxInclusiveAmount>
    <cbc:AllowanceTotalAmount currencyID="${cur}">${money(invoice.discountTotal)}</cbc:AllowanceTotalAmount>
    <cbc:PayableAmount currencyID="${cur}">${money(invoice.grandTotal)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
${lines}
</Invoice>`
}

export function sellerFromEnv(): SellerProfile {
  return {
    name: process.env.COMPANY_NAME || 'TurboHesap A.Ş.',
    taxNumber: process.env.COMPANY_VKN || '1111111111',
    taxOffice: process.env.COMPANY_TAX_OFFICE || 'Merkez',
    address: process.env.COMPANY_ADDRESS || '',
    city: process.env.COMPANY_CITY || '',
  }
}
