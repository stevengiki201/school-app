import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import "react-native-reanimated";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { CircleUserRound } from "lucide-react-native";
import { rootStore } from "@/components/models";
import { Provider } from "mobx-react";
import React, { useCallback, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { applySnapshot } from "mobx-state-tree";
import * as SplashScreen from "expo-splash-screen";
import { ThemeProvider } from "@/context/ThemeContext";
import { Provider as PaperProvider } from "react-native-paper";
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import { syncServerDataToStore } from "@/services/syncFromServer";

function netInfoToOnline(state: NetInfoState): boolean {
  if (state.isConnected === false) return false;
  if (state.isInternetReachable === false) return false;
  return true;
}

// Keep the splash screen visible while we fetch resources

// Force the app to open on the `index` route instead of the tabs layout.
export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const [isReady, setIsReady] = React.useState(false);
   useEffect(() => {
    SplashScreen.preventAutoHideAsync();
  }, []);

  const colorScheme = useColorScheme(); // 'light' | 'dark'
  const router = useRouter();
  const loadinitialData = useCallback(async () => {
  try {
    const storedData = await AsyncStorage.getItem("rootStore");
    if (storedData) {
      const rootStoreData = JSON.parse(storedData);
    applySnapshot(rootStore, rootStoreData);
    }
  } catch (error) {
    console.error("Failed to load initial data:", error);
  } finally {
    setIsReady(true);
  }
}, []);

useEffect(() => {
  loadinitialData();
}, [loadinitialData]);

useEffect(() => {
  if (!isReady) return;

  const hideSplash = async () => {
    await SplashScreen.hideAsync();
  };

  hideSplash();
}, [isReady]);

  useEffect(() => {
    if (!isReady) return;

    rootStore.ensureAuthClientId();

    let cancelled = false;

    const maybeSync = () => {
      if (cancelled) return;
      if (!rootStore.isOnline) return;
      if (!rootStore.authUser) return;
      syncServerDataToStore().catch((err) =>
        console.warn("[sync] syncServerDataToStore", err)
      );
    };

    const unsub = NetInfo.addEventListener((state) => {
      const online = netInfoToOnline(state);
      rootStore.setOnline(online);
      if (online) maybeSync();
    });

    NetInfo.fetch().then((state) => {
      const online = netInfoToOnline(state);
      rootStore.setOnline(online);
      if (online) maybeSync();
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [isReady]);

  if (!isReady) {
    return null;
  }

  const isDark = colorScheme === "dark";

  return (
    <SafeAreaProvider>
      <Provider rootstore={rootStore}>
        <PaperProvider>
          <ThemeProvider>
            <NavigationThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
              <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#000' : '#fff' }} edges={["top", "left", "right"]}>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: {
                    flex: 1,
                  },
                }}
              >
                <Stack.Screen
                  name="(tabs)"
                  options={{
                    title: "ShuleBomba",
                    headerBackVisible: false,
                    gestureEnabled: false,
                    headerLeft : ()=>null,
                  }}
                />

                <Stack.Screen
                  name="modal"
                  options={{
                    presentation: "modal",
                    title: "Modal",
                  }}
                />

                <Stack.Screen
                  name="account"
                  options={{ title: "Account", headerBackTitle: "Back" }}
                />
                <Stack.Screen
                  name="about-app"
                  options={{ title: "About App", headerBackTitle: "Back" }}
                />
                
                <Stack.Screen
                  name="manage-madarasa"
                  options={{ title: "Manage Classes", headerBackTitle: "Back"}}
                />
                <Stack.Screen
                  name="app-preference"
                  options={{ title: "App Preferences", headerBackTitle: "Back" }}
                />
             
                <Stack.Screen
                  name="(classes)"
                  options={{
                     headerShown: false
                    
                     }}
                />
              </Stack>
              
              </SafeAreaView>

              {/* Status bar theme */}
              <StatusBar style={isDark ? "light" : "dark"} />
            </NavigationThemeProvider>
          </ThemeProvider>
        </PaperProvider>
      </Provider>
    </SafeAreaProvider>
  );
}
