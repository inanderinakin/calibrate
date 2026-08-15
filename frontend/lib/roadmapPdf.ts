import type { Report } from "@/lib/types";

const FONTS = {
  normal: { url: "/fonts/roboto-subset.ttf", file: "roboto.ttf", style: "normal" },
  bold: { url: "/fonts/roboto-bold-subset.ttf", file: "roboto-bold.ttf", style: "bold" },
};

const FONT = "Roboto";

// Straight from globals.css so the document looks like the product.
const NAVY: [number, number, number] = [0, 29, 57];
const BLUE: [number, number, number] = [10, 65, 116];
const CREAM: [number, number, number] = [248, 241, 231];
const INK: [number, number, number] = [26, 26, 26];
const MUTED: [number, number, number] = [120, 128, 138];
const RULE: [number, number, number] = [214, 219, 224];

const MARGIN = 16;
const HEADER_HEIGHT = 26;

async function loadFont(url: string) {
  const res = await fetch(url);
  const bytes = new Uint8Array(await res.arrayBuffer());

  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);

  return btoa(binary);
}

interface Labels {
  title: string;
  roles: string;
  generatedOn: string;
  completed: string;
  trend: string;
  resources: string;
  noResources: string;
  resourceTitle: string;
  resourceType: string;
  resourceLanguage: string;
}

export async function downloadRoadmapPdf(
  report: Report,
  completed: Set<string>,
  trendLabels: Record<string, string>,
  labels: Labels
) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  // The built-in fonts are WinAnsi and drop ş, ğ, İ and ı, so Turkish reports
  // need a real Unicode face. Both are subsets, 15KB each.
  for (const font of Object.values(FONTS)) {
    doc.addFileToVFS(font.file, await loadFont(font.url));
    doc.addFont(font.file, FONT, font.style);
  }

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const usable = width - MARGIN * 2;
  let y = 0;

  function brandHeader() {
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, width, HEADER_HEIGHT, "F");

    doc.setFont(FONT, "bold");
    doc.setFontSize(16);
    doc.setTextColor(...CREAM);
    doc.text("Calibrate", MARGIN, 16);

    doc.setFont(FONT, "normal");
    doc.setFontSize(9);
    doc.text(labels.title, width - MARGIN, 16, { align: "right" });

    y = HEADER_HEIGHT + 12;
  }

  function newPage() {
    doc.addPage();
    brandHeader();
  }

  function room(needed: number) {
    if (y + needed > height - MARGIN) newPage();
  }

  function paragraph(text: string, size: number, color = INK, style = "normal", gap = 5) {
    doc.setFont(FONT, style);
    doc.setFontSize(size);
    doc.setTextColor(...color);

    for (const line of doc.splitTextToSize(text, usable) as string[]) {
      room(gap);
      doc.text(line, MARGIN, y);
      y += gap;
    }
  }

  function pill(text: string) {
    doc.setFont(FONT, "bold");
    doc.setFontSize(8);

    const w = doc.getTextWidth(text) + 6;
    room(8);

    doc.setFillColor(...BLUE);
    doc.roundedRect(MARGIN, y - 4, w, 6, 1.5, 1.5, "F");
    doc.setTextColor(...CREAM);
    doc.text(text, MARGIN + 3, y);

    y += 8;
  }

  function resourceTable(resources: Report["recommendations"][number]["resources"]) {
    const cols = [usable * 0.52, usable * 0.24, usable * 0.24];
    const rowHeight = 7;

    room(rowHeight * 2);

    doc.setFillColor(...NAVY);
    doc.rect(MARGIN, y - 4.5, usable, rowHeight, "F");
    doc.setFont(FONT, "bold");
    doc.setFontSize(8);
    doc.setTextColor(...CREAM);
    doc.text(labels.resourceTitle, MARGIN + 2, y);
    doc.text(labels.resourceType, MARGIN + cols[0] + 2, y);
    doc.text(labels.resourceLanguage, MARGIN + cols[0] + cols[1] + 2, y);
    y += rowHeight;

    doc.setFont(FONT, "normal");

    resources.forEach((resource, i) => {
      room(rowHeight);

      if (i % 2 === 1) {
        doc.setFillColor(246, 248, 250);
        doc.rect(MARGIN, y - 4.5, usable, rowHeight, "F");
      }

      doc.setFontSize(8);
      doc.setTextColor(...BLUE);
      const title = doc.splitTextToSize(resource.title, cols[0] - 4)[0] as string;
      doc.textWithLink(title, MARGIN + 2, y, { url: resource.url });

      doc.setTextColor(...MUTED);
      doc.text(resource.type, MARGIN + cols[0] + 2, y);
      doc.text(resource.language.toUpperCase(), MARGIN + cols[0] + cols[1] + 2, y);

      y += rowHeight;
    });

    y += 3;
  }

  function linesFor(text: string, size: number, style = "normal") {
    doc.setFont(FONT, style);
    doc.setFontSize(size);
    return (doc.splitTextToSize(text, usable) as string[]).length;
  }

  /** Height of one skill block, so it is never split across a page break. */
  function skillHeight(skill: Report["recommendations"][number]) {
    let h = 9 + 7 + 8; // rule + title row + trend pill

    if (skill.reason) h += linesFor(skill.reason, 9.5) * 5 + 2;

    if (skill.resources.length > 0) h += 5 + 7 + skill.resources.length * 7 + 3;
    else h += 5 + 2;

    return h;
  }

  brandHeader();

  doc.setFont(FONT, "bold");
  doc.setFontSize(20);
  doc.setTextColor(...NAVY);
  doc.text(report.target_roles.join(", "), MARGIN, y);
  y += 8;

  paragraph(
    `${labels.roles}: ${report.target_roles.join(", ")}  •  ${labels.generatedOn}: ${new Date().toLocaleDateString()}`,
    9,
    MUTED
  );
  y += 2;

  if (report.summary) {
    paragraph(report.summary, 10, INK, "normal", 5);
    y += 4;
  }

  for (const skill of report.recommendations) {
    const needed = skillHeight(skill);
    const pageSpace = height - MARGIN - (HEADER_HEIGHT + 12);

    // Only force a break when the skill could actually fit on a fresh page —
    // otherwise a very long one would page-break forever.
    if (y + needed > height - MARGIN && needed <= pageSpace) newPage();

    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, y, width - MARGIN, y);
    y += 9;

    // Rank badge, matching the numbered circles on the roadmap page.
    doc.setFillColor(...NAVY);
    doc.circle(MARGIN + 3.5, y - 1.5, 3.5, "F");
    doc.setFont(FONT, "bold");
    doc.setFontSize(8);
    doc.setTextColor(...CREAM);
    doc.text(String(skill.rank), MARGIN + 3.5, y - 1.5, {
      align: "center",
      baseline: "middle",
    });

    doc.setFontSize(14);
    doc.setTextColor(...NAVY);
    doc.text(skill.skill, MARGIN + 10, y);

    if (completed.has(skill.skill)) {
      doc.setFont(FONT, "bold");
      doc.setFontSize(8);
      doc.setTextColor(...BLUE);
      doc.text(labels.completed.toUpperCase(), width - MARGIN, y, { align: "right" });
    }

    y += 7;

    pill(`${labels.trend}: ${trendLabels[skill.trend] ?? skill.trend}`);

    if (skill.reason) {
      paragraph(skill.reason, 9.5, INK);
      y += 2;
    }

    if (skill.resources.length > 0) {
      paragraph(labels.resources, 9, NAVY, "bold", 5);
      resourceTable(skill.resources);
    }
    else {
      paragraph(labels.noResources, 8.5, MUTED);
      y += 2;
    }
  }

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.setFont(FONT, "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(`${i} / ${pages}`, width - MARGIN, height - 8, { align: "right" });
  }

  const roles = report.target_roles.join("-").replace(/\s+/g, "_");
  doc.save(`calibrate-roadmap-${roles}.pdf`);
}
