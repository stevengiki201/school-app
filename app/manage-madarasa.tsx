import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Platform, Alert } from "react-native"
import { useTheme } from "@/context/ThemeContext";
import { Button, Card, Divider, DataTable, Modal, TextInput} from "react-native-paper"
import { Edit, PlusIcon, Trash2, ChevronLeft } from "lucide-react-native"
import { Ionicons, MaterialIcons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { observer } from "mobx-react-lite"
import { rootStore } from "@/components/models"
import { KeyboardAwareScrollView } from "@/components/ui/keyboard-aware-scroll-view";
import React, { useState } from "react";


const ManageMadarasa = observer(() => {
  const { theme, isDark } = useTheme();
  const { darasas, setSelectedDarasa, selectedDarasa } = rootStore
  const router = useRouter();

  // Which class/subject the subject editor modal is working on.
  const [subjectEditor, setSubjectEditor] = useState<{
    darasaId: string;
    subjectId?: string;
  } | null>(null);
  const [subjectName, setSubjectName] = useState("");

  const openAddSubject = (darasaId: string) => {
    setSubjectEditor({ darasaId });
    setSubjectName("");
  };

  const openEditSubject = (darasaId: string, subjectId: string, name: string) => {
    setSubjectEditor({ darasaId, subjectId });
    setSubjectName(name);
  };

  const closeSubjectEditor = () => {
    setSubjectEditor(null);
    setSubjectName("");
  };

  const saveSubject = () => {
    if (!subjectEditor) return;
    const darasa = darasas.find((d) => d.id === subjectEditor.darasaId);
    const trimmed = subjectName.trim();
    if (!darasa || !trimmed) return;

    if (subjectEditor.subjectId) {
      // Renaming carries the new name over to this subject's tests.
      if (!darasa.renameSubject(subjectEditor.subjectId, trimmed)) {
        Alert.alert("Subject exists", `"${trimmed}" is already a subject in this class.`);
        return;
      }
    } else {
      if (darasa.subjects.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) {
        Alert.alert("Subject exists", `"${trimmed}" is already a subject in this class.`);
        return;
      }
      darasa.addSubject(trimmed);
    }
    closeSubjectEditor();
  };

  const confirmRemoveSubject = (darasaId: string, subjectId: string, name: string) => {
    const darasa = darasas.find((d) => d.id === darasaId);
    const testCount = darasa?.tests.filter(
      (t) => t.subject.toLowerCase() === name.toLowerCase()
    ).length ?? 0;
    const message = testCount > 0
      ? `Remove ${name}? Its ${testCount} test score${testCount === 1 ? "" : "s"} will be deleted too.`
      : `Remove ${name} from this class?`;
    if (Platform.OS === "web") {
      if (window.confirm(message)) darasa?.removeSubject(subjectId);
      return;
    }
    Alert.alert("Remove subject", message, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => darasa?.removeSubject(subjectId),
      },
    ]);
  };
  const onClassView = (darasa:any) => {
    setSelectedDarasa(darasa.id)
    router.push("/(classes)/add-student")
  };
  const onEdit = (darasa:any) => {
    setSelectedDarasa(darasa.id)
    router.push("/(classes)/classview")
  };
  const onDeleteDarasa = (darasa: any) => {
    if (!darasa) return;
    rootStore.setSelectedDarasa(null);
    rootStore.removeDarasa(darasa.id);
  };

  const confirmDeleteDarasa = (darasa: any) => {
    if (!darasa) return;
    if (Platform.OS === "web") {
      const confirmed = window.confirm("Are you sure you want to delete this class?");
      if (confirmed) {
        onDeleteDarasa(darasa);
      }
    } else {
      Alert.alert(
        "Confirm Delete",
        "Are you sure you want to delete this class?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => onDeleteDarasa(darasa),
          },
        ]
      );
    }
  };


  return (
    <KeyboardAwareScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        >
    <View style={[{ flex: 1 , backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ChevronLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Manage Classes</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <View style={{paddingHorizontal:16, paddingBottom:16}}>
      <Button mode="outlined" icon={(_props)=><PlusIcon {..._props}/>} onPress={()=>router.push("/(tabs)/addclass")}>Add Class</Button>
      </View>
      {darasas.map(darasa => (
        <View key={darasa.id} style={styles.row}>
        <View style={styles.left}>
          <Text style={[styles.className, { color: theme.text }]}>{darasa.name}</Text>
          <Text style={[styles.students,{color: theme.text}]}>{darasa.students.length} Students  <Edit size={10} onPress={()=>onEdit(darasa)}/></Text>

          <View style={styles.subjectsBlock}>
            <Text style={[styles.subjectsLabel, { color: theme.text }]}>Subjects</Text>
            <View style={styles.subjectRow}>
              {darasa.subjects.map((subject) => (
                <TouchableOpacity
                  key={subject.id}
                  style={[
                    styles.subjectChip,
                    { borderColor: isDark ? "#4B5563" : "#d1d5db" },
                  ]}
                  onPress={() => openEditSubject(darasa.id, subject.id, subject.name)}
                >
                  <Text style={[styles.subjectChipText, { color: theme.text }]}>
                    {subject.name}
                  </Text>
                  <Edit size={10} color={theme.text} />
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.addSubject}
                onPress={() => openAddSubject(darasa.id)}
              >
                <Text style={styles.addSubjectText}>+ Add subject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        
        <View style={styles.right}>
            <TouchableOpacity style={styles.button} onPress={()=>onClassView(darasa)}>
              <Text style={styles.buttonText}>Add Students</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.delete} onPress={()=>confirmDeleteDarasa(darasa)}>
              <MaterialIcons name="delete" size={22} color={theme.text} />
            </TouchableOpacity>
        </View>
      
      </View>
      ))}
     

      <Modal
        visible={!!subjectEditor}
        onDismiss={closeSubjectEditor}
        contentContainerStyle={[styles.modal, { backgroundColor: theme.card }]}
      >
        <Text style={[styles.modalTitle, { color: theme.text }]}>
          {subjectEditor?.subjectId ? "Edit subject" : "Add subject"}
        </Text>
        <Text style={[styles.modalSubtitle, { color: theme.text }]}>
          {subjectEditor?.subjectId
            ? "Renaming keeps every test score recorded under this subject."
            : "Tests are recorded under a subject, so add the subjects this class studies."}
        </Text>
        <TextInput
          mode="outlined"
          label="Subject name"
          value={subjectName}
          onChangeText={setSubjectName}
          onSubmitEditing={saveSubject}
          style={{ backgroundColor: "white" }}
        />
        <View style={styles.modalActions}>
          {subjectEditor?.subjectId ? (
            <Button
              mode="text"
              textColor="#EF4444"
              onPress={() => {
                if (!subjectEditor?.subjectId) return;
                const { darasaId, subjectId } = subjectEditor;
                const subject = darasas
                  .find((d) => d.id === darasaId)
                  ?.subjects.find((s) => s.id === subjectId);
                closeSubjectEditor();
                if (subject) confirmRemoveSubject(darasaId, subject.id, subject.name);
              }}
            >
              Remove
            </Button>
          ) : (
            <View />
          )}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button mode="text" onPress={closeSubjectEditor}>Cancel</Button>
            <Button mode="contained" onPress={saveSubject} disabled={!subjectName.trim()}>
              {subjectEditor?.subjectId ? "Save" : "Add"}
            </Button>
          </View>
        </View>
      </Modal>
    </View>
    </KeyboardAwareScrollView>
  )
});
const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },

  left: {
    flex: 1,
  },

  className: {
    fontSize: 16,
    fontWeight: "600",
  },

  students: {
    fontSize: 13,
  },

  right: {
    flexDirection: "row",
    alignItems: "center",
  },

  button: {
    backgroundColor: "#6A5ACD", // purple
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 10,
  },

  buttonText: {
    color: "#fff",
    fontSize: 13,
  },

  delete: {
    padding: 6,
  },
  subjectsBlock: {
    marginTop: 8,
  },
  subjectsLabel: {
    fontSize: 11,
    fontWeight: "600",
    opacity: 0.7,
    marginBottom: 4,
  },
  subjectRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  subjectChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  subjectChipText: {
    fontSize: 12,
  },
  addSubject: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  addSubjectText: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "600",
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
});

export default ManageMadarasa
