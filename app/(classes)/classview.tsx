import { View, Text, TouchableOpacity, StyleSheet, TextInput ,ScrollView , useColorScheme, Image, KeyboardAvoidingView } from "react-native"
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { observer } from "mobx-react-lite";
import { useTheme } from "@/context/ThemeContext";
import { rootStore } from "@/components/models";
import {Modal,Button, DataTable} from "react-native-paper";
import React,{ useState } from "react";
import { BarChart4Icon, ChevronLeft, Edit3, SaveAll, Trash2, UserPlus2, Users } from "lucide-react-native";

const ClassHomeScreen = observer(() => {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { selectedDarasa,selectedStudent } = rootStore
  const [visible, setVisible] = useState(false);
  
  const onSelectStudent =  (student: any) => {
    rootStore.setSelectedStudent(student.id);
    setVisible(true);
  };

  const onDeleteStudent=(student: any)=>{
    if(!selectedStudent) return;
    rootStore.setSelectedStudent(null);
    rootStore.selectedDarasa?.removeStudent(student.id);  
    
    setVisible(false);

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
          <Button mode="outlined" onPress={() => router.push("/add-student")}>
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
    
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background, padding:15 }}>
    <KeyboardAvoidingView>
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
          onPress={() => router.push("/add-student")}
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
        <DataTable.Row key={`${student.id}`}>
          <DataTable.Cell><Text style={{ color: theme.text }}>{student.id}</Text></DataTable.Cell>
          <DataTable.Cell onPress={() => onSelectStudent(student) }><Text style={{ color: theme.text }}>{student.full_name}</Text></DataTable.Cell>
        </DataTable.Row>
      ))}

      
    </View>
    </ScrollView>
    <Modal
        visible={visible}
      
        onDismiss={() => setVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={[styles.bottomSheet, { paddingBottom: 20 + insets.bottom }] }>
            <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}>name</Text>
            <TextInput
              style={styles.textInput}
              value={selectedStudent?.full_name || ""}
              onChangeText={(value)=>{
                selectedStudent?.setFullName(value);
              }}
              
            />  
            <View style={styles.modalButton}> 
            <Button mode="contained" onPress={() => setVisible(false)}>
              Save
            </Button>
            <Button mode="contained" buttonColor="red" onPress={() => onDeleteStudent(selectedStudent) }>
              Delete
            </Button>
            </View>
          </View>
        </View>
      </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView> 
    
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

  textInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
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
  bottomSheet: {
    backgroundColor: "#fff",
    padding: 50,
    borderRadius: 20,
    minHeight: 300, // short screen height
  },
  modalButton: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
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