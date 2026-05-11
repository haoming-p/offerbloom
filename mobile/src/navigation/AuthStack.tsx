import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HelloScreen from "../screens/HelloScreen";
import LoginScreen from "../screens/LoginScreen";

export type AuthStackParamList = {
  Hello: undefined;
  Login: { mode?: "signin" | "signup" } | undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Hello" component={HelloScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}
