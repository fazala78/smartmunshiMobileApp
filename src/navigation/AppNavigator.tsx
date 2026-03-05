import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

import TenantVerificationScreen from '../screens/TenantVerificationScreen';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import type { RootStackParamList } from '../types/navigation';
import OTPVerificationScreen from '../screens/OTPVerificationScreen';
import ContactsScreen from '../screens/ContactsScreen';
import ContactLedger from '../screens/ContactLedger';
import JournalScreen from '../screens/JournalScreen';
import MenuScreen from '../screens/MenuScreen';
import BillingScreen from '../screens/BillingScreen';
import ReceivePaymentScreen from '../screens/ReceivePaymentScreen';
import PayPaymentScreen from '../screens/PayPaymentScreen';
import ExpenseScreen from '../screens/ExpenseScreen';
import BankPaymentScreen from '../screens/BankPaymentScreen';
import AddContactScreen from '../screens/AddContactScreen';
import AddProductScreen from '../screens/AddProductScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList>('TenantVerification');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const tenantKey = await AsyncStorage.getItem('tenantKey');
      const authToken = await AsyncStorage.getItem('authToken');

      console.log('Tenant Key:', tenantKey);
      console.log('Auth Token:', authToken);

      if (authToken && tenantKey) {
        // User is fully authenticated
        setInitialRoute('Home');
      } else if (tenantKey) {
        // Tenant is set, but not logged in
        setInitialRoute('Login');
      } else {
        // New user, no tenant key
        setInitialRoute('TenantVerification');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setInitialRoute('TenantVerification');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute}>
        <Stack.Screen
          name="TenantVerification"
          component={TenantVerificationScreen}
          options={{ 
            headerShown: false,
            gestureEnabled: false 
          }}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ 
            headerShown: false,
            gestureEnabled: false 
          }}
        />
         <Stack.Screen
          name="Menu"
          component={MenuScreen}
          options={{ 
            headerShown: false,
            gestureEnabled: false 
          }}
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ 
             headerShown: false,
            headerBackVisible: false 
          }}
        />
         <Stack.Screen
          name="Journal"
          component={JournalScreen}
          options={{ 
             headerShown: false,
            headerBackVisible: false 
          }}
        />
         <Stack.Screen
          name="ContactLedger"
          component={ContactLedger}
          options={{ 
             headerShown: false,
            headerBackVisible: false 
          }}
        />
        <Stack.Screen
          name="Contacts"
          component={ContactsScreen}
          options={{ 
             headerShown: false,
            headerBackVisible: true 
          }}
        />
        <Stack.Screen
          name="OTPVerification"
          component={OTPVerificationScreen}
          options={{ 
            headerShown: false,
            gestureEnabled: false 
          }}
        />
         <Stack.Screen
          name="Billing"
          component={BillingScreen}
          options={{ 
            headerShown: false,
            gestureEnabled: false 
          }}
        />
         <Stack.Screen
          name="ReceivePayment"
          component={ReceivePaymentScreen}
          options={{ 
            headerShown: false,
            gestureEnabled: false 
          }}
        />
         <Stack.Screen
          name="PayPayment"
          component={PayPaymentScreen}
          options={{ 
            headerShown: false,
            gestureEnabled: false 
          }}
        />
         <Stack.Screen
          name="PayExpense"
          component={ExpenseScreen}
          options={{ 
            headerShown: false,
            gestureEnabled: false 
          }}
        />
         <Stack.Screen
          name="BankTransaction"
          component={BankPaymentScreen}
          options={{ 
            headerShown: false,
            gestureEnabled: false 
          }}
        />
         <Stack.Screen
          name="AddContact"
          component={AddContactScreen}
          options={{ 
            headerShown: false,
            gestureEnabled: false 
          }}
        />
         <Stack.Screen
          name="AddProduct"
          component={AddProductScreen}
          options={{ 
            headerShown: false,
            gestureEnabled: false 
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});

export default AppNavigator;