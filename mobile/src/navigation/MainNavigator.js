import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/theme';
import { useAuth } from '../context/AuthContext';
import MapScreen from '../screens/Map/MapScreen';
import CarpoolScreen from '../screens/Carpool/CarpoolScreen';
import DashboardScreen from '../screens/Dashboard/DashboardScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import AdminScreen from '../screens/Admin/AdminScreen';

const Tab = createBottomTabNavigator();

const ICONS = {
  Map: ['map', 'map-outline'],
  Carpool: ['car', 'car-outline'],
  Dashboard: ['stats-chart', 'stats-chart-outline'],
  Profile: ['person', 'person-outline'],
  Admin: ['shield', 'shield-outline'],
};

const MainNavigator = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin_master' || user?.role === 'admin_secondary';
  return (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textSubtle,
      tabBarStyle: {
        backgroundColor: colors.surface,
        borderTopColor: colors.border,
        height: 60,
        paddingBottom: 8,
        paddingTop: 6,
      },
      tabBarIcon: ({ focused, color, size }) => {
        const [on, off] = ICONS[route.name] || ['ellipse', 'ellipse-outline'];
        return <Ionicons name={focused ? on : off} size={size} color={color} />;
      },
    })}
  >
    <Tab.Screen name="Map" component={MapScreen} />
    <Tab.Screen name="Carpool" component={CarpoolScreen} />
    <Tab.Screen name="Dashboard" component={DashboardScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
    {isAdmin && <Tab.Screen name="Admin" component={AdminScreen} />}
  </Tab.Navigator>
  );
};

export default MainNavigator;
