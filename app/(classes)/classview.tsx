import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView , useColorScheme, Image, KeyboardAvoidingView } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { observer } from "mobx-react-lite";
import { useTheme } from "@/context/ThemeContext";
import { rootStore } from "@/components/models";
import {Button, DataTable, Menu} from "react-native-paper";
import React,{ useState } from "react";
import { BarChart4Icon, ChevronLeft, Edit3, SaveAll, Trash2, UserPlus2, Users } from "lucide-react-native";

const ClassHomeScreen = observer(() => {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { selectedDarasa } = rootStore
  const [menuStudentId, setMenuStudentId] = useState<string | null>(null);

  const confirmDelete = (student: any) => {
    Alert.alert(
      "Delete student",
      `Remove ${student.full_name} from this class? Their attendance records will be deleted too.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            rootStore.setSelectedStudent(null);
            rootStore.selectedDarasa?.removeStudent(student.id);
          },
        },
      ]
    );
  };

  const onEditStudent = (student: any) => {
    rootStore.setSelectedStudent(student.id);
    // Pass the tapped student's id in the URL so the edit form loads exactly this student
    router.push(`/add-student?edit=1&studentId=${student.id}`);
  };

  if (!selectedDarasa) {
    return <Text>No class selected</Text>
  }
  if (selectedDarasa.students.length === 0) {
    return (
      
      <View style={[styles.emptyRoot, { backgroundColor: theme.background }]}> 
        <Image
          source={require("../../assets/images/empty-class.png")}
          style={styles.emptyImage}
        />
        <View style={{flex:1, paddingTop:80, alignItems:"center"}}>
        <Text style={[styles.emptyTitle, { color: theme.text }]}>No students yet</Text>
        <Text style={[styles.emptySubtitle, { color: theme.text }]}>You haven't added any students to {selectedDarasa.name}. Add students to start tracking attendance and performance.</Text>
        <View style={styles.emptyActions}>
          <Button
            mode="outlined"
            onPress={() => {
              rootStore.setSelectedStudent(null);
              router.push("/add-student");
            }}
          >
            Add Student
          </Button>
          <Button mode="outlined" onPress={() => router.replace("/")}>
           Go Home
          </Button>
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.background, padding:15 }}>
    
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background, padding:15 }}>
    
    <ScrollView
    contentContainerStyle={{ flexGrow: 1 }}
    showsVerticalScrollIndicator={false}
    >
      <View style={{flex:1, backgroundColor: theme.background }}>
      <Text style={{ fontWeight: "bold", marginBottom: 16 ,color: theme.text, fontSize: 18}}>
        
      </Text>

      {/* Quick Actions Grid */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={[styles.actionCard, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: isDark ? '#334155' : '#e2e8f0' }]}
          onPress={() => {
            rootStore.setSelectedStudent(null);
            router.push("/add-student");
          }}
        >
          <Ionicons name="person-add-outline" size={28} color='#3B82F6' />
          <Text style={[styles.actionCardText, { color: theme.text }]}>Add Student</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionCard, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: isDark ? '#334155' : '#e2e8f0' }]}
          onPress={() => router.push("/(classes)/attendance")}
        >
          <Ionicons name="people-outline" size={28} color='#3B82F6' />
          <Text style={[styles.actionCardText, { color: theme.text }]}>Attendance</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionCard, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: isDark ? '#334155' : '#e2e8f0' }]}
          onPress={() => router.push("/(classes)/add-test")}
        >
          <Edit3 size={28} color='#3B82F6' />
          <Text style={[styles.actionCardText, { color: theme.text }]}>Add Test</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionCard, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: isDark ? '#334155' : '#e2e8f0' }]}
          onPress={() => router.push("/(classes)/test-score")}
        >
          <BarChart4Icon size={28} color='#3B82F6' />
          <Text style={[styles.actionCardText, { color: theme.text }]}>Test Scores</Text>
        </TouchableOpacity>
      </View>

      <Text style={{ fontWeight: "bold", marginBottom: 10, marginTop: 20 ,color: theme.text, fontSize: 16}}>
        Class Roster
      </Text>

      <DataTable.Header>
        <DataTable.Title><Text style={{ color: theme.text }}>Registration No.</Text></DataTable.Title>
        <DataTable.Title><Text style={{ color: theme.text }}>Full Name</Text></DataTable.Title>

      </DataTable.Header>

      {selectedDarasa.students.map(student => (
        <View key={`${student.id}`}>
          <Menu
            visible={menuStudentId === student.id}
            onDismiss={() => setMenuStudentId(null)}
            contentStyle={{ backgroundColor: theme.card }}
            anchor={
              <DataTable.Row onPress={() => setMenuStudentId(student.id)}>
                <DataTable.Cell><Text style={{ color: theme.text }}>{student.reg_no || student.id}</Text></DataTable.Cell>
                <DataTable.Cell>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
                    <Text style={{ color: theme.text }}>{student.full_name}</Text>
                    {student.sex ? (
                      <Ionicons
                        name={student.sex === "male" ? "man" : "woman"}
                        size={14}
                        color={student.sex === "male" ? "#2563EB" : "#16A34A"}
                      />
                    ) : null}
                  </View>
                </DataTable.Cell>
              </DataTable.Row>
            }
          >
            <Menu.Item
              leadingIcon="pencil-outline"
              title="Edit student"
              titleStyle={{ color: theme.text }}
              onPress={() => {
                setMenuStudentId(null);
                onEditStudent(student);
              }}
            />
            <Menu.Item
              leadingIcon="trash-outline"
              title="Delete student"
              titleStyle={{ color: theme.text }}
              onPress={() => {
                setMenuStudentId(null);
                confirmDelete(student);
              }}
            />
          </Menu>
        </View>
      ))}

      
    </View>
    </ScrollView>
    </SafeAreaView> 
    </KeyboardAvoidingView>
    
  )
});
const styles = StyleSheet.create({
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
    
  },
  actionCard: {
    flexBasis: '48%',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    
  },
  actionCardText: {
    fontWeight: '600',
    fontSize: 13,
    textAlign: 'center',
  },
  header:{
    marginHorizontal: 12,
    marginBottom: 12,


  },
 
  iconviewDark: {
    backgroundColor: '#2B2B2B',
    borderColor: '#444C56',
  },
  iconview: {
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    flexBasis: '48%',        // two items per row
  },
  iconviewLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },

  headerDark: {
    backgroundColor: 'green',
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 1,
  },
  headerLight: {
    backgroundColor: 'transparent',
    padding: 6,
  },

  overlay: {
    flex: 1,
    justifyContent: "flex-start",
    backgroundColor: "rgba(0,0,0,0.3)", // semi-transparent
  },
  actionsRow: {
  flexDirection: 'row',
  flexWrap: 'wrap',        // allow wrapping
  justifyContent: 'space-between',
  gap: 12,
},

  classCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  classIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  classInfo: {
    flex: 1,
  },
  className: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  classDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  classDetail: {
    fontSize: 12,
  },
  // Empty-state styles
  emptyRoot: {
    flex: 1,
    alignItems: 'center',
    
    padding: 24,
  },
  emptyImage: {
    width: 140,
    height: 140,
    marginBottom: 18,
    resizeMode: 'contain',
    borderRadius: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
    maxWidth: 360,
  },
  emptyActions: {
    flexDirection: 'row',
    gap: 20,
    padding:50
  },
});

export default ClassHomeScreen