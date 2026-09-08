import React, { useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { observer } from "mobx-react-lite";
import { rootStore } from "@/components/models";
import { useTheme } from "@/context/ThemeContext";
import { useRouter } from "expo-router";
import { nanoid } from "nanoid/non-secure";
import { Button, TextInput, Card, Divider } from "react-native-paper";
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
  const [marksMap, setMarksMap] = useState<{ [id: string]: string }>({});
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  // Marks captured while in edit mode, restored if the user cancels the edit.
  const draftRef = useRef<{ name: string; marks: { [id: string]: string } } | null>(
    null
  );

  const loadTestIntoForm = (testId: string) => {
    if (!selectedDarasa) return;
    const test = selectedDarasa.tests.find((t) => t.id === testId);
    if (!test) return;

    // Keep whatever the user was typing so it can be restored on Cancel.
    draftRef.current = { name, marks: marksMap };

    setName(test.testname);
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

  if (!selectedDarasa) {
    return <Text style={{ color: theme.text }}>No class selected</Text>;
  }

  const editingTest = editingTestId
    ? selectedDarasa.tests.find((t) => t.id === editingTestId)
    : undefined;

  const resetForm = () => {
    setName("");
    setMarksMap({});
    setEditingTestId(null);
    draftRef.current = null;
  };

  const cancelEdit = () => {
    const draft = draftRef.current;
    if (draft) {
      // Restore the in-progress new-test draft instead of discarding it.
      setName(draft.name);
      setMarksMap(draft.marks);
      draftRef.current = null;
    } else {
      resetForm();
    }
    setEditingTestId(null);
  };

  const saveTest = () => {
    if (!name.trim()) return;

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
      selectedDarasa.updateTest(editingTest.id, name.trim(), marksData);
    } else {
      // Appends a new test — a class can hold any number of tests.
      selectedDarasa.addTest(name.trim(), marksData);
    }

    resetForm();
    router.push("/(classes)/test-score");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
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
