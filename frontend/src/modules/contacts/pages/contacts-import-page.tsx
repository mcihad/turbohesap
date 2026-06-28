// ContactsImportPage — paste or upload a CSV of contacts, map its header row to
// the import fields (name/email/phone/taxNumber/role/…), preview the parsed
// count and import via api.contacts.contacts.importContacts. contactsWrite gated.

import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { Upload } from 'lucide-react'
import { toast } from 'sonner'

import {
  ContactsPermissions,
  toApiError,
  type ImportContactsRequest,
  type ImportResultDto,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { PageWrapper, PageHeader } from '@/components/layout/page'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type ImportContact = ImportContactsRequest['contacts'][number]

// Map a CSV header cell to a known import field. Accepts a few Turkish aliases.
const HEADER_ALIASES: Record<string, keyof ImportContact> = {
  name: 'name',
  ad: 'name',
  unvan: 'name',
  'ünvan': 'name',
  email: 'email',
  'e-posta': 'email',
  eposta: 'email',
  phone: 'phone',
  telefon: 'phone',
  mobile: 'mobile',
  cep: 'mobile',
  taxnumber: 'taxNumber',
  vergino: 'taxNumber',
  code: 'code',
  kod: 'code',
  role: 'role',
  rol: 'role',
  contacttype: 'contactType',
  tur: 'contactType',
  'tür': 'contactType',
  city: 'city',
  sehir: 'city',
  'şehir': 'city',
}

const VALID_ROLES = new Set(['customer', 'supplier', 'both', 'lead'])
const VALID_TYPES = new Set(['company', 'individual'])

// Minimal CSV parser supporting quoted fields, escaped quotes and newlines.
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++ }
        else inQuotes = false
      } else cell += ch
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(cell); cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cell); cell = ''
      rows.push(row); row = []
    } else cell += ch
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row) }
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[\s_]+/g, '')
}

function parseContacts(text: string): { contacts: ImportContact[]; skipped: number } {
  const stripped = text.replace(/^﻿/, '')
  const rows = parseCsv(stripped)
  if (rows.length < 2) return { contacts: [], skipped: 0 }

  const headers = rows[0].map((h) => HEADER_ALIASES[normalizeHeader(h)])
  const contacts: ImportContact[] = []
  let skipped = 0

  for (const cells of rows.slice(1)) {
    const rec: Partial<ImportContact> = {}
    headers.forEach((field, i) => {
      if (!field) return
      const raw = (cells[i] ?? '').trim()
      if (!raw) return
      if (field === 'role') {
        if (VALID_ROLES.has(raw)) rec.role = raw as ImportContact['role']
      } else if (field === 'contactType') {
        if (VALID_TYPES.has(raw)) rec.contactType = raw as ImportContact['contactType']
      } else {
        rec[field] = raw as never
      }
    })
    if (rec.name) contacts.push(rec as ImportContact)
    else skipped++
  }
  return { contacts, skipped }
}

export function ContactsImportPage() {
  const [text, setText] = React.useState('')
  const [result, setResult] = React.useState<ImportResultDto | null>(null)

  const { contacts, skipped } = React.useMemo(() => parseContacts(text), [text])

  const importMutation = useMutation({
    mutationFn: () => api.contacts.contacts.importContacts({ contacts }),
    onSuccess: (res) => {
      setResult(res)
      toast.success(`${res.created} cari içe aktarıldı`)
    },
    onError: (e) => toast.error('İçe aktarma başarısız', { description: toApiError(e).message }),
  })

  const onFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => setText(String(reader.result ?? ''))
    reader.readAsText(file)
  }

  return (
    <PermissionRequired permission={ContactsPermissions.contactsWrite}>
      <PageWrapper>
        <PageHeader
          title="Cari içe aktar (CSV)"
          description="Başlık satırı ile bir CSV yapıştırın veya dosya yükleyin. Tanınan sütunlar: name, email, phone, mobile, taxNumber, role, code, contactType, city."
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">CSV verisi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="csv-file" className="text-xs">Dosya yükle</Label>
              <input
                id="csv-file"
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }}
                className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-accent"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="csv-text" className="text-xs">veya yapıştırın</Label>
              <Textarea
                id="csv-text"
                value={text}
                onChange={(e) => { setText(e.target.value); setResult(null) }}
                rows={10}
                className="font-mono text-xs"
                placeholder={'name,email,phone,role\nAcme Ltd,info@acme.com,5551112233,customer'}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t pt-3">
              <span className="text-sm text-muted-foreground">
                {contacts.length} kayıt hazır
                {skipped > 0 ? ` · ${skipped} satır atlandı (ad yok)` : ''}
              </span>
              <Button
                className="ml-auto"
                onClick={() => importMutation.mutate()}
                disabled={contacts.length === 0 || importMutation.isPending}
              >
                <Upload className="size-4" />
                İçe aktar
              </Button>
            </div>
          </CardContent>
        </Card>

        {result ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Sonuç</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><span className="font-medium text-success">{result.created}</span> oluşturuldu</p>
              <p><span className="font-medium">{result.skipped}</span> atlandı</p>
              {result.errors.length ? (
                <div className="space-y-1">
                  <p className="font-medium text-destructive">Hatalar ({result.errors.length}):</p>
                  <ul className="list-disc space-y-0.5 pl-5 text-muted-foreground">
                    {result.errors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </PageWrapper>
    </PermissionRequired>
  )
}
