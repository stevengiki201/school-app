import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { observer } from "mobx-react-lite";
import { rootStore } from "@/components/models";
import { useTheme } from "@/context/ThemeContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import { nanoid } from "nanoid/non-secure";
import { Button, TextInput, Card, Divider } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

const AddTestScreen = observer(() => {
  const { editTestId } = useLocalSearchParams<{ editTestId?: string }>();
  const { selectedDarasa } = rootStore;
  // When the screen was opened from the ellipsis menu on a test, prefill the
  // form with that test's name and marks so the user can edit them.
  const editingTest = editTestId
    ? selectedDarasa?.tests.find((t) => t.id === editTestId)
    : undefined;

  const [name, setName] = useState(editingTest?.testname ?? "");
  const [marksMap, setMarksMap] = useState<{ [id: string]: string }>(() => {
    const initial: { [id: string]: string } = {};
    editingTest?.scores.forEach((s) => {
      initial[s.studentId] = String(s.marks);
    });
    return initial;
  });
  const { theme } = useTheme();
  const router = useRouter();

  // Re-sync the form when a different test is being edited (drawer screens
  // stay mounted, so params can change without a fresh mount).
  useEffect(() => {
    if (!editingTest) return;
    setName(editingTest.testname);
    const next: { [id: string]: string } = {};
    editingTest.scores.forEach((s) => {
      next[s.studentId] = String(s.marks);
    });
    setMarksMap(next);
  }, [editTestId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!selectedDarasa) {
    return <Text style={{ color: theme.text }}>No class selected</Text>;
  }
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
      selectedDarasa.addTest(name.trim(), marksData);
    }

    setName("");
    setMarksMap({});
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
            label="Test Name"
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