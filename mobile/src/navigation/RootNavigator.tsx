import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useAuth } from "../context/AuthContext";
import AuthStack from "./AuthStack";
import MainTabs from "./MainTabs";
import { colors } from "../theme";

// Switches the whole nav tree based on auth state. While we're checking the
// stored token on app launch, we render a splash spinner instead of flashing
// the Hello page before bouncing into the app.
export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={colors.orange} />
      </View>
    );
  }

  return user ? <MainTabs /> : <AuthStack />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
});
