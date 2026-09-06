import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { observer } from "mobx-react-lite";
import { rootStore } from "@/components/models";
import { useTheme } from "@/context/ThemeContext";
import { useRouter } from "expo-router";
import { nanoid } from "nanoid/non-secure";
import { Button, TextInput, Card, Divider } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

const AddTestScreen = observer(() => {
  const [name, setName] = useState("");
  const [marksMap, setMarksMap] = useState<{ [id: string]: string }>({});
  const { selectedDarasa } = rootStore;
  const { theme } = useTheme();
  const router = useRouter();

  if (!selectedDarasa) {
    return <Text style={{ color: theme.text }}>No class selected</Text>;
  }
  const addTest = () => {
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

    selectedDarasa.addTest(name.trim(), marksData);

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
            Test Name
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
        onPress={addTest}
      >
        Save Test
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