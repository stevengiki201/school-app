import { set } from "mobx";
import { applySnapshot } from "mobx-state-tree"
import { getRoot, onSnapshot, types } from "mobx-state-tree"; // alternatively: import { t } from "mobx-state-tree"
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthUserModel = types.model('AuthUserModel', {
  username: types.identifier,
  password: types.optional(types.string, ""),
  school_name: types.string,

});


const StudentModel = types
  .model('StudentModel', {
    id: types.identifier,
    full_name: types.string,
  }).views((self) => ({
    get status() {
        const root = getRoot(self) as any;
        const {selectedDate, attendances} = root;
      return attendances.find((att: any) => att.student?.id === self.id && att.date === selectedDate)?.status;
    },
      get isSaved() {
        const root = getRoot(self) as any;
        const {selectedDate, attendances} = root;
      return attendances.find((att: any) => att.student?.id === self.id && att.date === selectedDate)?.isSaved;
    }
  }
  ))
  .actions((self) => ({
    setFullName(value: string) {
      self.full_name = value;
    },
    getAttendanceStatus(){
      const root = getRoot(self) as any;
      const {selectedDate, attendances} = root;
      return attendances.find((att: any) => att.student?.id === self.id && att.date === selectedDate)?.status;
    },
    setAttendanceStatus(status: string, date: string){
      const root = getRoot(self) as any;
      const {addAttendance} = root;
      addAttendance(self.id, date, status);
    },

  }));
  const TestScore = types.model("TestScore", {
  id: types.identifier,
  studentId: types.string,
  marks: types.number
})
.actions(self => ({
  setMarks(value: number) {
    self.marks = value
  }
}))
const TestModel = types
.model("TestModel", {
  id: types.identifier,
  testname: types.string,
  scores: types.array(TestScore)
})
.actions(self => ({
  setTestName(value: string) {
    self.testname = value
  },

  addScore(studentId: string, marks: number) {
    const existing = self.scores.find(
      s => s.studentId === studentId
    )

    if (existing) {
      existing.setMarks(marks)
    } else {
      // Use a unique ID per score so rapid inserts don't collide.
      const id = `${studentId}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`
      self.scores.push({
        id,
        studentId,
        marks
      })
    }
  }
}))

const DarasaModel = types
  .model('DarasaModel', {
    id: types.identifier,
    name: types.string,
    created_by: types.reference(AuthUserModel),
    students: types.array(StudentModel),
    tests: types.array(TestModel),
  })
  .actions((self) => ({
    addStudent(full_name: string) {
      const student = StudentModel.create({
        full_name,
        id: `${Date.now()}`,
      });
      self.students.push(student);
    },
      
    
    removeStudent(studentId: string) {
      const root = getRoot(self) as any;
      const {attendances,removeAttendance} = root;
      const index = self.students.findIndex((s) => s.id === studentId);
      if (index > -1) {
        const student = self.students[index];
        //TODO: find and delete all attendances related to this student
        const studentAttendances = attendances.filter((att: any) => att.student?.id === student.id);
        studentAttendances.forEach((att: any) => removeAttendance(att.id));
        self.students.splice(index, 1);
      } 
    },
    addTest(testName: string, marksMap: { [studentId: string]: number }) {
      const testId = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
      const newTest = TestModel.create({
        id: testId,
        testname: testName,
        scores: []
      });
      
      // Add scores only for students that have a mark entered
      self.students.forEach(student => {
        const marks = marksMap[student.id];
        if (marks !== undefined && marks !== null) {
          newTest.addScore(student.id, marks);
        }
      });
      
      self.tests.push(newTest);
    },
    setName(value: string) {
      self.name = value;
    },
  }));

const Attendance = types.model('Attendance', {
  id: types.identifier,
  student: types.safeReference(StudentModel),
  date: types.string,
  status: types.string,
  isSaved: types.optional(types.boolean, false),
})  .actions((self) => ({
    setStatus(value: string) {
      self.status = value;
    },
    setIsSaved(value: boolean) {
      self.isSaved = value;
    }
  }));

  
// Define a store just like a model
const RootStoreModel = types
  .model('RootStoreModel', {
    authUser: types.maybeNull(AuthUserModel),
    darasas: types.array(DarasaModel),
    students: types.array(DarasaModel),
    attendances: types.array(Attendance),
    selectedStudent: types.maybeNull(types.safeReference(StudentModel)),
    selectedDarasa: types.maybeNull(types.safeReference(DarasaModel)),
    selectedDate: types.maybeNull(types.string),
    tests:types.array(TestModel),
    avatar: types.maybeNull(types.string),

    theme: types.optional(types.enumeration('theme', ['light', 'dark', 'system']), 'system'),
  })
  .actions((self) => ({
    setAvatar(uri: string | null) {
      self.avatar = uri;
    },
    setTheme(themeMode: 'light' | 'dark' | 'system') {
      self.theme = themeMode;
    },
    setSelectedDarasa(value: string | null) {
      // safeReference stores a Darasa id string (identifier)
      self.selectedDarasa = value as unknown as typeof self.selectedDarasa;
    },
    setAuthUser(user: any) {
      const prev = self.authUser;
      self.authUser = {
        username: user.username,
        password: user.password ?? prev?.password ?? "",
        school_name: user.school_name,
      };
    },
    setSelectedStudent(student: any) {
      self.selectedStudent = student;
    },
    setSelectedDate(date: string) {
      self.selectedDate = date;
    },
    addDarasa(id: any,name:any) {
      const creator = self.authUser?.username ?? "steve";
      self.darasas.push({ id, name, created_by: creator, students: [], tests: [] });
      self.selectedDarasa = id;
    },
   addTest(id: string, testname: string) {
  self.tests.push({
    id,
    testname,
    scores: []
  })
},
  

removeDarasa(darasa: string) {
  const index = self.darasas.findIndex((s) => s.id === darasa);
  console.log("Removing darasa with id:", darasa, "at index:", index);
  if (index > -1) {
    self.darasas.splice(index, 1);
  } 
},
  updateDarasa(id: string, name: string) {
    const darasa = self.darasas.find((s) => s.id === id);
    if (darasa) {
      darasa.setName(name);
    }
  },
  updateStudent(studentId: string, fullName: string) {
    for (const darasa of self.darasas) {
      const student = darasa.students.find((s) => s.id === studentId);
      if (student) {
        student.setFullName(fullName);
        return;
      }
    }
  },
  removeAttendance(attendanceId: string) {
    const index = self.attendances.findIndex((s) => s.id === attendanceId);
    if (index > -1) {
      self.attendances.splice(index, 1);
    }
  },
  addAttendance(studentId: string, date: string, status: string) {
    
    const attendance = self.attendances.find(
      (att) => att.student?.id === studentId && att.date === date
    );
    
    if(attendance){
      attendance.setStatus(status);
    }else{
      self.attendances.push({
        id: `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`,
        student: studentId,
        date,
        status,
      });
    }
  },
  

  
  resetStore() {
  applySnapshot(self, {
    authUser: null,
    darasas: [],
    tests:[],
    students: [],
    attendances: [],
    selectedDarasa: null,
  })
},
  saveAttendance() {
    const {selectedDate, selectedDarasa, attendances} = self;
    if(!selectedDarasa || !selectedDate) return;
    selectedDarasa.students.forEach((student) => {
      const attendance = attendances.find(
        (att) => att.student?.id === student.id && att.date === selectedDate
      );
      if(attendance){
        attendance.setIsSaved(true);
      }
    });
  }
  }));

export const rootStore = RootStoreModel.create({
  authUser: null,
  darasas: [],
  students: [],
  attendances: [],
  selectedDarasa: null,
  tests:[],
  theme: 'light',
});

onSnapshot(rootStore, (snapshot) => {
  AsyncStorage.setItem("rootStore", JSON.stringify(snapshot));
});
