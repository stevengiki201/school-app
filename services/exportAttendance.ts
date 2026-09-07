import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
// SDK 54 moved the classic API to the /legacy subpath — this file uses
// documentDirectory/writeAsStringAsync, which only exist there.
import * as FileSystem from "expo-file-system/legacy";
import dayjs from "dayjs";
import { Alert, Platform } from "react-native";
import { rootStore } from "@/components/models";
import { ensureDayjsPlugins } from "@/services/dayjsSetup";

// Parsing "DD-MM-YYYY" strings needs the customParseFormat plugin — see dayjsSetup.ts.
ensureDayjsPlugins();

export type ExportFormat = "pdf" | "word" | "excel";
/** "taken" = only dates where attendance was recorded; "all" = every date in range. */
export type DateMode = "taken" | "all";

export interface ExportOptions {
  darasaId: string | null;
  dateMode: DateMode;
}

export function alertMessage(title: string, message: string) {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

/** Saved attendance rows (isSaved === true) inside [start, end], formatted DD-MM-YYYY. */
export function getAttendanceInRange(start: string, end: string, darasaId?: string | null) {
  const s = dayjs(start, "DD-MM-YYYY").startOf("day");
  const e = dayjs(end, "DD-MM-YYYY").endOf("day");
  const darasa = darasaId ? rootStore.darasas.find((d: any) => d.id === darasaId) : null;
  const studentIds = darasa ? new Set(darasa.students.map((st: any) => st.id)) : null;
  return rootStore.attendances.filter((att: any) => {
    if (!att.isSaved) return false;
    if (studentIds && !studentIds.has(att.student?.id)) return false;
    const parsed = dayjs(att.date, "DD-MM-YYYY");
    // Inclusive on both ends: records ON the start/end date must be included
    // (the UI defaults the range to end today, so today's records land on the
    // end boundary and would otherwise be silently dropped).
    if (!parsed.isValid()) return false;
    return !parsed.isBefore(s, "day") && !parsed.isAfter(e, "day");
  });
}

/**
 * Date series for the report columns.
 * "all" lists every calendar date in the range (even without attendance),
 * "taken" lists only dates where the teacher took attendance.
 */
export function getDateSeries(
  start: string,
  end: string,
  mode: DateMode,
  rows: any[]
): string[] {
  if (mode === "taken") {
    return Array.from(new Set(rows.map((r) => r.date))).sort(
      (a, b) => dayjs(a, "DD-MM-YYYY").valueOf() - dayjs(b, "DD-MM-YYYY").valueOf()
    );
  }
  const series: string[] = [];
  let cursor = dayjs(start, "DD-MM-YYYY");
  const last = dayjs(end, "DD-MM-YYYY");
  while (cursor.isBefore(last) || cursor.isSame(last, "day")) {
    series.push(cursor.format("DD-MM-YYYY"));
    cursor = cursor.add(1, "day");
  }
  return series;
}

/** Aggregated per-student totals for a class within the date range. */
export function getClassSummary(darasa: any, start: string, end: string) {
  const rows = getAttendanceInRange(start, end, darasa.id);
  return darasa.students.map((student: any) => {
    const mine = rows.filter((att: any) => att.student?.id === student.id);
    const present = mine.filter((a: any) => a.status === "present").length;
    const absentCount = mine.filter((a: any) => a.status === "absent").length;
    const sick = mine.filter((a: any) => a.status === "sick").length;
    const total = present + absentCount + sick;
    return {
      student,
      present,
      absent: absentCount,
      sick,
      total,
      rate: total > 0 ? Math.round((present / total) * 100) : 0,
      rows: mine,
    };
  });
}

/** Per-date counts used by the attendance-listings modal. */
export function getDateListings(start: string, end: string, darasaId?: string | null) {
  const rows = getAttendanceInRange(start, end, darasaId);
  const dates = Array.from(new Set(rows.map((r: any) => r.date))).sort(
    (a, b) => dayjs(a, "DD-MM-YYYY").valueOf() - dayjs(b, "DD-MM-YYYY").valueOf()
  );
  return dates.map((date) => {
    const dayRows = rows.filter((r: any) => r.date === date);
    return {
      date,
      present: dayRows.filter((r: any) => r.status === "present").length,
      absent: dayRows.filter((r: any) => r.status === "absent").length,
      sick: dayRows.filter((r: any) => r.status === "sick").length,
    };
  });
}

/** "JUNE 2026" or "JUNE - JULY 2026" for a date range. */
function monthRangeLabel(start: string, end: string): string {
  const s = dayjs(start, "DD-MM-YYYY");
  const e = dayjs(end, "DD-MM-YYYY");
  if (s.isSame(e, "month")) return `${s.format("MMMM").toUpperCase()} ${s.format("YYYY")}`;
  const sameYear = s.format("YYYY") === e.format("YYYY");
  return `${s.format("MMMM").toUpperCase()} - ${e.format("MMMM").toUpperCase()} ${
    sameYear ? s.format("YYYY") : `${s.format("YYYY")} - ${e.format("YYYY")}`
  }`;
}

/** Marks used in the date cells: ✓ present, X absent, S permission/sick. */
const MARKS: Record<string, string> = { present: "✓", absent: "X", sick: "S" };

/** Build the printable HTML report per the Exports Trend model. */
export function buildReportHtml(start: string, end: string, options: ExportOptions) {
  const { authUser } = rootStore;
  const darasa = options.darasaId
    ? rootStore.darasas.find((d: any) => d.id === options.darasaId)
    : null;

  const rows = getAttendanceInRange(start, end, options.darasaId);
  const dates = getDateSeries(start, end, options.dateMode, rows);
  const summary = darasa ? getClassSummary(darasa, start, end) : [];

  const header = `<tr><th>#</th><th class="name">Student</th>${dates
    .map((d) => `<th class="datecol">${d}</th>`)
    .join("")}<th>P</th><th>A</th><th>S</th></tr>`;

  const body = summary
    .map((s: any, i: number) => {
      const cells = dates
        .map((d) => {
          const rec = s.rows.find((r: any) => r.date === d);
          if (!rec) return `<td class="nodata">—</td>`;
          return `<td class="mark-${rec.status}">${MARKS[rec.status] ?? "-"}</td>`;
        })
        .join("");
      return `<tr>
        <td>${i + 1}</td>
        <td class="name">${s.student.full_name}</td>
        ${cells}
        <td>${s.present}</td>
        <td>${s.absent}</td>
        <td>${s.sick}</td>
      </tr>`;
    })
    .join("");

  // End-of-report summary
  const totalP = summary.reduce((a: number, s: any) => a + s.present, 0);
  const totalA = summary.reduce((a: number, s: any) => a + s.absent, 0);
  const totalS = summary.reduce((a: number, s: any) => a + s.sick, 0);
  const grand = totalP + totalA + totalS;
  const rate = grand > 0 ? Math.round((totalP / grand) * 100) : 0;
  const summaryBlock = `
  <div class="summary">
    <div class="summary-title">SUMMARY</div>
    <table class="summary-table">
      <tr><td>Total days considered</td><td class="num">${dates.length}</td></tr>
      <tr><td>Total presentees</td><td class="num">${totalP}</td></tr>
      <tr><td>Total absentees</td><td class="num">${totalA}</td></tr>
      <tr><td>Total permissions (sick)</td><td class="num">${totalS}</td></tr>
      <tr class="highlight"><td>Overall attendance rate</td><td class="num">${rate}%</td></tr>
    </table>
  </div>`;

  const school = authUser?.school_name ?? "ShuleBomba";
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { font-family: Helvetica, Arial, sans-serif; padding: 24px; color: #111; }
  .banner { text-align: center; border: 2px solid #111; padding: 10px 0; margin-bottom: 14px; }
  .banner h1 { font-size: 22px; margin: 0; letter-spacing: 2px; }
  .banner h2 { font-size: 14px; margin: 4px 0 0; letter-spacing: 1px; font-weight: 600; }
  .meta { text-align: center; color: #444; font-size: 12px; margin-bottom: 14px; }
  table { border-collapse: collapse; width: 100%; font-size: 10px; }
  th, td { border: 1px solid #555; padding: 4px 6px; text-align: center; }
  th { background: #111; color: #fff; }
  td.name, th.name { text-align: left; min-width: 120px; }
  th.datecol { font-size: 9px; padding: 3px 4px; }
  .mark-present { color: #15803d; font-weight: 700; }
  .mark-absent { color: #b91c1c; font-weight: 700; }
  .mark-sick { color: #1d4ed8; font-weight: 700; }
  .nodata { color: #bbb; }
  .summary { margin-top: 18px; page-break-inside: avoid; }
  .summary-title { font-size: 13px; font-weight: 800; letter-spacing: 1px; margin-bottom: 6px; }
  .summary-table { width: 320px; font-size: 11px; }
  .summary-table td { border: 1px solid #999; padding: 5px 8px; text-align: left; }
  .summary-table td.num { text-align: right; font-weight: 700; }
  .summary-table tr.highlight td { background: #e5e7eb; font-weight: 700; }
  .foot { margin-top: 12px; font-size: 10px; color: #666; text-align: center; }
</style>
</head>
<body>
  <div class="banner">
    <h1>${monthRangeLabel(start, end)}</h1>
    <h2>FROM ${darasa ? darasa.name.toUpperCase() : "—"} &nbsp;•&nbsp; ATTENDANCE</h2>
  </div>
  <div class="meta">${school} &nbsp;|&nbsp; Period: ${start} to ${end} &nbsp;|&nbsp; Generated: ${dayjs().format(
    "DD-MM-YYYY HH:mm"
  )}</div>
  <table>
    ${header}
    ${
      rows.length === 0
        ? `<tr><td colspan="999">No saved attendance records in this period.</td></tr>`
        : body
    }
  </table>
  ${summaryBlock}
  <div class="foot">✓ = Present, X = Absent, S = Permission/Sick, — = no attendance recorded.</div>
  <div class="foot">Generated by ShuleBomba — Class Management System</div>
</body>
</html>`;
}

/** Ensure the exports folder exists and return its path. */
async function ensureExportDir(): Promise<string | null> {
  try {
    const dir = (FileSystem as any).documentDirectory
      ? `${(FileSystem as any).documentDirectory}exports/`
      : null;
    if (!dir) return null;
    const info = await (FileSystem as any).getInfoAsync(dir);
    if (!info.exists) {
      await (FileSystem as any).makeDirectoryAsync(dir, { intermediates: true });
    }
    return dir;
  } catch {
    return null;
  }
}

async function shareOrAlert(fileUri: string, format: ExportFormat) {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    alertMessage("Sharing unavailable", `Report saved to ${fileUri}`);
    return;
  }
  const mime =
    format === "excel"
      ? "application/vnd.ms-excel"
      : format === "word"
      ? "application/msword"
      : "application/pdf";
  const uti =
    format === "excel"
      ? "com.microsoft.excel.xls"
      : format === "word"
      ? "com.microsoft.word.doc"
      : "com.adobe.pdf";
  await Sharing.shareAsync(fileUri, { mimeType: mime, dialogTitle: `Share ${format} report`, UTI: uti });
}

/** Generate the report for the chosen format and open the share sheet. */
export async function exportAttendance(
  format: ExportFormat,
  start: string,
  end: string,
  options: ExportOptions
) {
  const html = buildReportHtml(start, end, options);
  const safeStart = start.replace(/\D/g, "");
  const safeEnd = end.replace(/\D/g, "");
  const className = (options.darasaId ?? "all").replace(/[^\w-]/g, "");

  try {
    if (format === "pdf") {
      const { uri } = await Print.printToFileAsync({ html });
      await shareOrAlert(uri, format);
      return;
    }

    const dir = await ensureExportDir();
    const ext = format === "word" ? "doc" : "xls";
    const fileUri = `${dir ?? ""}ShuleBomba_${className}_${format}_${safeStart}-${safeEnd}.${ext}`;

    // Word & Excel both open HTML content saved with their native extension.
    const ns =
      format === "word"
        ? 'xmlns:w="urn:schemas-microsoft-com:office:word"'
        : 'xmlns:x="urn:schemas-microsoft-com:office:excel"';
    const docHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" ${ns}><head><meta charset="utf-8"><title>Attendance Report</title></head><body>${html}</body></html>`;

    await (FileSystem as any).writeAsStringAsync(fileUri, docHtml, {
      encoding: (FileSystem as any).EncodingType?.UTF8 ?? "utf8",
    });

    await shareOrAlert(fileUri, format);
  } catch (e) {
    alertMessage(
      "Export failed",
      e instanceof Error ? e.message : "Something went wrong while exporting."
    );
  }
}
