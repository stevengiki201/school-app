import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  NativeScrollEvent,
  NativeSyntheticEvent,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { observer } from "mobx-react-lite";
import { rootStore } from "@/components/models";
import { Button } from "react-native-paper";
import {
  AnchoredMenu as Menu,
  AnchoredMenuItem as MenuItem,
} from "@/components/ui/anchored-menu";
import dayjs from "dayjs";
import { useRouter } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { requestTestEdit } from "@/context/testEditRequest";
import { ChartNoAxesCombined, Edit3, FlipVerticalIcon, GripVertical, MoreVertical } from "lucide-react-native";

const NAME_COL_WIDTH = 140;
const MARK_COL_WIDTH = 80;
const ALL_SUBJECTS = "__all_subjects__";

const TestScoreScreen = observer(() => {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const { selectedDate, setSelectedDate } = rootStore;
  const headerScrollRef = useRef<ScrollView>(null);
  const studentScrollRefs = useRef<(ScrollView | null)[]>([]);
  const syncing = useRef(false);

  // Anchor (screen coords) for the test ellipsis menu: { testId, x, y }.
  const [menuState, setMenuState] = useState<{
    testId: string;
    x: number;
    y: number;
  } | null>(null);

  // Which subject's marks are shown. Defaults to every subject.
  const [subjectFilter, setSubjectFilter] = useState<string>(ALL_SUBJECTS);

  useEffect(() => {
    if (!selectedDate) {
      setSelectedDate(dayjs().format("DD-MM-YYYY"));
    }
  }, [selectedDate, setSelectedDate]);

  const { selectedDarasa } = rootStore;

  // Start each class on "All subjects" (the filter may name a subject from
  // the previously opened class).
  useEffect(() => {
    setSubjectFilter(ALL_SUBJECTS);
  }, [selectedDarasa?.id]);

  const borderColor = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)";
  const headerBg = theme.card;

  const applyScrollX = (x: number, source: "header" | number) => {
    if (syncing.current) return;
    syncing.current = true;
    if (source === "header") {
      studentScrollRefs.current.forEach((ref) =>
        ref?.scrollTo({ x, animated: false })
      );
    } else {
      headerScrollRef.current?.scrollTo({ x, animated: false });
      studentScrollRefs.current.forEach((ref, i) => {
        if (i !== source) ref?.scrollTo({ x, animated: false });
      });
    }
    requestAnimationFrame(() => {
      syncing.current = false;
    });
  };

  const onHeaderHorizontalScroll = (
    e: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    if (syncing.current) return;
    const x = e.nativeEvent.contentOffset.x;
    applyScrollX(x, "header");
  };

  const onRowHorizontalScroll = (
    index: number,
    e: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    if (syncing.current) return;
    const x = e.nativeEvent.contentOffset.x;
    applyScrollX(x, index);
  };

  if (!selectedDarasa) {
    return <Text style={{ color: theme.text }}>No class selected</Text>;
  }

  // Subjects defined on the class plus any subject already used by a test.
  const subjectNames: string[] = Array.from(
    new Set([
      ...selectedDarasa.subjects.map((s) => s.name),
      ...selectedDarasa.tests.map((t) => t.subject).filter(Boolean),
    ])
  );
  const activeFilter =
    subjectFilter === ALL_SUBJECTS || !subjectNames.includes(subjectFilter)
      ? ALL_SUBJECTS
      : subjectFilter;
  const visibleTests =
    activeFilter === ALL_SUBJECTS
      ? selectedDarasa.tests
      : selectedDarasa.tests.filter((test) => test.subject === activeFilter);
  if (selectedDarasa.tests.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          backgroundColor: theme.background,
          justifyContent: "center",
        }}
      >
        <ChartNoAxesCombined size={70} color={theme.text} />
        <Text style={{ color: theme.text, padding:45 }}>Nothing to show here</Text>
        <Button mode="outlined" onPress={() => router.push("/add-test")}>
          Add Your First Test Score
        </Button>
      </View>
    );
  }
  if (selectedDarasa.students.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          backgroundColor: theme.background,
          justifyContent: "center",
        }}
      >
        <Text style={{ color: theme.text }}>No students Found in this class.</Text>
        <Text style={{ color: theme.text }}>
          You do not have any students in this class.
        </Text>
        <Text style={{ color: theme.text }}>Add Student to get started</Text>
        <Button mode="contained" onPress={() => router.push("/add-student")}>
          Add Student
        </Button>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior="padding"
    >
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {/* Pick which subject's marks are displayed */}
      <View style={[styles.subjectFilterBar, { borderBottomColor: borderColor }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subjectFilterContent}
        >
          {[ALL_SUBJECTS, ...subjectNames].map((name) => {
            const selected = activeFilter === name;
            return (
              <Pressable
                key={name}
                onPress={() => setSubjectFilter(name)}
                style={[
                  styles.subjectChip,
                  {
                    borderColor: selected ? "#2563EB" : borderColor,
                    backgroundColor: selected ? "#2563EB" : headerBg,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.subjectChipText,
                    { color: selected ? "#fff" : theme.text },
                  ]}
                >
                  {name === ALL_SUBJECTS ? "All subjects" : name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {visibleTests.length === 0 ? (
        <View style={styles.emptyFilter}>
          <Text style={{ color: theme.text }}>
            No test scores recorded for {activeFilter} yet.
          </Text>
        </View>
      ) : null}

      {/* Fixed table header: name column + horizontally scrollable test titles */}
      <View
        style={[
          styles.tableHeader,
          {
            borderBottomColor: borderColor,
            backgroundColor: headerBg,
          },
        ]}
      >
        <View
          style={[
            styles.nameHeaderCell,
            {
              width: NAME_COL_WIDTH,
              borderRightColor: borderColor,
            },
          ]}
        >
          <Text style={[styles.headerText, { color: theme.text }]}>Student</Text>
        </View>
        <ScrollView
          horizontal
          ref={headerScrollRef}
          style={styles.marksScroll}
          
          nestedScrollEnabled
          scrollEventThrottle={16}
          onScroll={onHeaderHorizontalScroll}
        >
          <View style={styles.marksRowInner}>
            {visibleTests.map((test) => (
              <View
                key={test.id}
                style={[
                  styles.markHeaderCell,
                  {
                    width: MARK_COL_WIDTH,
                    borderRightColor: borderColor,
                  },
                ]}
              >
                <View style={styles.markHeaderLabel}>
                  <Text
                    style={[styles.headerText, styles.markHeaderText, { color: theme.text }]}
                    numberOfLines={2}
                  >
                    {test.testname}
                  </Text>
                  <Text
                    style={[styles.subjectText, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    {test.subject}
                  </Text>
                </View>
                <Pressable
                  collapsable={false}
                  hitSlop={8}
                  onPress={(e) => {
                    e.currentTarget.measureInWindow((x, y, w, h) =>
                      setMenuState({ testId: test.id, x: x + w, y: y + h })
                    );
                  }}
                  style={styles.moreButton}
                >
                  <MoreVertical size={18} color={theme.text} />
                </Pressable>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Body: vertical scroll only — names stay in the first column */}
      <ScrollView
        style={styles.bodyScroll}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator
        nestedScrollEnabled
      >
        {selectedDarasa.students.map((student, index) => (
          <View
            key={student.id}
            style={[
              styles.dataRow,
              {
                borderBottomColor: borderColor,
              },
            ]}
          >
            <View
              style={[
                styles.nameCell,
                {
                  width: NAME_COL_WIDTH,
                  borderRightColor: borderColor,
                  backgroundColor: theme.background,
                },
              ]}
            >
              <Text style={[styles.nameText, { color: theme.text }]} numberOfLines={3}>
                {student.full_name}
              </Text>
            </View>
            <ScrollView
              horizontal
              style={styles.marksScroll}
              showsHorizontalScrollIndicator={index === -1}
              nestedScrollEnabled
              scrollEventThrottle={16}
              ref={(ref) => {
                studentScrollRefs.current[index] = ref;
              }}
              onScroll={(e) => onRowHorizontalScroll(index, e)}
            >
              <View style={styles.marksRowInner}>
                {visibleTests.map((test) => {
                  const score = test.scores?.find(
                    (s) => s.studentId === student.id
                  );
                  return (
                    <View
                      key={test.id}
                      style={[
                        styles.markCell,
                        {
                          width: MARK_COL_WIDTH,
                          borderRightColor: borderColor,
                        },
                      ]}
                    >
                      <Text style={[styles.markText, { color: theme.text }]}>
                        {score ? score.marks : "-"}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        ))}
      </ScrollView>

      {/* Test actions menu (Edit / Delete) anchored to the ellipsis icon */}
      <Menu
        visible={!!menuState}
        onDismiss={() => setMenuState(null)}
        anchor={
          menuState ? { x: menuState.x, y: menuState.y } : { x: 0, y: 0 }
        }
      >
        <MenuItem
          leadingIcon="pencil"
          title="Edit"
          onPress={() => {
            const testId = menuState?.testId;
            setMenuState(null);
            if (testId) {
              requestTestEdit(testId);
              router.push("/(classes)/add-test");
            }
          }}
        />
        <MenuItem
          leadingIcon="trash-can-outline"
          title="Delete"
          titleStyle={{ color: "#DC2626" }}
          onPress={() => {
            const testId = menuState?.testId;
            setMenuState(null);
            if (!testId) return;
            Alert.alert(
              "Delete test",
              "Are you sure you want to delete this test? This action cannot be undone.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: () => selectedDarasa.removeTest(testId),
                },
              ]
            );
          }}
        />
      </Menu>
    </View>
    </KeyboardAvoidingView>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  tableHeader: {
    flexDirection: "row",
    alignItems: "stretch",
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    zIndex: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  nameHeaderCell: {
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  marksScroll: {
    flex: 1,
  },
  marksRowInner: {
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: 44,
  },
  markHeaderCell: {
    flexDirection:"row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  headerText: {
    fontSize: 14,
    fontWeight: "700",
  },
  markHeaderText: {
    textAlign: "center",
  },
  markHeaderLabel: {
    flex: 1,
    alignItems: "center",
  },
  subjectText: {
    fontSize: 10,
    opacity: 0.7,
    marginTop: 2,
  },
  subjectFilterBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  subjectFilterContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  subjectChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  subjectChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  emptyFilter: {
    padding: 16,
  },
  moreButton: {
    marginLeft: 4,
    padding: 2,
  },
  bodyScroll: {
    flex: 1,
  },
  bodyContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  dataRow: {
    flexDirection: "row",
    alignItems: "stretch",
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
  },
  nameCell: {
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  nameText: {
    fontSize: 15,
    lineHeight: 20,
  },
  markCell: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  markText: {
    fontSize: 15,
    fontWeight: "600",
  },
});

export default TestScoreScreen;
