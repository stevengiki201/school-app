/**
 * Snapshot migration for stores written by older app versions.
 *
 * Older installs saved classes with no `subjects` list and tests with no
 * `subject`; some snapshots even contain a class with no name. MST refuses to
 * apply a snapshot whose required fields are missing, which would leave every
 * one of those classes unreachable after an update. migrateSnapshot()
 * normalizes the stored JSON into the current shape and never throws.
 */

/** Subject assigned to tests saved before subjects existed. */
export const LEGACY_SUBJECT = "General";

const asString = (value: unknown, fallback = "") =>
  typeof value === "string"
    ? value
    : value === null || value === undefined
      ? fallback
      : String(value);

const asTrimmed = (value: unknown, fallback = "") =>
  asString(value).trim() || fallback;

const asRecord = (value: unknown): Record<string, any> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : null;

/** Keep an id unique inside one set, appending a counter when it collides. */
function uniqueId(base: string, used: Set<string>): string {
  let id = base;
  let n = 1;
  while (used.has(id)) {
    id = `${base}-${++n}`;
  }
  used.add(id);
  return id;
}

interface SanitizedSubject {
  id: string;
  name: string;
}

/**
 * Convert a stored snapshot into the current RootStore shape.
 * Returns null when the value is not a usable snapshot.
 */
export function migrateSnapshot(raw: unknown): any | null {
  const data = asRecord(raw);
  if (!data) return null;

  const rawDarasas = Array.isArray(data.darasas) ? data.darasas : [];

  // Classes reference an auth user. If a snapshot has classes but no user,
  // create a placeholder so the reference resolves and the classes stay usable.
  let authUser: { username: string; password: string; school_name: string } | null = null;
  const storedUser = asRecord(data.authUser);
  if (storedUser && asTrimmed(storedUser.username)) {
    authUser = {
      username: asTrimmed(storedUser.username),
      password: asString(storedUser.password),
      school_name: asTrimmed(storedUser.school_name, "ShuleBomba"),
    };
  } else if (rawDarasas.length > 0) {
    const first = asRecord(rawDarasas[0]);
    authUser = {
      username: asTrimmed(first?.created_by, "user"),
      password: "",
      school_name: "ShuleBomba",
    };
  }

  const usedClassIds = new Set<string>();

  const darasas = rawDarasas
    .map((rawClass, classIndex) => {
      const source = asRecord(rawClass);
      if (!source) return null;

      const id = uniqueId(
        asTrimmed(source.id, `class-${classIndex + 1}`),
        usedClassIds
      );
      // A class must have a name; classes saved without one get a readable
      // fallback instead of failing to load.
      const name = asTrimmed(source.name, `Class ${classIndex + 1}`);

      const usedStudentIds = new Set<string>();
      const students = (Array.isArray(source.students) ? source.students : [])
        .map((rawStudent, studentIndex) => {
          const student = asRecord(rawStudent);
          if (!student) return null;
          const studentId = uniqueId(
            asTrimmed(student.id, `${id}-student-${studentIndex + 1}`),
            usedStudentIds
          );
          return {
            id: studentId,
            full_name: asTrimmed(student.full_name, `Student ${studentIndex + 1}`),
            reg_no: asTrimmed(student.reg_no, studentId),
            sex: asTrimmed(student.sex),
          };
        })
        .filter(Boolean) as { id: string; full_name: string; reg_no: string; sex: string }[];

      const usedSubjectIds = new Set<string>();
      const usedSubjectNames = new Set<string>();
      const subjects: SanitizedSubject[] = [];

      const ensureSubject = (rawName: unknown) => {
        const subjectName = asTrimmed(rawName, LEGACY_SUBJECT);
        if (usedSubjectNames.has(subjectName.toLowerCase())) return subjectName;
        usedSubjectNames.add(subjectName.toLowerCase());
        subjects.push({
          id: uniqueId(
            `${id}-subject-${subjects.length + 1}`,
            usedSubjectIds
          ),
          name: subjectName,
        });
        return subjectName;
      };

      // Keep subjects the teacher already defined (order preserved, no dupes).
      (Array.isArray(source.subjects) ? source.subjects : []).forEach((rawSubject) => {
        const subject = asRecord(rawSubject);
        const subjectName = asTrimmed(subject?.name ?? rawSubject);
        if (subjectName) ensureSubject(subjectName);
      });

      const usedTestIds = new Set<string>();
      const usedScoreIds = new Set<string>();
      const studentIds = new Set(students.map((s) => s.id));

      const tests = (Array.isArray(source.tests) ? source.tests : [])
        .map((rawTest, testIndex) => {
          const test = asRecord(rawTest);
          if (!test) return null;
          const subject = ensureSubject(test.subject);

          const seenStudents = new Set<string>();
          const scores = (Array.isArray(test.scores) ? test.scores : [])
            .map((rawScore) => {
              const score = asRecord(rawScore);
              if (!score) return null;
              const studentId = asString(score.studentId);
              const marks = Number(score.marks);
              if (!studentId || !studentIds.has(studentId)) return null;
              if (!Number.isFinite(marks)) return null;
              // One score per student per test; the last stored value wins.
              if (seenStudents.has(studentId)) return null;
              seenStudents.add(studentId);
              return {
                id: uniqueId(
                  asTrimmed(score.id, `${studentId}-score`),
                  usedScoreIds
                ),
                studentId,
                marks,
              };
            })
            .filter(Boolean) as { id: string; studentId: string; marks: number }[];

          return {
            id: uniqueId(asTrimmed(test.id, `${id}-test-${testIndex + 1}`), usedTestIds),
            testname: asTrimmed(test.testname, `Test ${testIndex + 1}`),
            subject,
            scores,
          };
        })
        .filter(Boolean) as {
          id: string;
          testname: string;
          subject: string;
          scores: { id: string; studentId: string; marks: number }[];
        }[];

      return {
        id,
        name,
        created_by: authUser!.username,
        students,
        subjects,
        tests,
      };
    })
    .filter(Boolean) as any[];

  const allStudentIds = new Set(
    darasas.flatMap((d) => d.students.map((s: any) => s.id))
  );
  const classIds = new Set(darasas.map((d) => d.id));

  const attendances = (Array.isArray(data.attendances) ? data.attendances : [])
    .map((rawAttendance) => {
      const attendance = asRecord(rawAttendance);
      if (!attendance) return null;
      const studentId = asString(attendance.student);
      if (!studentId || !allStudentIds.has(studentId)) return null;
      const date = asTrimmed(attendance.date);
      if (!date) return null;
      return {
        id: asTrimmed(attendance.id, `${studentId}-${date}`),
        student: studentId,
        date,
        status: asTrimmed(attendance.status, "present"),
        isSaved: Boolean(attendance.isSaved),
      };
    })
    .filter(Boolean) as any[];

  const selectedDarasa = asString(data.selectedDarasa);
  const selectedStudent = asString(data.selectedStudent);
  const theme = ["light", "dark", "system"].includes(data.theme)
    ? data.theme
    : "system";

  return {
    authUser,
    darasas,
    // Root-level `students`/`tests` were never used; keep the arrays valid.
    students: [],
    attendances,
    selectedStudent: allStudentIds.has(selectedStudent) ? selectedStudent : null,
    selectedDarasa: classIds.has(selectedDarasa) ? selectedDarasa : null,
    selectedDate: asString(data.selectedDate) || null,
    tests: [],
    avatar: typeof data.avatar === "string" ? data.avatar : null,
    theme,
  };
}
