// Türkiye bordro (payroll) calculation engine — PURE, framework-agnostic, used
// by BOTH the backend (authoritative) and the UI (live preview), so the screen
// always matches the posted slip to the kuruş. All rates/brackets/minimum-wage
// come from a `PayrollParams` set (versioned by year); this file is just the math.

import type { GelirVergisiDilim, PayrollParams, PayslipBreakdown } from './payroll.dto'

// Module-local (the shared `round2` from invoices.helpers is the public one).
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

// Cumulative income tax on a yearly GV matrahı, walking the brackets.
export function bracketTax(matrah: number, dilimler: GelirVergisiDilim[]): number {
  if (matrah <= 0) return 0
  let tax = 0
  let lower = 0
  for (const d of dilimler) {
    if (matrah > d.ust) {
      tax += (d.ust - lower) * d.oran
      lower = d.ust
    } else {
      tax += (matrah - lower) * d.oran
      return tax
    }
  }
  // Above the last declared bound → the last bracket's rate applies to the rest.
  const lastOran = dilimler.length ? dilimler[dilimler.length - 1].oran : 0
  tax += (matrah - lower) * lastOran
  return tax
}

export interface ComputePayslipInput {
  /** Monthly contract amount. Interpreted as brüt or net per `salaryType`. */
  amount: number
  salaryType: 'gross' | 'net'
  /** Worked days in the month (default 30 → full month). */
  days?: number
  params: PayrollParams
  /** Year-to-date GV matrahı BEFORE this month (for bracket selection). */
  kumulatifMatrahOnce?: number
}

// Forward calculation from a known BRÜT for the period.
function fromBrut(brut: number, p: PayrollParams, days: number, kumOnce: number): PayslipBreakdown {
  const scale = days / 30
  const tavan = p.sgkTavan * scale
  const sgkMatrah = Math.min(brut, tavan)
  const sgkIsci = sgkMatrah * p.sgkIsciOran
  const issizlikIsci = sgkMatrah * p.issizlikIsciOran
  const gvMatrah = brut - sgkIsci - issizlikIsci
  // Cumulative bracket: tax on (önce + bu ay) minus tax already levied on önce.
  const gelirVergisi = bracketTax(kumOnce + gvMatrah, p.gelirVergisiDilimleri) - bracketTax(kumOnce, p.gelirVergisiDilimleri)
  const damga = brut * p.damgaOran
  const gvIstisna = Math.min(gelirVergisi, p.asgariUcretGvIstisna * scale)
  const damgaIstisna = Math.min(damga, p.asgariUcretDamgaIstisna * scale)
  const net = brut - sgkIsci - issizlikIsci - (gelirVergisi - gvIstisna) - (damga - damgaIstisna)
  const sgkIsveren = sgkMatrah * p.sgkIsverenOran
  const issizlikIsveren = sgkMatrah * p.issizlikIsverenOran
  return {
    brut: round2(brut),
    days,
    sgkMatrah: round2(sgkMatrah),
    sgkIsci: round2(sgkIsci),
    issizlikIsci: round2(issizlikIsci),
    gvMatrah: round2(gvMatrah),
    kumulatifMatrahOnce: round2(kumOnce),
    gelirVergisi: round2(gelirVergisi),
    damga: round2(damga),
    gvIstisna: round2(gvIstisna),
    damgaIstisna: round2(damgaIstisna),
    net: round2(net),
    sgkIsveren: round2(sgkIsveren),
    issizlikIsveren: round2(issizlikIsveren),
    isverenMaliyet: round2(brut + sgkIsveren + issizlikIsveren),
  }
}

/**
 * Compute a payslip. For a GROSS contract, scales brüt by days/30 and computes
 * deductions. For a NET contract, solves the brüt that yields the target net via
 * binary search (the bracket steps make it non-linear, so we invert numerically).
 */
export function computePayslip(input: ComputePayslipInput): PayslipBreakdown {
  const days = input.days ?? 30
  const kumOnce = input.kumulatifMatrahOnce ?? 0
  const p = input.params
  if (input.salaryType === 'gross') {
    return fromBrut(input.amount * (days / 30), p, days, kumOnce)
  }
  // NET → BRÜT: net increases monotonically with brüt; binary-search the brüt.
  const targetNet = input.amount * (days / 30)
  let lo = targetNet
  let hi = targetNet * 3 + 1
  let best = fromBrut(hi, p, days, kumOnce)
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    best = fromBrut(mid, p, days, kumOnce)
    if (best.net > targetNet) hi = mid
    else lo = mid
    if (Math.abs(best.net - targetNet) < 0.005) break
  }
  return best
}

// Default parameters — seeded for a new year. NOTE: these carry the latest
// KNOWN (2025) Türkiye figures; official 2026 values must be confirmed and
// edited in the Parametreler screen. The engine is correct; the numbers are data.
export const DEFAULT_PAYROLL_PARAMS_2026: PayrollParams = {
  asgariUcretBrut: 26005.5,
  sgkTaban: 26005.5,
  sgkTavan: 195041.4, // 7.5 × taban
  sgkIsciOran: 0.14,
  issizlikIsciOran: 0.01,
  sgkIsverenOran: 0.205,
  issizlikIsverenOran: 0.02,
  gelirVergisiDilimleri: [
    { ust: 158000, oran: 0.15 },
    { ust: 330000, oran: 0.2 },
    { ust: 1200000, oran: 0.27 },
    { ust: 4300000, oran: 0.35 },
    { ust: 9.99e15, oran: 0.4 },
  ],
  damgaOran: 0.00759,
  // Asgari ücretin gelir vergisi + damga vergisi kadarı her çalışan için istisna.
  asgariUcretGvIstisna: 3315.7,
  asgariUcretDamgaIstisna: 197.38,
}
