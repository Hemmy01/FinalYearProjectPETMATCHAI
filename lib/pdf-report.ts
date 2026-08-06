// Branded PDF report engine for PetMatchAI / Hemmy Kennel.
//
// One reusable layout — logo + official seal header, a title/period/filters
// panel, KPI summary cards, and themed data tables with a page-numbered footer —
// shared by the Buyers, Sellers and Finance reports. Everything runs client-side
// (jsPDF), so a report is a single deterministic file with the company letterhead
// branding baked in, rather than a browser "print the screen" dump.

import { jsPDF } from "jspdf"
import { autoTable } from "jspdf-autotable"

/* ─────────────────────────── Brand ─────────────────────────── */

export const BRAND = {
  company: "Hemmy Kennel",
  product: "PetMatchAI",
  tagline: "AI-Powered Pet Trade & Services Marketplace",
  // Taken from the Hemmy Kennel letterhead. The business is Nigerian — the
  // Rwandan university is the thesis context only and must not appear here.
  location: "Aina Alege Street, Agiliti Estate, Mile 12, Lagos, Nigeria",
  contact: "hemmykennel@gmail.com  ·  +234 813 662 8290",
  primary: [37, 99, 235] as [number, number, number], // letterhead blue #2563eb
  ink: [31, 41, 55] as [number, number, number], // slate-800
  muted: [107, 114, 128] as [number, number, number], // gray-500
  light: [243, 244, 246] as [number, number, number], // gray-100
  border: [226, 232, 240] as [number, number, number], // slate-200
  stripe: [248, 250, 252] as [number, number, number], // slate-50
}

const M = 14 // page margin (mm)
const PAGE_W = 210
const PAGE_H = 297
const CONTENT_W = PAGE_W - M * 2

/* ─────────────────────────── Formatting ─────────────────────────── */

// jsPDF core fonts use WinAnsi encoding, which has no ₦ glyph — use "NGN" so
// money never renders as tofu. This is also clearer on a formal finance report.
export const money = (n: number | null | undefined): string =>
  "NGN " + Math.round(Number(n ?? 0)).toLocaleString("en-NG")

export const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return "—"
  const d = new Date(iso)
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

export const fmtDateTime = (d: Date): string =>
  d.toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })

/* ─────────────────────────── Asset loading ─────────────────────────── */

// Fetch a /public asset and return it as a data URL for jsPDF.addImage.
// Cached so a report with several pages only loads each image once.
const assetCache = new Map<string, string | null>()
async function loadAsset(url: string): Promise<string | null> {
  if (assetCache.has(url)) return assetCache.get(url)!
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(String(res.status))
    const blob = await res.blob()
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader()
      r.onloadend = () => resolve(r.result as string)
      r.onerror = reject
      r.readAsDataURL(blob)
    })
    assetCache.set(url, dataUrl)
    return dataUrl
  } catch {
    assetCache.set(url, null)
    return null
  }
}

/* ─────────────────────────── Types ─────────────────────────── */

export interface ReportMeta {
  title: string // e.g. "Buyers Report"
  subtitle?: string // e.g. "Registered buyers and purchase activity"
  period: string // e.g. "01 Jan 2020  to  29 Jul 2026"
  scope: string // e.g. "Platform-wide" | "Your account"
  preparedBy: string // e.g. "Jane Doe (Administrator)"
  filters?: string[] // e.g. ["Status: All", "Sorted by: Total spent"]
}

export interface Kpi {
  label: string
  value: string
}

export interface ReportTable {
  columns: { header: string; align?: "left" | "right" | "center"; width?: number }[]
  rows: (string | number)[][]
}

interface Assets {
  logo: string | null
  seal: string | null
}

/* ─────────────────────────── Drawing ─────────────────────────── */

function setFill(doc: jsPDF, c: [number, number, number]) { doc.setFillColor(c[0], c[1], c[2]) }
function setText(doc: jsPDF, c: [number, number, number]) { doc.setTextColor(c[0], c[1], c[2]) }
function setDraw(doc: jsPDF, c: [number, number, number]) { doc.setDrawColor(c[0], c[1], c[2]) }

// Full letterhead-style header (page 1). Returns the Y where content may start.
function drawHeader(doc: jsPDF, meta: ReportMeta, assets: Assets): number {
  // Logo (top-left) and official seal (top-right)
  if (assets.logo) doc.addImage(assets.logo, "PNG", M, 11, 21, 21)
  if (assets.seal) doc.addImage(assets.seal, "PNG", PAGE_W - M - 15, 11, 15, 22)

  const tx = M + 25
  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  setText(doc, BRAND.primary)
  doc.text(BRAND.company, tx, 18)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  setText(doc, BRAND.ink)
  doc.text(`${BRAND.product} — ${BRAND.tagline}`, tx, 23.5)

  doc.setFontSize(8)
  setText(doc, BRAND.muted)
  doc.text(`${BRAND.location}   ·   ${BRAND.contact}`, tx, 28.5)

  // Brand rule
  setDraw(doc, BRAND.primary)
  doc.setLineWidth(0.7)
  doc.line(M, 35, PAGE_W - M, 35)

  // Title
  doc.setFont("helvetica", "bold")
  doc.setFontSize(17)
  setText(doc, BRAND.ink)
  doc.text(meta.title, M, 45)
  if (meta.subtitle) {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    setText(doc, BRAND.muted)
    doc.text(meta.subtitle, M, 51)
  }

  // Info panel
  const panelY = meta.subtitle ? 55 : 50
  const hasFilters = !!(meta.filters && meta.filters.length)
  const panelH = hasFilters ? 24 : 18
  setFill(doc, BRAND.light)
  setDraw(doc, BRAND.border)
  doc.setLineWidth(0.2)
  doc.roundedRect(M, panelY, CONTENT_W, panelH, 2, 2, "FD")

  const col = CONTENT_W / 3
  const info: [string, string][] = [
    ["REPORTING PERIOD", meta.period],
    ["SCOPE", meta.scope],
    ["PREPARED BY", meta.preparedBy],
  ]
  info.forEach(([label, value], i) => {
    const cx = M + 4 + col * i
    doc.setFont("helvetica", "bold")
    doc.setFontSize(6.5)
    setText(doc, BRAND.muted)
    doc.text(label, cx, panelY + 6)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    setText(doc, BRAND.ink)
    doc.text(doc.splitTextToSize(value, col - 6), cx, panelY + 11)
  })

  if (hasFilters) {
    setDraw(doc, BRAND.border)
    doc.setLineWidth(0.2)
    doc.line(M + 3, panelY + 15, PAGE_W - M - 3, panelY + 15)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(6.5)
    setText(doc, BRAND.muted)
    doc.text("FILTERS", M + 4, panelY + 19.5)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8.5)
    setText(doc, BRAND.ink)
    doc.text(meta.filters!.join("     ·     "), M + 20, panelY + 19.5)
  }

  return panelY + panelH + 8
}

// Slim running header for continuation pages (page 2+).
function drawRunningHeader(doc: jsPDF, meta: ReportMeta, assets: Assets) {
  if (assets.logo) doc.addImage(assets.logo, "PNG", M, 7, 9, 9)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  setText(doc, BRAND.primary)
  doc.text(`${BRAND.company}  —  ${meta.title}`, M + 12, 13.5)
  setDraw(doc, BRAND.primary)
  doc.setLineWidth(0.5)
  doc.line(M, 18, PAGE_W - M, 18)
}

// Footer on every page: rule, confidentiality note, generated stamp, page x of y.
function drawFooters(doc: jsPDF, generatedOn: string) {
  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    setDraw(doc, BRAND.border)
    doc.setLineWidth(0.2)
    doc.line(M, PAGE_H - 12, PAGE_W - M, PAGE_H - 12)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7.5)
    setText(doc, BRAND.muted)
    doc.text(`${BRAND.company} · ${BRAND.product} · Confidential`, M, PAGE_H - 7)
    doc.text(`Generated ${generatedOn}`, PAGE_W / 2, PAGE_H - 7, { align: "center" })
    doc.text(`Page ${i} of ${total}`, PAGE_W - M, PAGE_H - 7, { align: "right" })
  }
}

// KPI summary cards (4 per row, wraps). Returns Y after the block.
function drawKpis(doc: jsPDF, startY: number, kpis: Kpi[]): number {
  if (!kpis.length) return startY
  const perRow = 4
  const gap = 4
  const cardW = (CONTENT_W - gap * (perRow - 1)) / perRow
  const cardH = 18
  let y = startY
  kpis.forEach((k, i) => {
    const colIdx = i % perRow
    if (colIdx === 0 && i > 0) y += cardH + gap
    const x = M + colIdx * (cardW + gap)
    setFill(doc, BRAND.stripe)
    setDraw(doc, BRAND.border)
    doc.setLineWidth(0.2)
    doc.roundedRect(x, y, cardW, cardH, 2, 2, "FD")
    // left accent
    setFill(doc, BRAND.primary)
    doc.roundedRect(x, y, 1.4, cardH, 0.7, 0.7, "F")
    doc.setFont("helvetica", "bold")
    doc.setFontSize(7)
    setText(doc, BRAND.muted)
    doc.text(k.label.toUpperCase(), x + 5, y + 6.5, { maxWidth: cardW - 7 })
    doc.setFont("helvetica", "bold")
    doc.setFontSize(13)
    setText(doc, BRAND.ink)
    doc.text(doc.splitTextToSize(k.value, cardW - 7), x + 5, y + 13.5)
  })
  return y + cardH + 8
}

/* ─────────────────────────── Public builder ─────────────────────────── */

export interface BuildOptions {
  meta: ReportMeta
  kpis: Kpi[]
  table: ReportTable
  emptyNote?: string // shown instead of a table when there are no rows
  fileName: string
}

// Assemble and download a branded PDF report. Async because it loads the logo
// and seal from /public first.
export async function generateReport(opts: BuildOptions): Promise<void> {
  const { meta, kpis, table, fileName } = opts
  const [logo, seal] = await Promise.all([
    loadAsset("/report-logo.png"),
    loadAsset("/report-seal.png"),
  ])
  const assets: Assets = { logo, seal }
  const generatedOn = fmtDateTime(new Date())

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" })

  let y = drawHeader(doc, meta, assets)
  y = drawKpis(doc, y, kpis)

  // Section heading for the detail table
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  setText(doc, BRAND.ink)
  doc.text("Detailed Records", M, y)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  setText(doc, BRAND.muted)
  doc.text(`${table.rows.length} record${table.rows.length === 1 ? "" : "s"}`, PAGE_W - M, y, { align: "right" })
  y += 3

  if (table.rows.length === 0) {
    doc.setFont("helvetica", "italic")
    doc.setFontSize(10)
    setText(doc, BRAND.muted)
    doc.text(opts.emptyNote ?? "No records match the selected filters.", M, y + 8)
    drawFooters(doc, generatedOn)
    doc.save(fileName)
    return
  }

  const columnStyles: Record<number, { halign?: "left" | "right" | "center"; cellWidth?: number }> = {}
  table.columns.forEach((c, i) => {
    columnStyles[i] = {}
    if (c.align) columnStyles[i].halign = c.align
    if (c.width) columnStyles[i].cellWidth = c.width
  })

  autoTable(doc, {
    startY: y,
    head: [table.columns.map((c) => c.header)],
    body: table.rows.map((r) => r.map((v) => (v === null || v === undefined ? "—" : String(v)))),
    theme: "striped",
    headStyles: { fillColor: BRAND.primary, textColor: 255, fontStyle: "bold", fontSize: 8.5, cellPadding: 2.2 },
    bodyStyles: { fontSize: 8, textColor: BRAND.ink, cellPadding: 2 },
    alternateRowStyles: { fillColor: BRAND.stripe },
    styles: { lineColor: BRAND.border, lineWidth: 0.1, overflow: "linebreak" },
    columnStyles,
    margin: { left: M, right: M, top: 24 },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) drawRunningHeader(doc, meta, assets)
    },
  })

  drawFooters(doc, generatedOn)
  doc.save(fileName)
}

/* ─────────────────────────── Report shapers ─────────────────────────── */
// Turn the API's { summary, rows } into KPIs + a table, then generate.
// Kept here so the page component stays thin and every report is defined once.

const stamp = () => new Date().toISOString().slice(0, 10)

export interface BuyerRow {
  name: string; email: string; location: string; joinedAt: string
  offers: number; purchases: number; spent: number
}
export interface BuyersSummary {
  totalBuyers: number; activeBuyers: number; totalOffers: number
  totalPurchases: number; totalSpent: number
}

export function buildBuyersReport(
  data: { summary: BuyersSummary; rows: BuyerRow[] },
  meta: ReportMeta,
): Promise<void> {
  const { summary, rows } = data
  return generateReport({
    meta,
    kpis: [
      { label: "Total Buyers", value: summary.totalBuyers.toLocaleString() },
      { label: "Active Buyers", value: summary.activeBuyers.toLocaleString() },
      { label: "Offers Made", value: summary.totalOffers.toLocaleString() },
      { label: "Purchases", value: summary.totalPurchases.toLocaleString() },
      { label: "Total Spent", value: money(summary.totalSpent) },
    ],
    table: {
      columns: [
        { header: "#", align: "right", width: 8 },
        { header: "Buyer" },
        { header: "Email" },
        { header: "Location" },
        { header: "Joined", align: "center" },
        { header: "Offers", align: "right" },
        { header: "Purchases", align: "right" },
        { header: "Total Spent", align: "right" },
      ],
      rows: rows.map((r, i) => [
        i + 1, r.name || "—", r.email || "—", r.location || "—",
        fmtDate(r.joinedAt), r.offers, r.purchases, money(r.spent),
      ]),
    },
    emptyNote: "No buyers joined or were active within the selected period.",
    fileName: `PetMatchAI_Buyers_Report_${stamp()}.pdf`,
  })
}

export interface SellerRow {
  name: string; email: string; location: string; joinedAt: string
  listings: number; active: number; sold: number
  views: number; inquiries: number; revenue: number; rating: number | null
}
export interface SellersSummary {
  totalSellers: number; activeSellers: number; totalListings: number
  totalSold: number; totalViews: number; totalRevenue: number
}

export function buildSellersReport(
  data: { summary: SellersSummary; rows: SellerRow[] },
  meta: ReportMeta,
): Promise<void> {
  const { summary, rows } = data
  return generateReport({
    meta,
    kpis: [
      { label: "Total Sellers", value: summary.totalSellers.toLocaleString() },
      { label: "Active Sellers", value: summary.activeSellers.toLocaleString() },
      { label: "Listings", value: summary.totalListings.toLocaleString() },
      { label: "Pets Sold", value: summary.totalSold.toLocaleString() },
      { label: "Total Views", value: summary.totalViews.toLocaleString() },
      { label: "Revenue (Released)", value: money(summary.totalRevenue) },
    ],
    table: {
      columns: [
        { header: "#", align: "right", width: 8 },
        { header: "Seller" },
        { header: "Email" },
        { header: "Listings", align: "right" },
        { header: "Active", align: "right" },
        { header: "Sold", align: "right" },
        { header: "Views", align: "right" },
        { header: "Revenue", align: "right" },
        // Not period-bounded — flagged as such in the header panel's FILTERS
        // line rather than in the column label, which would cost a page.
        { header: "Rating", align: "center" },
      ],
      rows: rows.map((r, i) => [
        i + 1, r.name || "—", r.email || "—",
        r.listings, r.active, r.sold, r.views, money(r.revenue),
        r.rating ? `${r.rating.toFixed(1)}/5` : "—",
      ]),
    },
    emptyNote: "No sellers joined or were active within the selected period.",
    fileName: `PetMatchAI_Sellers_Report_${stamp()}.pdf`,
  })
}

export interface FinanceRow {
  date: string; reference: string; buyer: string; seller: string
  pet: string; amount: number; provider: string; status: string
}
export interface FinanceSummary {
  count: number; gmv: number; released: number; inEscrow: number
  refunded: number; pending: number; cancelled: number
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  paid_escrow: "In Escrow",
  released: "Released",
  refunded: "Refunded",
  cancelled: "Cancelled",
}

export function buildFinanceReport(
  data: { summary: FinanceSummary; rows: FinanceRow[] },
  meta: ReportMeta,
): Promise<void> {
  const { summary, rows } = data
  return generateReport({
    meta,
    kpis: [
      { label: "Transactions", value: summary.count.toLocaleString() },
      { label: "Gross Value (GMV)", value: money(summary.gmv) },
      { label: "Released", value: money(summary.released) },
      { label: "In Escrow", value: money(summary.inEscrow) },
      { label: "Refunded", value: money(summary.refunded) },
      { label: "Pending", value: money(summary.pending) },
    ],
    table: {
      columns: [
        { header: "Date", align: "center" },
        { header: "Reference" },
        { header: "Buyer" },
        { header: "Seller" },
        { header: "Pet" },
        { header: "Amount", align: "right" },
        { header: "Method", align: "center" },
        { header: "Status", align: "center" },
      ],
      rows: rows.map((r) => [
        fmtDate(r.date), r.reference, r.buyer || "—", r.seller || "—",
        r.pet || "—", money(r.amount),
        r.provider ? r.provider.charAt(0).toUpperCase() + r.provider.slice(1) : "—",
        STATUS_LABEL[r.status] ?? r.status,
      ]),
    },
    emptyNote: "No transactions were recorded within the selected period.",
    fileName: `PetMatchAI_Finance_Report_${stamp()}.pdf`,
  })
}
