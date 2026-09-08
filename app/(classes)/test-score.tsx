import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { observer } from "mobx-react-lite";
import { rootStore } from "@/components/models";
import { Button, Menu } from "react-native-paper";
import dayjs from "dayjs";
import { useRouter } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { ChartNoAxesCombined, Edit3, FlipVerticalIcon, GripVertical, MoreVertical } from "lucide-react-native";

const NAME_COL_WIDTH = 140;
const MARK_COL_WIDTH = 80;

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

  useEffect(() => {
    if (!selectedDate) {
      setSelectedDate(dayjs().format("DD-MM-YYYY"));
    }
  }, [selectedDate, setSelectedDate]);

  const { selectedDarasa } = rootStore;

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
    <View style={[styles.root, { backgroundColor: theme.background }]}>
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
            {selectedDarasa.tests.map((test) => (
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
                <Text
                  style={[styles.headerText, styles.markHeaderText, { color: theme.text }]}
                  numberOfLines={2}
                >
                  {test.testname}
                </Text>
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
                {selectedDarasa.tests.map((test) => {
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
        <Menu.Item
          leadingIcon="pencil"
          title="Edit"
          onPress={() => {
            const testId = menuState?.testId;
            setMenuState(null);
            if (testId) {
              router.push({
                pathname: "/(classes)/add-test",
                params: { editTestId: testId },
              });
            }
          }}
        />
        <Menu.Item
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
