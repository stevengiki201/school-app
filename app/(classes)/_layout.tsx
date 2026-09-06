import { Drawer } from "expo-router/drawer"
import { Ionicons } from "@expo/vector-icons"
import { observer } from "mobx-react-lite"
import { rootStore } from "@/components/models"
import React from "react"
import { BarChart2, Edit3, File, LogOut, LogsIcon,  } from "lucide-react-native"


const DrawerLayout = observer(() => {
  const { selectedDarasa } = rootStore

  return (
    <Drawer
      screenOptions={{
        headerShown: true,
        
      }}
    >
      <Drawer.Screen
        name="classview"
        options={{
          title: selectedDarasa?.name ?? "Class",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="add-student"
        options={{
          title: "Add Student",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="person-add-outline" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="attendance"
        options={{
          title: "Take Attendance",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />

      
      <Drawer.Screen
        name="saved-rolcall"
        options={{
          title: "Saved Attendance",
          drawerIcon: ({ color, size }) => (
            <File size={size} color={color} />
          ),
        }}
      />
       
       <Drawer.Screen
        name="exports"
        options={{
          title: "Export Attendance",
          drawerIcon: ({ color, size }) => (
            <LogsIcon size={size} color={color} />
          ),
        }}
      />



      <Drawer.Screen
        name="test-score"
        options={{
          title: "Test Score",
          drawerIcon: ({ color, size }) => (
            <BarChart2 size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="add-test"
        options={{
          title: "Add Test Scores",
          drawerIcon: ({ color, size }) => (
            <Edit3 size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="delete-class"
        options={{
          title: "Delete Class",
          drawerIcon: ({ size }) => (
            <Ionicons name="trash-outline" size={size} color="red" />
          ),
        }}
      />

<Drawer.Screen
        name="exit"
        options={{
          
          title: "Exit ",
          drawerIcon: ({ color, size }) => (
            <LogOut size={size} color={color} />
          ),
        }}
      />
    </Drawer>
  )
})

export default DrawerLayout
