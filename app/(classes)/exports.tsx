import React, { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { observer } from "mobx-react-lite";
import dayjs from "dayjs";
import { DatePickerModal } from "react-native-paper-dates";
import { Button, Card, Modal, Portal } from "react-native-paper";
import { useTheme } from "@/context/ThemeContext";
import { rootStore } from "@/components/models";
import { FileSpreadsheet, FileText, File, CalendarRange, Check, ChevronRight, Users } from "lucide-react-native";
import {
  exportAttendance,
  getAttendanceInRange,
  alertMessage,
  type ExportFormat,
} from "@/services/exportAttendance";

const ExportScreen = observer(() => {
  const { theme, isDark } = useTheme();
  const { selectedDarasa, authUser, darasas } = rootStore;
  const [rangeOpen, setRangeOpen] = useState(false);
  const [classOpen, setClassOpen] = useState(false);
  const [busy, setBusy] = useState<ExportFormat | null>(null);
  // Which class to export (defaults to the currently open class).
  const [classId, setClassId] = useState<string | null>(selectedDarasa?.id ?? null);

  const exportDarasa = darasas.find((d: any) => d.id === classId) ?? null;

  // Defaults: last 30 days inclusive of today.
  const [startDate, setStartDate] = useState<Date>(dayjs().subtract(29, "day").toDate());
  const [endDate, setEndDate] = useState<Date>(new Date());

  const fmt = (d: Date) => dayjs(d).format("DD-MM-YYYY");
  const start = fmt(startDate);
  const end = fmt(endDate);

  const savedCount = getAttendanceInRange(start, end, classId).length;

  const onConfirmRange = (params: any) => {
    setRangeOpen(false);
    if (params?.startDate) setStartDate(params.startDate);
    if (params?.endDate) setEndDate(params.endDate);
  };

  const validate = (): boolean => {
    if (!exportDarasa) {
      alertMessage("No class selected", "Choose a class to export its attendance.");
      return false;
    }
    if (dayjs(endDate).isBefore(dayjs(startDate))) {
      alertMessage("Invalid date range", "The end date must be on or after the start date.");
      return false;
    }
    if (savedCount === 0) {
      alertMessage(
        "Nothing to export",
        `No saved attendance records were found between ${start} and ${end}.`
      );
      return false;
    }
    return true;
  };

  const onExport = async (format: ExportFormat) => {
    if (busy) return;
    if (!validate()) return;
    setBusy(format);
    try {
      await exportAttendance(format, start, end, { darasaId: classId, dateMode: "all" });
    } finally {
      setBusy(null);
    }
  };

  const borderColor = isDark ? "#334155" : "#e2e8f0";

  const formats: {
    key: ExportFormat;
    label: string;
    desc: string;
    icon: React.ReactNode;
    color: string;
  }[] = [
    {
      key: "pdf",
      label: "Export to PDF",
      desc: "Print-ready attendance report",
      icon: <FileText size={26} color="#DC2626" />,
      color: "#DC2626",
    },
    {
      key: "excel",
      label: "Export to Excel",
      desc: "Spreadsheet (.xls) with per-date columns",
      icon: <FileSpreadsheet size={26} color="#16A34A" />,
      color: "#16A34A",
    },
    {
      key: "word",
      label: "Export to Word",
      desc: "Editable document (.doc)",
      icon: <File size={26} color="#2563EB" />,
      color: "#2563EB",
    },
  ];

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
      style={{ backgroundColor: theme.background }}
    >
      <View style={styles.screen}>
        {/* Class picker */}
        <TouchableOpacity
          style={[styles.card, { backgroundColor: theme.card, borderColor }]}
          onPress={() => setClassOpen(true)}
          activeOpacity={0.7}
        >
          <View style={styles.rangeRow}>
            <View style={[styles.rangeIcon, { backgroundColor: isDark ? "#1e293b" : "#f0fdf4" }]}>
              <Users size={24} color="#16A34A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rangeTitle, { color: theme.text }]}>Class to export</Text>
              <Text style={[styles.rangeValue, { color: isDark ? "#9ca3af" : "#6b7280" }]}>
                {exportDarasa
                  ? `${exportDarasa.name} • ${exportDarasa.students.length} students`
                  : "Choose a class to export attendance"}
              </Text>
            </View>
            <ChevronRight size={20} color={isDark ? "#9ca3af" : "#6b7280"} />
          </View>
        </TouchableOpacity>

        {/* Class selection modal */}
        <Portal>
          <Modal
            visible={classOpen}
            onDismiss={() => setClassOpen(false)}
            contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.card }]}
          >
            <Text style={[styles.modalTitle, { color: theme.text }]}>Choose a class to export</Text>
            <ScrollView style={{ flexGrow: 0 }} showsVerticalScrollIndicator={false}>
              {darasas.map((d: any) => {
                const active = d.id === classId;
                return (
                  <TouchableOpacity
                    key={d.id}
                    style={[
                      styles.classRow,
                      {
                        borderColor: active ? "#3B82F6" : borderColor,
                        backgroundColor: active
                          ? isDark
                            ? "#1e3a8a33"
                            : "#eff6ff"
                          : "transparent",
                      },
                    ]}
                    onPress={() => {
                      setClassId(d.id);
                      setClassOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.classRowName, { color: theme.text }]}>{d.name}</Text>
                      <Text style={[styles.classRowSub, { color: isDark ? "#9ca3af" : "#6b7280" }]}>
                        {d.students.length} students
                      </Text>
                    </View>
                    {active && <Check size={20} color="#3B82F6" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Modal>
        </Portal>

        {/* Date range selector */}
        <TouchableOpacity
          style={[styles.card, { backgroundColor: theme.card, borderColor }]}
          onPress={() => setRangeOpen(true)}
          activeOpacity={0.7}
        >
          <View style={styles.rangeRow}>
            <View style={[styles.rangeIcon, { backgroundColor: isDark ? "#1e293b" : "#eff6ff" }]}>
              <CalendarRange size={24} color="#3B82F6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rangeTitle, { color: theme.text }]}>Select date range</Text>
              <Text style={[styles.rangeValue, { color: isDark ? "#9ca3af" : "#6b7280" }]}>
                {start} → {end}
              </Text>
            </View>
            <ChevronRight size={20} color={isDark ? "#9ca3af" : "#6b7280"} />
          </View>
        </TouchableOpacity>

        <DatePickerModal
          locale="en"
          mode="range"
          visible={rangeOpen}
          onDismiss={() => setRangeOpen(false)}
          startDate={startDate}
          endDate={endDate}
          onConfirm={onConfirmRange}
          saveLabel="Apply"
          label="Select period"
          startLabel="From"
          endLabel="To"
        />

        {/* Range summary */}
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: isDark ? "#1e293b" : "#f8fafc", borderColor },
          ]}
        >
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: theme.text }]}>{savedCount}</Text>
            <Text style={[styles.summaryLabel, { color: isDark ? "#9ca3af" : "#6b7280" }]}>
              saved records
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: theme.text }]}>
              {exportDarasa?.students.length ?? 0}
            </Text>
            <Text style={[styles.summaryLabel, { color: isDark ? "#9ca3af" : "#6b7280" }]}>
              students
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: theme.text }]}>
              {dayjs(endDate).diff(dayjs(startDate), "day") + 1}
            </Text>
            <Text style={[styles.summaryLabel, { color: isDark ? "#9ca3af" : "#6b7280" }]}>
              days in range
            </Text>
          </View>
        </View>

        {/* Format actions */}
        <Text style={[styles.sectionLabel, { color: theme.text }]}>Choose export format</Text>
        {formats.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.formatCard, { backgroundColor: theme.card, borderColor }]}
            onPress={() => onExport(f.key)}
            disabled={busy !== null}
            activeOpacity={0.7}
          >
            <View style={[styles.formatIcon, { backgroundColor: `${f.color}1A` }]}>{f.icon}</View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.formatTitle, { color: theme.text }]}>{f.label}</Text>
              <Text style={[styles.formatDesc, { color: isDark ? "#9ca3af" : "#6b7280" }]}>
                {f.desc}
              </Text>
            </View>
            {busy === f.key ? (
              <ActivityIndicator color={f.color} />
            ) : (
              <ChevronRight size={20} color={isDark ? "#9ca3af" : "#6b7280"} />
            )}
          </TouchableOpacity>
        ))}

        <Button
          mode="text"
          textColor="#3B82F6"
          onPress={() => {
            setStartDate(dayjs().subtract(29, "day").toDate());
            setEndDate(new Date());
          }}
          style={{ marginTop: 8 }}
        >
          Reset to last 30 days
        </Button>

        <Text style={[styles.note, { color: isDark ? "#9ca3af" : "#6b7280" }]}>
          Only attendance that has been saved is included. Files are shared via your device's share
          sheet — save to Files, email, or WhatsApp.
        </Text>
      </View>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  cardSub: {
    fontSize: 13,
    marginTop: 2,
  },
  rangeRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  rangeIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rangeTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  rangeValue: {
    fontSize: 13,
    marginTop: 2,
  },
  summaryCard: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryNumber: {
    fontSize: 20,
    fontWeight: "700",
  },
  summaryLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 8,
  },
  formatCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  formatIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  formatTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  formatDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  note: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 24,
  },
  modalContainer: {
    margin: 20,
    borderRadius: 16,
    padding: 16,
    maxHeight: "70%",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  classRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  classRowName: {
    fontSize: 15,
    fontWeight: "600",
  },
  classRowSub: {
    fontSize: 12,
    marginTop: 2,
  },
});

export default ExportScreen;
