/**
 * "Does Excel import handle a large sheet, and does every imported student
 * get a unique id?"
 *
 * Exercises the actual import pipeline from the Add Student screen:
 *   workbook -> XLSX.read(base64) -> utils.sheet_to_json -> row mapping
 *   -> darasa.addStudentsBulk (which routes every row through addStudent)
 *
 * The row mapping below mirrors the importer's accepted header spellings
 * (Full Name / Name, Sex / Gender, Registration No / Reg No) on purpose, so a
 * file produced by the app's own template round-trips the same way it would on
 * a device.
 */
import * as XLSX from "xlsx";
import { rootStore } from "@/components/models";

/** Same normalization the Add Student screen applies to a Sex cell. */
function parseSex(raw: any): string {
  const v = String(raw ?? "").trim().toLowerCase();
  if (["male", "m", "boy", "mans"].includes(v)) return "male";
  if (["female", "f", "girl", "womans"].includes(v)) return "female";
  return "";
}

/** Same header mapping the Add Student screen applies to each sheet row. */
function rowsFromSheet(raw: any[]) {
  const firstFilled = (...vals: any[]) =>
    vals.find((v) => v !== undefined && v !== null && String(v).trim() !== "");
  return raw.map((row) => {
    const fullName = String(firstFilled(row["Full Name"], row["Full name"], row["Name"], row["name"]) ?? "").trim();
    const rawSex = firstFilled(row["Sex"], row["sex"], row["Gender"], row["gender"]);
    const reg_no = String(
      firstFilled(row["Registration No"], row["Registration No."], row["Reg No"], row["Reg"], row["reg_no"]) ?? ""
    ).trim();
    return { full_name: fullName, sex: parseSex(rawSex), reg_no };
  });
}

const VALID_ROWS = 1000;
const EMPTY_NAME_ROWS = 10;
const DUP_REG_ROWS = 10;

/**
 * Builds a base64 workbook like the one FS.readAsStringAsync feeds to
 * XLSX.read in the importer: a big sheet plus edge-case rows.
 */
function buildWorkbookBase64(): string {
  const rows: { "Full Name": string; Sex: string; "Registration No": string }[] = [];
  for (let i = 1; i <= VALID_ROWS; i++) {
    rows.push({
      "Full Name": `Student ${i}`,
      Sex: i % 3 === 0 ? "Male" : i % 3 === 1 ? "Female" : "", // some rows blank
      "Registration No": String(100 + i),
    });
  }
  for (let i = 0; i < DUP_REG_ROWS; i++) {
    rows.push({ "Full Name": `Dup ${i}`, Sex: "m", "Registration No": "105" }); // duplicate of a valid reg
  }
  for (let i = 0; i < EMPTY_NAME_ROWS; i++) {
    rows.push({ "Full Name": "   ", Sex: "female", "Registration No": String(6000 + i) }); // blank names
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Students");
  return XLSX.write(wb, { type: "base64", bookType: "xlsx" });
}

function readAllStudentIds(): Set<string> {
  const ids = new Set<string>();
  for (const darasa of rootStore.darasas) {
    for (const student of darasa.students) ids.add(student.id);
  }
  return ids;
}

beforeEach(() => {
  rootStore.resetStore();
});

describe("Excel import with a large sheet", () => {
  it("imports every valid row and skips empty/duplicate rows", () => {
    rootStore.addDarasa("class-1", "Grade 4 Blue");
    rootStore.setSelectedDarasa("class-1");

    const base64 = buildWorkbookBase64();
    // Same read call the importer performs after picking the file.
    const wb = XLSX.read(base64, { type: "base64" });
    const raw: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });

    const darasa = rootStore.selectedDarasa!;
    const outcome = darasa.addStudentsBulk(rowsFromSheet(raw));

    expect(outcome.added).toBe(VALID_ROWS);
    expect(outcome.skipped).toBe(EMPTY_NAME_ROWS + DUP_REG_ROWS);
    expect(darasa.students).toHaveLength(VALID_ROWS);
  });

  it("gives every imported student a unique id", () => {
    rootStore.addDarasa("class-1", "Grade 4 Blue");
    rootStore.setSelectedDarasa("class-1");
    const base64 = buildWorkbookBase64();
    const wb = XLSX.read(base64, { type: "base64" });
    const raw: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });

    rootStore.selectedDarasa!.addStudentsBulk(rowsFromSheet(raw));

    const darasa = rootStore.selectedDarasa!;
    const ids = new Set(darasa.students.map((s) => s.id));
    expect(ids.size).toBe(darasa.students.length);
  });

  it("keeps ids unique across classes importing the same sheet in the same run", () => {
    const base64 = buildWorkbookBase64();
    const wb = XLSX.read(base64, { type: "base64" });
    const raw: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
    const rows = rowsFromSheet(raw);

    rootStore.addDarasa("class-1", "Grade 4 Blue");
    rootStore.setSelectedDarasa("class-1");
    rootStore.selectedDarasa!.addStudentsBulk(rows);

    rootStore.addDarasa("class-2", "Grade 5 Green");
    rootStore.setSelectedDarasa("class-2");
    rootStore.selectedDarasa!.addStudentsBulk(rows);

    const globalIds = readAllStudentIds();
    expect(globalIds.size).toBe(VALID_ROWS * 2); // no id shared between classes
  });

  it("normalizes sex and keeps the reg_no the sheet provided (or falls back to the id)", () => {
    rootStore.addDarasa("class-1", "Grade 4 Blue");
    rootStore.setSelectedDarasa("class-1");
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([
        { "Full Name": "Amina Juma", Sex: "F", "Registration No": "" },
        { "Full Name": "Baraka Mushi", Gender: "Boy", "Reg No": "009" },
      ]),
      "Students"
    );
    const base64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
    const parsed = XLSX.read(base64, { type: "base64" });
    const raw: any[] = XLSX.utils.sheet_to_json(parsed.Sheets[parsed.SheetNames[0]], { defval: "" });

    rootStore.selectedDarasa!.addStudentsBulk(rowsFromSheet(raw));

    const students = rootStore.selectedDarasa!.students;
    expect(students[0].sex).toBe("female"); // "F" normalized
    expect(students[1].sex).toBe("male"); // "Boy" via the Gender column
    expect(students[0].reg_no).toBe(students[0].id); // empty reg falls back to id
    expect(students[1].reg_no).toBe("009");
  });
});
