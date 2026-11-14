import React, { useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Alert, TouchableOpacity } from "react-native";
import { observer } from "mobx-react-lite";
import { rootStore } from "@/components/models";
import { useTheme } from "@/context/ThemeContext";
import { useRouter } from "expo-router";
import { nanoid } from "nanoid/non-secure";
import { Button, TextInput, Card, Divider, Menu, Modal } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  getCurrentTestEditRequest,
  subscribeTestEditRequest,
  clearTestEditRequest,
} from "@/context/testEditRequest";

/**
 * Add Test / Edit Test.
 *
 * One class holds many tests (DarasaModel.tests), so this screen has two
 * modes:
 *  - default: create a NEW test (never blocks a second test — "Save Test"
 *    appends to the class's tests array);
 *  - edit: preloaded from the ellipsis menu on test-score via a one-shot
 *    edit-request bus (route params go stale because the drawer keeps this
 *    screen mounted).
 *
 * Marks typed before an Edit request arrives are preserved as a draft, so
 * switching modes never destroys in-progress input.
 */
const AddTestScreen = observer(() => {
  const { selectedDarasa } = rootStore;
  const { theme } = useTheme();
  const router = useRouter();

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [subjectMenuVisible, setSubjectMenuVisible] = useState(false);
  // Fallback when the class has no subjects yet: add one without leaving.
  const [subjectModalVisible, setSubjectModalVisible] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [subjectAddedNotice, setSubjectAddedNotice] = useState<string | null>(null);
  const [marksMap, setMarksMap] = useState<{ [id: string]: string }>({});
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  // Marks captured while in edit mode, restored if the user cancels the edit.
  const draftRef = useRef<{
    name: string;
    subject: string;
    marks: { [id: string]: string };
  } | null>(null);
  // Tracks class switches so the form can default to the new class's subject.
  const lastClassIdRef = useRef<string | undefined>(selectedDarasa?.id);

  const loadTestIntoForm = (testId: string) => {
    if (!selectedDarasa) return;
    const test = selectedDarasa.tests.find((t) => t.id === testId);
    if (!test) return;

    // Keep whatever the user was typing so it can be restored on Cancel.
    draftRef.current = { name, subject, marks: marksMap };

    setName(test.testname);
    setSubject(test.subject);
    const next: { [id: string]: string } = {};
    test.scores.forEach((s) => {
      next[s.studentId] = String(s.marks);
    });
    setMarksMap(next);
    setEditingTestId(test.id);
  };

  // Consume one-shot edit requests coming from the test-score ellipsis menu.
  // The request carries a seq so each tap is applied exactly once.
  useEffect(() => {
    let lastSeq = 0;
    const pending = getCurrentTestEditRequest();
    if (pending && pending.seq > lastSeq) {
      lastSeq = pending.seq;
      loadTestIntoForm(pending.testId);
      clearTestEditRequest();
    }
    return subscribeTestEditRequest((req) => {
      if (req && req.seq > lastSeq) {
        lastSeq = req.seq;
        loadTestIntoForm(req.testId);
        clearTestEditRequest();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDarasa]);

  // A new test starts on the class's first subject; switching class follows suit.
  useEffect(() => {
    if (!selectedDarasa || editingTestId) return;
    const classChanged = lastClassIdRef.current !== selectedDarasa.id;
    lastClassIdRef.current = selectedDarasa.id;
    if (classChanged) setSubjectAddedNotice(null);
    const first = selectedDarasa.subjects[0]?.name;
    if (!first || (!classChanged && subject)) return;
    setSubject(first);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDarasa?.id, selectedDarasa?.subjects.length, editingTestId]);

  // The added-subject confirmation fades away on its own.
  useEffect(() => {
    if (!subjectAddedNotice) return;
    const timer = setTimeout(() => setSubjectAddedNotice(null), 3000);
    return () => clearTimeout(timer);
  }, [subjectAddedNotice]);

  if (!selectedDarasa) {
    return <Text style={{ color: theme.text }}>No class selected</Text>;
  }

  const editingTest = editingTestId
    ? selectedDarasa.tests.find((t) => t.id === editingTestId)
    : undefined;

  const resetForm = () => {
    const firstSubject = selectedDarasa.subjects[0]?.name ?? "";
    setName("");
    setSubject(firstSubject);
    setSubjectMenuVisible(false);
    setSubjectModalVisible(false);
    setNewSubjectName("");
    setSubjectAddedNotice(null);
    setMarksMap({});
    setEditingTestId(null);
    draftRef.current = null;
  };

  const cancelEdit = () => {
    const draft = draftRef.current;
    if (draft) {
      // Restore the in-progress new-test draft instead of discarding it.
      setName(draft.name);
      setSubject(draft.subject);
      setMarksMap(draft.marks);
      draftRef.current = null;
    } else {
      resetForm();
    }
    setEditingTestId(null);
  };

  const saveTest = () => {
    if (!name.trim()) {
      Alert.alert("Test name required", "Give this test a name before saving.");
      return;
    }
    if (!subject.trim()) {
      Alert.alert(
        "Subject required",
        "Choose the subject these marks belong to before saving."
      );
      return;
    }

    const marksData: { [studentId: string]: number } = {};
    selectedDarasa.students.forEach(student => {
      const rawValue = marksMap[student.id];
      if (rawValue == null || rawValue.trim() === "") return;

      const mark = parseFloat(rawValue);
      if (!isNaN(mark) && mark >= 0) {
        marksData[student.id] = mark;
      }
    });

    if (editingTest) {
      selectedDarasa.updateTest(editingTest.id, name.trim(), subject.trim(), marksData);
    } else {
      // Appends a new test — a class can hold any number of tests.
      selectedDarasa.addTest(name.trim(), subject.trim(), marksData);
    }

    resetForm();
    router.push("/(classes)/test-score");
  };

  const openSubjectMenu = () => setSubjectMenuVisible(true);

  const openAddSubjectModal = () => {
    setSubjectMenuVisible(false);
    setNewSubjectName("");
    setSubjectModalVisible(true);
  };

  const saveNewSubject = () => {
    const trimmed = newSubjectName.trim();
    if (!trimmed) return;
    if (
      selectedDarasa.subjects.some(
        (s) => s.name.toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      Alert.alert("Subject exists", `"${trimmed}" is already a subject in this class.`);
      return;
    }
    selectedDarasa.addSubject(trimmed);
    setSubject(trimmed);
    setSubjectAddedNotice(trimmed);
    setSubjectModalVisible(false);
    setNewSubjectName("");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Subject Section — asked first: marks must always belong to a subject */}
      <Card style={[styles.card,{backgroundColor:theme.card}]}>
        <Card.Content>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Subject
          </Text>

          <Menu
            visible={subjectMenuVisible}
            onDismiss={() => setSubjectMenuVisible(false)}
            anchor={
              <TouchableOpacity
                style={[
                  styles.selector,
                  { borderColor: theme.text + "55", backgroundColor: "white" },
                ]}
                onPress={openSubjectMenu}
              >
                <Text
                  style={[
                    styles.selectorText,
                    { color: subject ? "#111827" : "#6B7280" },
                  ]}
                >
                  {subject || "Select subject"}
                </Text>
                <Text style={{ color: "#6B7280" }}>▾</Text>
              </TouchableOpacity>
            }
          >
            {selectedDarasa.subjects.map((s) => (
              <Menu.Item
                key={s.id}
                title={s.name}
                onPress={() => {
                  setSubject(s.name);
                  setSubjectAddedNotice(null);
                  setSubjectMenuVisible(false);
                }}
              />
            ))}
            {selectedDarasa.subjects.length === 0 && (
              <Menu.Item
                title="Add your class subject"
                onPress={openAddSubjectModal}
              />
            )}
          </Menu>

          {subjectAddedNotice && (
            <Text style={styles.subjectAdded}>
              "{subjectAddedNotice}" added to this class.
            </Text>
          )}

          <Text style={[styles.subjectHint, { color: theme.text }]}>
            {selectedDarasa.subjects.length === 0
              ? "No subjects in this class yet. Tap the selector to add your class subject."
              : "Subjects are managed from Settings → Manage Classes."}
          </Text>
        </Card.Content>
      </Card>

      {/* Test Name Section */}
      <Card style={[styles.card,{backgroundColor:theme.card}]}>
        <Card.Content>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {editingTest ? "Edit Test Name" : "Test Name"}
          </Text>

          <TextInput
            mode="outlined"
            label={editingTest ? `Editing: ${editingTest.testname}` : "Test Name"}
            value={name}
            onChangeText={setName}
            style={[styles.fullInput,{color:theme.text,backgroundColor:"white"}]}
          />
        </Card.Content>
      </Card>

      {/* Students Section */}
      <Card style={[styles.card,{backgroundColor:theme.card}]}>
        <Card.Content>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Students & Marks
          </Text>

          {selectedDarasa.students.map((student, index) => (
            <View key={student.id}>
              <View style={styles.row}>
                <Text style={[styles.index, { color: theme.text }]}>
                  {index + 1}.
                </Text>

                <Text
                  style={[styles.studentName, { color: theme.text }]}
                  numberOfLines={1}
                >
                  {student.full_name}
                </Text>

                <TextInput
                    mode="outlined"
                    placeholder="0"
                    keyboardType="numeric"
                    style={styles.markInput}
                    value={marksMap[student.id] || ""}
                    onChangeText={(text) =>
                      setMarksMap(prev => ({ ...prev, [student.id]: text }))
                    }
                  />
              </View>

              <Divider style={{ marginVertical: 8 }} />
            </View>
          ))}
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        style={styles.button}
        onPress={saveTest}
        disabled={!subject.trim()}
      >
        {editingTest ? "Update Test" : "Save Test"}
      </Button>

      {editingTest && (
        <Button
          mode="outlined"
          style={styles.button}
          onPress={cancelEdit}
        >
          Cancel Editing
        </Button>
      )}
    </ScrollView>

    <Modal
      visible={subjectModalVisible}
      onDismiss={() => setSubjectModalVisible(false)}
      contentContainerStyle={[styles.modal, { backgroundColor: theme.card }]}
    >
      <Text style={[styles.modalTitle, { color: theme.text }]}>
        Add your class subject
      </Text>
      <Text style={[styles.modalSubtitle, { color: theme.text }]}>
        Tests are recorded under a subject, so this class needs at least one.
      </Text>
      <TextInput
        mode="outlined"
        label="Subject name"
        placeholder="e.g. Mathematics"
        value={newSubjectName}
        onChangeText={setNewSubjectName}
        onSubmitEditing={saveNewSubject}
        style={{ backgroundColor: "white" }}
      />
      <View style={styles.modalActions}>
        <View />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button mode="text" onPress={() => setSubjectModalVisible(false)}>
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={saveNewSubject}
            disabled={!newSubjectName.trim()}
          >
            Add
          </Button>
        </View>
      </View>
    </Modal>
    </SafeAreaView>
  );
});

export default AddTestScreen;

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 4,
  },
  card: {
    marginBottom: 16,
    borderRadius: 9,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  fullInput: {
    width: "100%",
    borderRadius: 4,
  },
  subjectHint: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 10,
  },
  subjectAdded: {
    fontSize: 13,
    fontWeight: "600",
    color: "#15803D",
    marginTop: 10,
  },
  selector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  selectorText: {
    fontSize: 16,
  },
  modal: {
    margin: 20,
    padding: 20,
    borderRadius: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 14,
  },
  modalActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  index: {
    width: 30,
    fontSize: 14,
  },
  studentName: {
    flex: 1,
    fontSize: 14,
  },
  markInput: {
    width: 70,
    height: 45,
  },
  button: {
    marginTop: 10,
    borderRadius: 8,
  },
});
