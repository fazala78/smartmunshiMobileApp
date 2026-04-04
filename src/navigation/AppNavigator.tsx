import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import ChequeListScreen from '../screens/ChequeListScreen';
import JournalEntryScreen from '../screens/JournalEntryScreen';
import InventoryTransactionsScreen from '../screens/InventoryTransactionsScreen';
import PaymentsListScreen from '../screens/PaymentsListScreen';
import BankPaymentListScreen from '../screens/BankPaymentListScreen';
import ExpensePaymentListScreen from '../screens/ExpensePaymentListScreen';
import Loading from '../components/common/Loading';
import { useQuery } from '@tanstack/react-query';
import { getConfiguration } from '../services/authService';
import DailyCashReportScreen from '../screens/DailyCashReportScreen';
import { ContactSyncProvider } from '../context/ContactSyncContext';

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  const [isAppReady, setIsAppReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList>('TenantVerification');

  // ✅ useQuery must be called at top level, not inside useEffect
  const { data: configData, isLoading: isConfigLoading } = useQuery({
    queryKey: ['configuration'],
    queryFn: getConfiguration,
  });

  // ✅ Runs when config data is fetched successfully
  useEffect(() => {
    if (isConfigLoading) return; // wait for config to finish
    const initApp = async () => {
      try {
        // Save config to AsyncStorage if available
        if (configData) {
          await AsyncStorage.setItem('configuration', JSON.stringify(configData));
        }
        // Check auth state
        const tenantKey = await AsyncStorage.getItem('tenantKey');
        const authToken = await AsyncStorage.getItem('authToken');
        if (authToken && tenantKey) {
          setInitialRoute('Home');
        } else if (tenantKey) {
          setInitialRoute('Login');
        } else {
          setInitialRoute('TenantVerification');
        }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        setInitialRoute('TenantVerification');
      } finally {
        setIsAppReady(true); // ✅ app is ready only after both config + auth check
      }
    };
    initApp();
  }, [isConfigLoading, configData]); // ✅ re-runs when config loading state changes

  // ✅ Show loading until config is fetched AND auth is checked
  if (!isAppReady || isConfigLoading) {
    return <Loading />;
  }

  return (
       <ContactSyncProvider>
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute}>
     
        <Stack.Screen name="TenantVerification" component={TenantVerificationScreen} options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="Menu" component={MenuScreen} options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false, headerBackVisible: false }} />
        <Stack.Screen name="Journal" component={JournalScreen} options={{ headerShown: false, headerBackVisible: false }} />
        <Stack.Screen name="ContactLedger" component={ContactLedger} options={{ headerShown: false, headerBackVisible: false }} />
        <Stack.Screen name="Contacts" component={ContactsScreen} options={{ headerShown: false, headerBackVisible: true }} />
        <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="Billing" component={BillingScreen} options={{ headerShown: false, gestureEnabled: true }} />
        <Stack.Screen name="ReceivePayment" component={ReceivePaymentScreen} options={{ headerShown: false, gestureEnabled: true }} />
        <Stack.Screen name="PayPayment" component={PayPaymentScreen} options={{ headerShown: false, gestureEnabled: true }} />
        <Stack.Screen name="PayExpense" component={ExpenseScreen} options={{ headerShown: false, gestureEnabled: true }} />
        <Stack.Screen name="BankTransaction" component={BankPaymentScreen} options={{ headerShown: false, gestureEnabled: true }} />
        <Stack.Screen name="AddContact" component={AddContactScreen} options={{ headerShown: false, gestureEnabled: true }} />
        <Stack.Screen name="AddProduct" component={AddProductScreen} options={{ headerShown: false, gestureEnabled: true }} />
        <Stack.Screen name="ChequeList" component={ChequeListScreen} options={{ headerShown: false, gestureEnabled: true }} />
        <Stack.Screen name="JournalEntry" component={JournalEntryScreen} options={{ headerShown: false, gestureEnabled: true }} />
        <Stack.Screen name="inventoryTransaction" component={InventoryTransactionsScreen} options={{ headerShown: false, gestureEnabled: true }} />
        <Stack.Screen name="receivePaymentList" component={PaymentsListScreen} options={{ headerShown: false, gestureEnabled: true }} />
        <Stack.Screen name="bankPayments" component={BankPaymentListScreen} options={{ headerShown: false, gestureEnabled: true }} />
        <Stack.Screen name="expensePayment" component={ExpensePaymentListScreen} options={{ headerShown: false, gestureEnabled: true }} />
         <Stack.Screen name="dailyCashReport" component={DailyCashReportScreen} options={{ headerShown: false, gestureEnabled: true }} />
      </Stack.Navigator>
    </NavigationContainer>
     </ContactSyncProvider>
  );
};

export default AppNavigator;