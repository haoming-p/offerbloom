import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { House, TableProperties, BicepsFlexed, User, Pencil } from 'lucide-react-native';

import { RoleProvider } from './src/context/RoleContext';
import { StatusProvider } from './src/context/StatusContext';
import { ChatProvider } from './src/context/ChatContext';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import PracticeSessionScreen from './src/screens/PracticeSessionScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AnswerDetailScreen from './src/screens/AnswerDetailScreen';
import QuickPracticeScreen from './src/screens/QuickPracticeScreen';
import CategoryScreen from './src/screens/CategoryScreen';
import AIChatScreen from './src/screens/AIChatScreen';


const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Tab Bar
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#E8640A',
        tabBarInactiveTintColor: '#9BA5A0',
        tabBarStyle: { backgroundColor: '#FFFFFF', borderTopColor: '#E8E8E8' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => <House size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="My Prep"
        options={{
          tabBarIcon: ({ color, size }) => <TableProperties size={size} color={color} />,
        }}
      >
  {(props) => <CategoryScreen {...props} route={{ ...props.route, params: { categoryName: 'Self-intro' } }} />}
</Tab.Screen>
      
      
      <Tab.Screen
        name="Practice"
        component={QuickPracticeScreen}
        options={{ 
          tabBarIcon: ({ color, size }) => <BicepsFlexed size={size} color={color} />, 
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ 
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

// App Navigation structure
export default function App() {
  return (
    <RoleProvider>
      <StatusProvider>
        <ChatProvider>
          <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Main" component={MainTabs} />
              <Stack.Screen name="PracticeSession" component={PracticeSessionScreen} />
              <Stack.Screen name="AnswerDetail" component={AnswerDetailScreen} />
              <Stack.Screen name="Category" component={CategoryScreen} />
              <Stack.Screen name="AIChat" component={AIChatScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </ChatProvider>
      </StatusProvider>
    </RoleProvider>
  );
}