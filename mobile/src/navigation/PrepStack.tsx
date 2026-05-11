import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import PrepListScreen from "../screens/PrepListScreen";
import QuestionDetailScreen from "../screens/QuestionDetailScreen";
import PracticeRecorderScreen from "../screens/PracticeRecorderScreen";
import AIChatScreen from "../screens/AIChatScreen";

export type PrepStackParamList = {
  PrepList: undefined;
  QuestionDetail: { questionId: string };
  PracticeRecorder: { questionId: string; questionText: string };
  AIChat: { questionId: string; questionText: string };
};

const Stack = createNativeStackNavigator<PrepStackParamList>();

export default function PrepStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PrepList" component={PrepListScreen} />
      <Stack.Screen name="QuestionDetail" component={QuestionDetailScreen} />
      <Stack.Screen name="PracticeRecorder" component={PracticeRecorderScreen} />
      <Stack.Screen name="AIChat" component={AIChatScreen} />
    </Stack.Navigator>
  );
}
