import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import PrepListScreen from "../screens/PrepListScreen";
import QuestionDetailScreen from "../screens/QuestionDetailScreen";
import PracticeRecorderScreen from "../screens/PracticeRecorderScreen";

// AIChat is no longer a route — it's now a bottom sheet rendered inside
// QuestionDetailScreen so the user can still see/select practices and
// answers behind the chat.
export type PrepStackParamList = {
  PrepList: undefined;
  QuestionDetail: { questionId: string };
  PracticeRecorder: { questionId: string; questionText: string };
};

const Stack = createNativeStackNavigator<PrepStackParamList>();

export default function PrepStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PrepList" component={PrepListScreen} />
      <Stack.Screen name="QuestionDetail" component={QuestionDetailScreen} />
      <Stack.Screen name="PracticeRecorder" component={PracticeRecorderScreen} />
    </Stack.Navigator>
  );
}
