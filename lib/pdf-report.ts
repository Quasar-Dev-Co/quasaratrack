import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface AIAnalysis {
  totalActiveHours: string;
  averageDailyHours: string;
  topWebsites: { domain: string; title: string; hours: string; percentage: number }[];
  summary: string;
  rating: number;
  ratingReason: string;
}

export interface RawData {
  totals: {
    activeTime: number;
    inactiveTime: number;
    keystrokes: number;
    copies: number;
    pastes: number;
    clicks: number;
    tabs: number;
    actions: number;
  };
  topSites: {
    domain: string;
    title: string;
    activeTime: number;
    keystrokes: number;
    clicks: number;
    copies: number;
    pastes: number;
  }[];
  dailyData: {
    date: string;
    activeTime: number;
    inactiveTime: number;
    keystrokes: number;
    clicks: number;
  }[];
  days: number;
  startDate: string;
  endDate: string;
  employeeName: string;
}

function fmtTime(seconds: number): string {
  if (!seconds || seconds < 1) return "0s";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${Math.floor(seconds)}s`;
}

// Type-safe color tuples
type RGB = [number, number, number];
const purple: RGB = [124, 58, 237];
const darkPurple: RGB = [76, 29, 149];
const lightPurple: RGB = [237, 233, 254];
const gray: RGB = [107, 114, 128];
const darkGray: RGB = [55, 65, 81];
const white: RGB = [255, 255, 255];
const green: RGB = [52, 211, 153];
const blue: RGB = [59, 130, 246];
const orange: RGB = [249, 115, 22];
const red: RGB = [248, 113, 113];
const amber: RGB = [251, 191, 36];

export async function generateReportPDF(
  analysis: AIAnalysis,
  raw: RawData,
  language: "en" | "nl"
): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;

  const t = language === "nl" ? {
    title: "Quasara Track",
    subtitle: "Werknemers Activiteitsrapport",
    generated: "Gegenereerd",
    summary: "Samenvatting",
    totalActive: "Totale Actieve Uren",
    avgDaily: "Gemiddeld per Dag",
    rating: "Beoordeling",
    dailyOverview: "Dagelijkse Activiteit",
    topWebsites: "Top Websites",
    website: "Website",
    hours: "Uren",
    percentage: "Percentage",
    keystrokes: "Toetsaanslagen",
    clicks: "Klikken",
    copies: "Kopieën",
    pastes: "Plakken",
    activeTime: "Actieve Tijd",
    inactiveTime: "Inactieve Tijd",
    tabs: "Tabbladen",
    dailyBreakdown: "Dagelijkse Uitsplitsing",
    date: "Datum",
    actions: "Acties",
    activityDist: "Activiteit Verdeling",
    aiSummary: "AI Samenvatting",
    ratingReason: "Beoordelingsreden",
    noData: "Geen gegevens",
  } : {
    title: "Quasara Track",
    subtitle: "Employee Activity Report",
    generated: "Generated",
    summary: "Summary",
    totalActive: "Total Active Hours",
    avgDaily: "Average per Day",
    rating: "Rating",
    dailyOverview: "Daily Activity Overview",
    topWebsites: "Top Websites",
    website: "Website",
    hours: "Hours",
    percentage: "Percentage",
    keystrokes: "Keystrokes",
    clicks: "Clicks",
    copies: "Copies",
    pastes: "Pastes",
    activeTime: "Active Time",
    inactiveTime: "Inactive Time",
    tabs: "Tabs",
    dailyBreakdown: "Daily Breakdown",
    date: "Date",
    actions: "Actions",
    activityDist: "Activity Distribution",
    aiSummary: "AI Summary",
    ratingReason: "Rating Reason",
    noData: "No data",
  };

  let y = 0;

  // ═══════════════════════════════════════════
  // PAGE 1: Header + AI Summary + Stats + Rating
  // ═══════════════════════════════════════════

  // ── Header banner ──
  doc.setFillColor(...darkPurple);
  doc.rect(0, 0, pageWidth, 90, "F");
  doc.setFillColor(...purple);
  doc.rect(0, 0, pageWidth, 70, "F");

  doc.setTextColor(...white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(t.title, margin, 38);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(220, 210, 255);
  doc.text(t.subtitle, margin, 58);

  doc.setFontSize(9);
  doc.text(
    `${t.generated}: ${new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`,
    pageWidth - margin, 38, { align: "right" }
  );

  y = 110;

  // ── Employee info box ──
  doc.setFillColor(...lightPurple);
  doc.roundedRect(margin, y, contentWidth, 50, 6, 6, "F");

  doc.setTextColor(...darkPurple);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(raw.employeeName, margin + 16, y + 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...gray);
  const dateRange = raw.startDate === raw.endDate
    ? `${t.date}: ${raw.startDate}`
    : `${raw.startDate} → ${raw.endDate}`;
  doc.text(dateRange, margin + 16, y + 38);
  doc.text(`${raw.days} day(s)`, pageWidth - margin - 16, y + 38, { align: "right" });

  y += 70;

  // ── AI Summary box ──
  doc.setTextColor(...darkGray);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(t.aiSummary, margin, y);
  y += 8;
  doc.setFillColor(...purple);
  doc.rect(margin, y, 60, 3, "F");
  y += 16;

  // Summary text with word wrap
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...darkGray);
  const summaryLines = doc.splitTextToSize(analysis.summary, contentWidth - 24);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, summaryLines.length * 13 + 16, 6, 6, "F");
  doc.text(summaryLines, margin + 12, y + 14);
  y += summaryLines.length * 13 + 24;

  // ── Rating box ──
  const rating = analysis.rating;
  let ratingColor: RGB = red;
  if (rating >= 8) ratingColor = green;
  else if (rating >= 6) ratingColor = amber;
  else if (rating >= 4) ratingColor = orange;

  const ratingBoxH = 60;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, ratingBoxH, 6, 6, "F");

  // Big rating number
  doc.setFont("helvetica", "bold");
  doc.setFontSize(36);
  doc.setTextColor(...ratingColor);
  doc.text(`${rating}`, margin + 20, y + 38);
  doc.setFontSize(14);
  doc.setTextColor(...gray);
  doc.text("/ 10", margin + 50, y + 38);

  // Rating label
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...darkGray);
  doc.text(t.rating, margin + 90, y + 22);

  // Rating reason
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...gray);
  const reasonLines = doc.splitTextToSize(analysis.ratingReason, contentWidth - 110);
  doc.text(reasonLines, margin + 90, y + 38);

  // Rating bar
  const barX = margin + 90;
  const barY = y + 48;
  const barW = contentWidth - 110;
  doc.setFillColor(229, 231, 235);
  doc.roundedRect(barX, barY, barW, 4, 2, 2, "F");
  doc.setFillColor(...ratingColor);
  doc.roundedRect(barX, barY, (barW * rating) / 10, 4, 2, 2, "F");

  y += ratingBoxH + 25;

  // ── Key stats (4 cards) ──
  doc.setTextColor(...darkGray);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(t.summary, margin, y);
  y += 8;
  doc.setFillColor(...purple);
  doc.rect(margin, y, 60, 3, "F");
  y += 20;

  const cardW = (contentWidth - 30) / 4;
  const cardH = 70;
  const stats = [
    { label: t.totalActive, value: `${analysis.totalActiveHours}h`, color: green },
    { label: t.avgDaily, value: `${analysis.averageDailyHours}h`, color: purple },
    { label: t.keystrokes, value: String(raw.totals.keystrokes), color: blue },
    { label: t.clicks, value: String(raw.totals.clicks), color: orange },
  ];

  stats.forEach((s, i) => {
    const x = margin + i * (cardW + 10);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, cardW, cardH, 6, 6, "F");
    doc.setFillColor(...s.color);
    doc.setLineWidth(3);
    doc.line(x, y + 2, x, y + cardH - 2);

    doc.setTextColor(...gray);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(s.label.toUpperCase(), x + 12, y + 18);

    doc.setTextColor(...s.color);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text(s.value, x + 12, y + 42);
  });

  y += cardH + 25;

  // ═══════════════════════════════════════════
  // PAGE 2: Charts
  // ═══════════════════════════════════════════
  doc.addPage();
  y = margin;

  // ── Daily activity bar chart ──
  doc.setTextColor(...darkGray);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(t.dailyOverview, margin, y);
  y += 8;
  doc.setFillColor(...purple);
  doc.rect(margin, y, 60, 3, "F");
  y += 20;

  if (raw.dailyData.length > 0) {
    const chartH = 140;
    const chartW = contentWidth;
    const maxActive = Math.max(...raw.dailyData.map((d) => d.activeTime), 1);
    const barCount = raw.dailyData.length;
    const barSpacing = 8;
    const barWidth = Math.max(12, Math.min(50, (chartW - (barCount + 1) * barSpacing) / barCount));

    // Y-axis
    doc.setTextColor(...gray);
    doc.setFontSize(7);
    for (let i = 0; i <= 4; i++) {
      const val = (maxActive / 4) * (4 - i);
      const yPos = y + (chartH / 4) * i;
      doc.text(fmtTime(val), margin - 4, yPos + 3, { align: "right" });
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.5);
      doc.line(margin, yPos, margin + chartW, yPos);
    }

    // Bars
    raw.dailyData.forEach((d, i) => {
      const x = margin + barSpacing + i * (barWidth + barSpacing);
      const barH = (d.activeTime / maxActive) * chartH;
      const barY = y + chartH - barH;

      doc.setFillColor(...purple);
      doc.roundedRect(x, barY, barWidth, barH, 2, 2, "F");

      doc.setTextColor(...gray);
      doc.setFontSize(6);
      doc.text(d.date.substring(5), x + barWidth / 2, y + chartH + 12, { align: "center" });
    });

    y += chartH + 30;
  }

  // ── Top websites horizontal bar chart ──
  if (y > pageHeight - 200) {
    doc.addPage();
    y = margin;
  }

  doc.setTextColor(...darkGray);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(t.topWebsites, margin, y);
  y += 8;
  doc.setFillColor(...purple);
  doc.rect(margin, y, 60, 3, "F");
  y += 16;

  const chartColors: RGB[] = [purple, blue, green, orange, [236, 72, 153], [14, 165, 233], [168, 85, 247], [20, 184, 166], [245, 158, 11], [239, 68, 68]];
  const topSites = analysis.topWebsites.slice(0, 8);
  const maxPct = Math.max(...topSites.map((s) => s.percentage), 1);

  topSites.forEach((site, i) => {
    const barH = 22;
    const barX = margin + 120;
    const barW = contentWidth - 120 - 60;
    const fillW = (site.percentage / maxPct) * barW;
    const color = chartColors[i % chartColors.length];

    // Domain label
    doc.setTextColor(...darkGray);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(site.domain, margin, y + 14);

    // Bar background
    doc.setFillColor(243, 244, 246);
    doc.roundedRect(barX, y + 4, barW, barH, 3, 3, "F");

    // Bar fill
    doc.setFillColor(...color);
    doc.roundedRect(barX, y + 4, fillW, barH, 3, 3, "F");

    // Percentage + hours
    doc.setTextColor(...darkGray);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(`${site.percentage}%`, barX + barW + 8, y + 14);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...gray);
    doc.setFontSize(8);
    doc.text(`${site.hours}h`, barX + barW + 8, y + 24);

    y += barH + 12;
  });

  y += 15;

  // ═══════════════════════════════════════════
  // PAGE 3: Tables
  // ═══════════════════════════════════════════
  doc.addPage();
  y = margin;

  // ── Daily breakdown table ──
  doc.setTextColor(...darkGray);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(t.dailyBreakdown, margin, y);
  y += 8;
  doc.setFillColor(...purple);
  doc.rect(margin, y, 60, 3, "F");
  y += 16;

  autoTable(doc, {
    startY: y,
    head: [[t.date, t.activeTime, t.inactiveTime, t.keystrokes, t.clicks, t.copies, t.pastes, t.tabs]],
    body: raw.dailyData.map((d) => [
      d.date,
      fmtTime(d.activeTime),
      fmtTime(d.inactiveTime),
      String(d.keystrokes),
      String(d.clicks),
      "—",
      "—",
      "—",
    ]),
    theme: "grid",
    headStyles: { fillColor: purple, textColor: white, fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 8, textColor: darkGray },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: margin, right: margin },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 25;

  // ── Top websites table ──
  if (y > pageHeight - 150) {
    doc.addPage();
    y = margin;
  }

  doc.setTextColor(...darkGray);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(t.topWebsites, margin, y);
  y += 8;
  doc.setFillColor(...purple);
  doc.rect(margin, y, 60, 3, "F");
  y += 16;

  autoTable(doc, {
    startY: y,
    head: [[t.website, t.hours, t.percentage, t.keystrokes, t.clicks, t.copies + "/" + t.pastes]],
    body: raw.topSites.slice(0, 10).map((s) => [
      s.domain,
      `${(s.activeTime / 3600).toFixed(2)}h`,
      `${raw.totals.activeTime > 0 ? Math.round((s.activeTime / raw.totals.activeTime) * 100) : 0}%`,
      String(s.keystrokes),
      String(s.clicks),
      `${s.copies}/${s.pastes}`,
    ]),
    theme: "grid",
    headStyles: { fillColor: purple, textColor: white, fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 8, textColor: darkGray },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: margin, right: margin },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 25;

  // ── Footer on every page ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(...purple);
    doc.rect(0, pageHeight - 25, pageWidth, 25, "F");
    doc.setTextColor(220, 210, 255);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`${t.title} — ${t.subtitle}`, margin, pageHeight - 10);
    doc.text(`Page ${i} / ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: "right" });
  }

  // Save
  const filename = `QuasaraTrack_${raw.employeeName.replace(/\s+/g, "_")}_${raw.startDate}_to_${raw.endDate}.pdf`;
  doc.save(filename);
}
