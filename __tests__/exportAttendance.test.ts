/**
 * "Does export work when there is saved attendance?"
 *
 * Seeds a real MobX-State-Tree store (same store model the app uses) with a
 * class, students, and SAVED attendance records, then runs the real export
 * pipeline from services/exportAttendance.ts:
 *   getAttendanceInRange -> buildReportHtml -> exportAttendance (pdf/word/excel)
 */
import {
  exportAttendance,
  getAttendanceInRange,
  buildReportHtml,
  getDateListings,
} from "@/services/exportAttendance";
import { rootStore } from "@/components/models";

const { printToFileAsync } = jest.requireMock("expo-print") as { printToFileAsync: jest.Mock };
const { shareAsync, isAvailableAsync } = jest.requireMock("expo-sharing") as {
  shareAsync: jest.Mock;
  isAvailableAsync: jest.Mock;
};
const FS = jest.requireMock("expo-file-system") as {
  writeAsStringAsync: jest.Mock;
};

function seedStore() {
  rootStore.resetStore();
  rootStore.setAuthUser({ username: "teacher1", school_name: "Mwenge Primary" });
  rootStore.addDarasa("class-1", "Grade 4 Blue");
  rootStore.setSelectedDarasa("class-1");
  const darasa = rootStore.selectedDarasa!;
  darasa.addStudent("Amina Juma");
  darasa.addStudent("Baraka Mushi");
  rootStore.setSelectedDate("01-09-2026");
  // Take attendance like the Attendance screen does (unsaved drafts).
  darasa.students[0].setAttendanceStatus("present", "01-09-2026");
  darasa.students[1].setAttendanceStatus("absent", "01-09-2026");
  rootStore.saveAttendance(); // marks isSaved=true for 01-09-2026
  // A second saved day
  rootStore.setSelectedDate("02-09-2026");
  darasa.students[0].setAttendanceStatus("sick", "02-09-2026");
  darasa.students[1].setAttendanceStatus("present", "02-09-2026");
  rootStore.saveAttendance();
  // An UNSAVED draft on another date — must be excluded from exports.
  darasa.students[0].setAttendanceStatus("present", "03-09-2026");
}

beforeEach(() => {
  jest.clearAllMocks();
  seedStore();
});

describe("export with saved attendance", () => {
  it("finds saved records in range and excludes unsaved drafts", () => {
    const rows = getAttendanceInRange("01-09-2026", "05-09-2026", "class-1");
    expect(rows).toHaveLength(4); // 2 students x 2 saved days
    expect(rows.every((r: any) => r.isSaved)).toBe(true);
    expect(rows.every((r: any) => r.date !== "03-09-2026")).toBe(true);
  });

  it("includes records dated exactly on the start/end boundary (regression)", () => {
    // The exports screen defaults to a range ending today; attendance saved
    // today sits on the end boundary and must be found.
    const onEnd = getAttendanceInRange("01-09-2026", "02-09-2026", "class-1");
    expect(onEnd.map((r: any) => r.date)).toContain("02-09-2026");
    const onStart = getAttendanceInRange("02-09-2026", "05-09-2026", "class-1");
    expect(onStart.map((r: any) => r.date)).toContain("02-09-2026");
    expect(getAttendanceInRange("01-09-2026", "05-09-2026", "class-1")).toHaveLength(4);
  });

  it("getDateListings returns one entry per saved date with correct counts", () => {
    const listings = getDateListings("01-09-2026", "05-09-2026", "class-1");
    expect(listings.map((l: any) => l.date)).toEqual(["01-09-2026", "02-09-2026"]);
    expect(listings[0]).toMatchObject({ present: 1, absent: 1, sick: 0 });
    expect(listings[1]).toMatchObject({ present: 1, absent: 0, sick: 1 });
  });

  it("builds a report with student rows, per-date columns and a summary", () => {
    const html = buildReportHtml("01-09-2026", "05-09-2026", { darasaId: "class-1", dateMode: "taken" });
    expect(html).toContain("Amina Juma");
    expect(html).toContain("Baraka Mushi");
    expect(html).toContain("01-09-2026");
    expect(html).toContain("mark-present");
    expect(html).toContain("SUMMARY");
    expect(html).toContain("Overall attendance rate");
    // Date mode "all" should produce every calendar day column, even empty ones
    const htmlAll = buildReportHtml("01-09-2026", "05-09-2026", { darasaId: "class-1", dateMode: "all" });
    expect(htmlAll).toContain("05-09-2026");
  });

  it("exports to PDF via expo-print + share sheet", async () => {
    printToFileAsync.mockResolvedValueOnce({ uri: "/tmp/report.pdf" });
    await exportAttendance("pdf", "01-09-2026", "05-09-2026", { darasaId: "class-1", dateMode: "all" });
    expect(printToFileAsync).toHaveBeenCalledTimes(1);
    const htmlArg = printToFileAsync.mock.calls[0][0].html;
    expect(htmlArg).toContain("Amina Juma");
    expect(shareAsync).toHaveBeenCalledWith(
      "/tmp/report.pdf",
      expect.objectContaining({ mimeType: "application/pdf" })
    );
  });

  it("exports to Word and Excel by writing HTML files and sharing them", async () => {
    await exportAttendance("word", "01-09-2026", "05-09-2026", { darasaId: "class-1", dateMode: "taken" });
    expect(FS.writeAsStringAsync).toHaveBeenCalledTimes(1);
    let [uri, content] = FS.writeAsStringAsync.mock.calls[0];
    expect(uri).toMatch(/\.doc$/);
    expect(content).toContain("Amina Juma");
    expect(shareAsync).toHaveBeenLastCalledWith(uri, expect.objectContaining({ mimeType: "application/msword" }));

    await exportAttendance("excel", "01-09-2026", "05-09-2026", { darasaId: "class-1", dateMode: "taken" });
    expect(FS.writeAsStringAsync).toHaveBeenCalledTimes(2);
    [uri, content] = FS.writeAsStringAsync.mock.calls[1];
    expect(uri).toMatch(/\.xls$/);
    expect(content).toContain("Baraka Mushi");
    expect(shareAsync).toHaveBeenLastCalledWith(uri, expect.objectContaining({ mimeType: "application/vnd.ms-excel" }));
  });

  it("exports nothing gracefully when the range has no saved attendance", async () => {
    const rows = getAttendanceInRange("01-01-2020", "05-01-2020", "class-1");
    expect(rows).toHaveLength(0);
    const html = buildReportHtml("01-01-2020", "05-01-2020", { darasaId: "class-1", dateMode: "all" });
    expect(html).toContain("No saved attendance records in this period.");
  });

  it("works when sharing is unavailable (file path fallback)", async () => {
    isAvailableAsync.mockResolvedValueOnce(false);
    printToFileAsync.mockResolvedValueOnce({ uri: "/docs/exports/report.pdf" });
    await exportAttendance("pdf", "01-09-2026", "05-09-2026", { darasaId: "class-1", dateMode: "all" });
    expect(shareAsync).not.toHaveBeenCalled();
  });
});
