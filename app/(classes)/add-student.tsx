import React, { useEffect, useState } from "react"
import { View, Text, ScrollView, Pressable, Alert, StyleSheet, TextInput } from "react-native"
import { observer } from "mobx-react-lite"
import { useRouter, useLocalSearchParams } from "expo-router"
import { rootStore } from "@/components/models"
import { useTheme } from "@/context/ThemeContext"
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Menu } from "react-native-paper";
import * as DocumentPicker from "expo-document-picker";
import * as XLSX from "xlsx";
import * as FS from "expo-file-system/legacy";
import { Ionicons } from "@expo/vector-icons";
import { Share2 } from "lucide-react-native";
import { shareAsync } from "expo-sharing";

// Brand palette (matches the class home).
const BRAND = {
  blue: "#2563EB",
  blueSoft: "rgba(37,99,235,0.12)",
  green: "#16A34A",
  red: "#EF4444",
  hairline: "rgba(120,120,128,0.18)",
};

type Sex = "male" | "female" | "";

/**
 * True when a sheet's header row uses the import template's columns
 * (any accepted spelling: Full Name/Name, Sex/Gender, Registration No/Reg No/Reg).
 */
function sheetMatchesTemplate(headers: any[]): boolean {
  const norm = (h: any) => String(h ?? "").trim().toLowerCase().replace(/\.$/, "");
  const has = (list: string[]) => headers.some((h) => list.includes(norm(h)));
  const hasName = has(["full name", "name"]);
  const hasSex = has(["sex", "gender"]);
  const hasReg = has(["registration no", "reg no", "reg", "reg_no"]);
  return hasName && (hasSex || hasReg);
}

/** Normalize a raw sex cell to "male" | "female". */
function parseSex(raw: any): Sex {
  const v = String(raw ?? "").trim().toLowerCase();
  if (["male", "m", "boy", "mans"].includes(v)) return "male";
  if (["female", "f", "girl", "womans"].includes(v)) return "female";
  return "";
}

const AddStudentScreen = observer(() => {
  const router = useRouter();
  const params = useLocalSearchParams<{ edit?: string | string[]; studentId?: string | string[] }>();
  const { selectedDarasa } = rootStore;
  const { theme } = useTheme();
  // Editing always resolves THE student the user tapped, by the id in the URL,
  // never from any leftover global selection.
  const editStudentId = Array.isArray(params.studentId)
    ? params.studentId[0]
    : params.studentId;
  const editStudent =
    editStudentId && selectedDarasa
      ? selectedDarasa.students.find((s) => s.id === editStudentId) ?? null
      : null;
  const isEdit = params.edit === "1" && !!editStudent;
  const [name, setName] = useState(isEdit ? editStudent?.full_name ?? "" : "")
  const [sex, setSex] = useState<Sex>((isEdit ? editStudent?.sex : "") as Sex)
  const [regNo, setRegNo] = useState(isEdit ? editStudent?.reg_no ?? "" : "")

  // Re-sync the form whenever this screen is reused with a different student
  // (e.g. Edit tapped again on another student without a remount).
  useEffect(() => {
    if (isEdit && editStudent) {
      setName(editStudent.full_name);
      setSex((editStudent.sex ?? "") as Sex);
      setRegNo(editStudent.reg_no ?? "");
    }
  }, [isEdit, editStudent?.id]);
  const [sexMenuVisible, setSexMenuVisible] = useState(false)
  const [importing, setImporting] = useState(false)

  if (!selectedDarasa) {
    return (
      <View style={[styles.emptyRoot, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.text }}>No class selected</Text>
      </View>
    );
  }

  const handleSave = () => {
    const fullName = name.trim();
    if (!fullName) return;

    const finalRegNo = regNo.trim();
    const duplicate = selectedDarasa.students.find(
      s => s.reg_no && s.reg_no === finalRegNo && (!editStudent || s.id !== editStudent.id)
    );
    if (finalRegNo && duplicate) {
      Alert.alert("Duplicate", `Registration number "${finalRegNo}" is already used by a student in this class.`);
      return;
    }

    if (isEdit && editStudent) {
      // An emptied registration number keeps the previous one.
      rootStore.updateStudent(editStudent.id, fullName, sex, finalRegNo || editStudent.reg_no);
      rootStore.setSelectedStudent(null);
      router.back();
      return;
    }

    selectedDarasa.addStudent(fullName, sex, finalRegNo);
    setName("");
    setRegNo("");
    // Keep the chosen sex: teachers often add same-sex batches in one sitting.
  };

  /** Send an .xlsx template the teacher can fill: Full Name / Sex / Registration No. */
  const shareTemplate = async () => {
    try {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
        { "Full Name": "Amina Juma", "Sex": "Female", "Registration No": "001" },
        { "Full Name": "Baraka Mushi", "Sex": "Male", "Registration No": "002" },
      ]), "Students");
      const base64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
      const uri = `${FS.documentDirectory}students-template.xlsx`;
      await FS.writeAsStringAsync(uri, base64, { encoding: FS.EncodingType.Base64 });
      await shareAsync(uri, { mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    } catch (e) {
      Alert.alert("Template error", "Could not create the template file.");
    }
  };

  /** Read a workbook the teacher picked and try to import every row. */
  const importFromExcel = async () => {
    try {
      setImporting(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel",
          "text/comma-separated-values",
          "text/csv",
        ],
      });
      if (result.canceled || !("assets" in result) || result.assets.length === 0) return;

      const base64 = await FS.readAsStringAsync(result.assets[0].uri, { encoding: FS.EncodingType.Base64 });
      const wb = XLSX.read(base64, { type: "base64" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      if (!ws) throw new Error("workbook has no sheets");

      // Only import files that actually match the template's columns.
      const headerRow = (XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][])[0] ?? [];
      if (!sheetMatchesTemplate(headerRow)) {
        Alert.alert(
          "Template mismatch",
          "The template you imported does not match. Use the template this screen creates (columns: Full Name, Sex, Registration No)."
        );
        return;
      }

      const raw: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
      if (raw.length === 0) {
        Alert.alert("Empty sheet", "No student rows were found below the header.");
        return;
      }

      const rows = raw.map((row) => {
        // Accept a few header spellings: Name/Full Name, Sex/Gender, Reg/Reg No/Registration No.
        // A cell that is present but blank still falls through to the next accepted header.
        const firstFilled = (...vals: any[]) =>
          vals.find((v) => v !== undefined && v !== null && String(v).trim() !== "");
        const fullName = String(firstFilled(row["Full Name"], row["Full name"], row["Name"], row["name"]) ?? "").trim();
        const rawSex = firstFilled(row["Sex"], row["sex"], row["Gender"], row["gender"]);
        const reg_no = String(firstFilled(row["Registration No"], row["Registration No."], row["Reg No"], row["Reg"], row["reg_no"]) ?? "").trim();
        return { full_name: fullName, sex: parseSex(rawSex), reg_no };
      });

      const outcome = selectedDarasa.addStudentsBulk(rows);
      Alert.alert("Import finished", `${outcome.added} student(s) added${outcome.skipped ? `, ${outcome.skipped} skipped (empty or duplicate registration number)` : ""}.`);
    } catch (e) {
      Alert.alert("Import error", "Could not read that file. Use the template that this screen creates (columns: Full Name, Sex, Registration No).");
    } finally {
      setImporting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        <View style={[styles.formCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{isEdit ? "Edit student" : "Add one student"}</Text>

          <Text style={[styles.fieldLabel, { color: theme.text }]}>Full Name</Text>
          <TextInput
            placeholder="e.g. Amina Juma"
            value={name}
            onChangeText={setName}
            placeholderTextColor="rgba(120,120,128,0.6)"
            style={[styles.input, { color: theme.text, borderColor: BRAND.hairline }]}
          />

          <Text style={[styles.fieldLabel, { color: theme.text }]}>Sex</Text>
          <Menu
            visible={sexMenuVisible}
            onDismiss={() => setSexMenuVisible(false)}
            anchorPosition="bottom"
            contentStyle={{ backgroundColor: theme.background }}
            anchor={
              <Pressable
                onPress={() => setSexMenuVisible(true)}
                style={[styles.input, styles.sexPicker, { borderColor: sex ? BRAND.blue : BRAND.hairline }]}
              >
                <Ionicons
                  name={sex === "male" ? "man" : sex === "female" ? "woman" : "people-outline"}
                  size={16}
                  color={sex ? BRAND.blue : "rgba(120,120,128,0.7)"}
                />
                <Text style={{ flex: 1, color: sex ? theme.text : "rgba(120,120,128,0.6)" }}>
                  {sex === "male" ? "Male" : sex === "female" ? "Female" : "Choose sex"}
                </Text>
                <Ionicons
                  name={sexMenuVisible ? "chevron-up" : "chevron-down"}
                  size={16}
                  color="rgba(120,120,128,0.8)"
                />
              </Pressable>
            }
          >
            {(["male", "female"] as Sex[]).map((option) => (
              <Menu.Item
                key={option}
                title={option === "male" ? "Male" : "Female"}
                onPress={() => { setSex(option); setSexMenuVisible(false); }}
                style={sex === option ? { backgroundColor: theme.card } : undefined}
                leadingIcon={sex === option ? "check" : (option === "male" ? "gender-male" : "gender-female")}
                titleStyle={{ color: theme.text }}
              />
            ))}
          </Menu>

          <Text style={[styles.fieldLabel, { color: theme.text }]}>Registration No.</Text>
          <TextInput
            placeholder="e.g. 001"
            value={regNo}
            onChangeText={setRegNo}
            placeholderTextColor="rgba(120,120,128,0.6)"
            autoCapitalize="none"
            style={[styles.input, { color: theme.text, borderColor: BRAND.hairline }]}
          />
          {regNo.trim() === "" ? (
            <Text style={styles.hint}>Leave empty to generate one automatically.</Text>
          ) : null}

          <Button
            mode="contained"
            buttonColor={BRAND.blue}
            onPress={handleSave}
            style={{ marginTop: 16 }}
          >
            {isEdit ? "Save Changes" : "Add Student"}
          </Button>
        </View>

        {!isEdit && (
        <View style={[styles.importCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Or import from Excel</Text>
          <Text style={[styles.importHint, { color: theme.text }]}>
            Columns: Full Name · Sex (male/female) · Registration No.
          </Text>
          <View style={styles.importButtons}>
            <Button
              mode="outlined"
              icon={() => <Share2 size={16} color={BRAND.green} />}
              style={{ flex: 1, borderColor: BRAND.green }}
              textColor={BRAND.green}
              onPress={shareTemplate}
            >
              Get template
            </Button>
            <Button
              mode="outlined"
              icon={() => <Ionicons name="cloud-upload-outline" size={16} color={BRAND.blue} />}
              style={{ flex: 1, borderColor: BRAND.blue }}
              textColor={BRAND.blue}
              loading={importing}
              onPress={importFromExcel}
            >
              Import file
            </Button>
          </View>
        </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
})

export default AddStudentScreen

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
    gap: 14,
  },
  emptyRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  formCard: {
    borderRadius: 14,
    padding: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
  },
  sexPicker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  hint: {
    fontSize: 11,
    color: "rgba(120,120,128,0.9)",
    marginTop: 4,
  },
  importCard: {
    borderRadius: 14,
    padding: 16,
  },
  importHint: {
    fontSize: 12,
    opacity: 0.75,
    marginBottom: 12,
  },
  importButtons: {
    flexDirection: "row",
    gap: 10,
  },
});