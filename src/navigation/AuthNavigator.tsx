import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SplashScreen from '../screens/SplashScreen';
import TenantScreen from '../screens/TenantScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import SetPinScreen from '../screens/SetPinScreen';
import SetupScreen from '../screens/SetupScreen';
import SetupFaceScreen from '../screens/SetupFaceScreen';
import SsoScreen from '../screens/SsoScreen';
import type { AuthStackParamList } from '../types/navigation';
import { Colors } from '../theme/colors';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary[700] },
        headerTintColor: Colors.white,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: Colors.gray[50] },
      }}
    >
      <Stack.Screen
        name="Splash"
        component={SplashScreen}
        options={{ headerShown: false, animation: 'fade' }}
      />
      <Stack.Screen
        name="Tenant"
        component={TenantScreen}
        options={{ title: 'Pilih Tenant', headerShown: false }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ title: 'Daftar Akun' }}
      />
      <Stack.Screen
        name="SetPin"
        component={SetPinScreen}
        options={{ title: 'Atur PIN', headerBackVisible: false }}
      />
      <Stack.Screen
        name="Setup"
        component={SetupScreen}
        options={{ title: 'Input Kode Unik', headerBackVisible: false }}
      />
      <Stack.Screen
        name="SetupFace"
        component={SetupFaceScreen}
        options={{ title: 'Scan Wajah' }}
      />
      <Stack.Screen
        name="Sso"
        component={SsoScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

