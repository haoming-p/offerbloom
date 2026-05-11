import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import StoriesScreen from "../screens/StoriesScreen";
import StoryDetailScreen from "../screens/StoryDetailScreen";

export type LibraryStackParamList = {
  Stories: undefined;
  StoryDetail: { storyId: string };
};

const Stack = createNativeStackNavigator<LibraryStackParamList>();

export default function LibraryStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Stories" component={StoriesScreen} />
      <Stack.Screen name="StoryDetail" component={StoryDetailScreen} />
    </Stack.Navigator>
  );
}
