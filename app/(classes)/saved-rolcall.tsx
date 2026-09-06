import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { observer } from "mobx-react-lite";
import { rootStore } from "@/components/models";
import { Button, DataTable, Modal, Portal, RadioButton } from "react-native-paper";
import { DatePickerModal } from 'react-native-paper-dates';
import dayjs from "dayjs";
import { useRouter } from "expo-router";
import { CalendarDays, LogsIcon, X } from "lucide-react-native";
import { getDateListings } from "@/services/exportAttendance";

const SavedRollcallScreen = observer(() => {
  const { theme, isDark } = useTheme();
  const { selectedDate, setSelectedDate } = rootStore;
  const [open, setOpen] = React.useState(false);
  const [listingsOpen, setListingsOpen] = useState(false);
  const router = useRouter();

  const onDismissSingle = React.useCallback(() => {
    setOpen(false);
  }, []);

  const onConfirmSingle = React.useCallback(
    (params: any) => {
      setOpen(false);
      setSelectedDate(dayjs(params.date).format("DD-MM-YYYY"));
    },
    [setSelectedDate]
  );

  const { selectedDarasa } = rootStore;

  // Dates in which attendance was actually taken (saved) for this class.
  const listings = getDateListings("01-01-1970", dayjs().add(1, "year").format("DD-MM-YYYY"), selectedDarasa?.id ?? null);

  const onSelectListingDate = (date: string) => {
    setSelectedDate(date);
    setListingsOpen(false);
  };

  if (!selectedDarasa) {
    return <Text style={{ color: theme.text }}>No class selected</Text>;
  }

  const isDarkTheme = isDark;

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ flex: 1, padding: 20, backgroundColor: theme.background }}>
        <View style={{ paddingBottom: 10, flexDirection: "row", justifyContent: "space-between" }}>
          <Button onPress={() => setOpen(true)} uppercase={false} mode="outlined" style={{ width: "80%", alignSelf: "center" }}>
            {!selectedDate ? "Pick a date" : `Selected Date: ${selectedDate}`}
          </Button>
          <TouchableOpacity onPress={() => setListingsOpen(true)} activeOpacity={0.7}>
            <LogsIcon color={isDarkTheme ? "#60A5FA" : "#2563EB"} size={40} />
          </TouchableOpacity>
        </View>
        <DatePickerModal
          locale="en"
          mode="single"
          visible={open}
          onDismiss={onDismissSingle}
          date={new Date()}
          onConfirm={onConfirmSingle}
        />

        {/* Attendance listings modal — pick a date attendance was taken */}
        <Portal>
          <Modal
            visible={listingsOpen}
            onDismiss={() => setListingsOpen(false)}
            contentContainerStyle={[
              styles.modalContainer,
              { backgroundColor: theme.card },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <CalendarDays size={20} color={isDarkTheme ? "#60A5FA" : "#2563EB"} />
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  Select date for Attendance
                </Text>
              </View>
              <TouchableOpacity onPress={() => setListingsOpen(false)}>
                <X size={22} color={isDarkTheme ? "#9ca3af" : "#6b7280"} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSubtitle, { color: isDarkTheme ? "#9ca3af" : "#6b7280" }]}>
              {selectedDarasa.name} — dates in which attendance was taken
            </Text>

            <ScrollView style={styles.listingsScroll} showsVerticalScrollIndicator={false}>
              {listings.length === 0 ? (
                <Text style={[styles.emptyText, { color: isDarkTheme ? "#9ca3af" : "#6b7280" }]}>
                  No saved attendance found for this class yet.
                </Text>
              ) : (
                listings.map((item) => {
                  const active = selectedDate === item.date;
                  return (
                    <TouchableOpacity
                      key={item.date}
                      style={[
                        styles.listingRow,
                        {
                          borderColor: active
                            ? "#3B82F6"
                            : isDarkTheme
                            ? "#334155"
                            : "#e2e8f0",
                          backgroundColor: active
                            ? isDarkTheme
                              ? "#1e3a8a33"
                              : "#eff6ff"
                            : "transparent",
                        },
                      ]}
                      onPress={() => onSelectListingDate(item.date)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.dateBadge}>
                        <Text style={styles.dateBadgeDay}>{dayjs(item.date, "DD-MM-YYYY").format("DD")}</Text>
                        <Text style={styles.dateBadgeMonth}>
                          {dayjs(item.date, "DD-MM-YYYY").format("MMM").toUpperCase()}
                        </Text>
                      </View>
                      <Text style={[styles.listingDate, { color: theme.text }]}>{item.date}</Text>
                      <View style={styles.countsRow}>
                        <Text style={[styles.countText, { color: "#16A34A" }]}>present: {item.present}</Text>
                        <Text style={[styles.countText, { color: "#DC2626" }]}>absent: {item.absent}</Text>
                        <Text style={[styles.countText, { color: "#2563EB" }]}>sick: {item.sick}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </Modal>
        </Portal>

        <DataTable.Header style={{ backgroundColor: theme.card }}>
          <DataTable.Title><Text style={{ color: theme.text }}>Full name</Text></DataTable.Title>
          <DataTable.Title numeric><Text style={{ color: theme.text }}>Present</Text></DataTable.Title>
          <DataTable.Title numeric><Text style={{ color: theme.text }}>Absent</Text></DataTable.Title>
          <DataTable.Title numeric><Text style={{ color: theme.text }}>Permission</Text></DataTable.Title>
        </DataTable.Header>
        {selectedDarasa.students.map((student) => {
          const att = rootStore.attendances.find(
            (a: any) => a.student?.id === student.id && a.date === selectedDate && a.isSaved
          );
          return (
            <DataTable.Row key={`${student.id}`}>
              <DataTable.Cell><Text style={{ color: theme.text }}>{student.full_name}</Text></DataTable.Cell>
              <DataTable.Cell numeric>
                <RadioButton
                  color="green"
                  value="present"
                  status={att?.status === 'present' ? 'checked' : 'unchecked'}
                  disabled={!att}
                />
              </DataTable.Cell>
              <DataTable.Cell numeric>
                <RadioButton
                  value="absent"
                  color="red"
                  status={att?.status === 'absent' ? 'checked' : 'unchecked'}
                  disabled={!att}
                />
              </DataTable.Cell>
              <DataTable.Cell numeric>
                <RadioButton
                  color="blue"
                  value="sick"
                  status={att?.status === 'sick' ? 'checked' : 'unchecked'}
                  disabled={!att}
                />
              </DataTable.Cell>
            </DataTable.Row>
          );
        })}
      </View>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  modalContainer: {
    margin: 20,
    borderRadius: 16,
    padding: 16,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  modalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  modalSubtitle: {
    fontSize: 12,
    marginBottom: 12,
  },
  listingsScroll: {
    flexGrow: 0,
  },
  listingRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    gap: 10,
  },
  dateBadge: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
  },
  dateBadgeDay: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 18,
  },
  dateBadgeMonth: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 9,
    fontWeight: "600",
    lineHeight: 11,
  },
  listingDate: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  countsRow: {
    alignItems: "flex-end",
    gap: 2,
  },
  countText: {
    fontSize: 11,
    fontWeight: "600",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 24,
    fontSize: 13,
  },
});

export default SavedRollcallScreen;
