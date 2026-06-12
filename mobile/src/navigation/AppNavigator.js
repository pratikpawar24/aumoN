import React, { useEffect } from 'react';
import { NavigationContainer, DefaultTheme, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/theme';
import Loading from '../components/common/Loading';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import EmailVerificationScreen from '../screens/Auth/EmailVerificationScreen';
import { onNotificationTap } from '../services/notificationService';
import { emitChatIntent } from '../services/notificationIntents';

const Stack = createNativeStackNavigator();
export const navigationRef = createNavigationContainerRef();

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.bg, card: colors.bg, text: colors.text, border: colors.border, primary: colors.primary },
};

const AppNavigator = () => {
  const { booting, isAuthenticated, emailVerified } = useAuth();

  // Tapping a push notification deep-links into the Carpool tab, and for chat
  // notifications, opens the specific conversation (CarpoolScreen consumes the
  // buffered intent).
  useEffect(() => {
    const unsub = onNotificationTap((data) => {
      if (!data) return;
      if (data.type === 'chat' || data.type === 'match') {
        if (navigationRef.isReady()) navigationRef.navigate('Main', { screen: 'Carpool' });
        if (data.type === 'chat' && data.rideId) {
          emitChatIntent({ rideId: data.rideId, peerId: data.peerId });
        }
      }
    });
    return unsub;
  }, []);

  if (booting) return <Loading full label="Starting AumoN…" />;

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : !emailVerified ? (
          <Stack.Screen name="Verify" component={EmailVerificationScreen} />
        ) : (
          <Stack.Screen name="Main" component={MainNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
