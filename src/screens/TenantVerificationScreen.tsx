// screens/TenantVerificationScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Alert, StatusBar, Image, AppState,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { verifyTenant } from '../services/tenantService';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { Button } from '../components/ui/Button';
import InputField from '../components/ui/InputField';
import { IconButton } from '../components/ui/IconButton';
import { colors, spacing, typography } from '../theme';
import {
  checkContactsPermission,
  requestContactsPermission,
  saveDeviceContactsToLocalDB,
} from '../services/contactSyncService';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'TenantVerification'>;
};

const TenantVerificationScreen: React.FC<Props> = ({ navigation }) => {
  const [tenantKey, setTenantKey]                 = useState('');
  const [verifying, setVerifying]                 = useState(false);
  const [error, setError]                         = useState('');
  const [permissionGranted, setPermissionGranted] = useState(false);

  const appState = useRef(AppState.currentState);

  // ── 1. Check permission on mount with a safe timeout ──────────────────────
  // On fresh install, checkContactsPermission() can hang indefinitely.
  // We race it against a 3s timeout so the UI always becomes interactive.
  useEffect(() => {
    let cancelled = false;

    const checkWithTimeout = async () => {
      try {
        const timeoutPromise = new Promise<boolean>(resolve =>
          setTimeout(() => resolve(false), 3000), // fallback after 3s
        );
        const granted = await Promise.race([
          checkContactsPermission(),
          timeoutPromise,
        ]);
        if (!cancelled) {
          setPermissionGranted(granted);
        }
      } catch {
        if (!cancelled) {
          setPermissionGranted(false);
        }
      }
    };

    checkWithTimeout();
    return () => { cancelled = true; };
  }, []);

  // ── 2. Re-check permission when app comes back to foreground ──────────────
  // Handles the case where user grants permission via Settings and returns.
  // Also resolves the "endless loading after granting permission" issue —
  // after the system prompt closes, the app returns to active state and
  // we re-check, updating permissionGranted correctly.
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (nextState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextState === 'active'
      ) {
        const granted = await checkContactsPermission();
        setPermissionGranted(granted);
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, []);

  // ── 3. Request permission — just opens the prompt, zero loading state ──────
  const handleRequestPermission = async () => {
    const granted = await requestContactsPermission();
    setPermissionGranted(granted);
    if (!granted) {
      setError('Contacts permission is required. Please allow access to continue.');
    } else {
      setError('');
    }
  };

  // ── 4. Verify tenant ───────────────────────────────────────────────────────
  const handleVerifyTenant = async (): Promise<void> => {
    // Permission missing → show prompt, return. No loading.
    if (!permissionGranted) {
      await handleRequestPermission();
      return;
    }

    if (!tenantKey.trim()) {
      setError('Please enter a tenant key');
      return;
    }

    setError('');
    setVerifying(true);

    try {
      const response = await verifyTenant(tenantKey);

      if (response.success && response.tenant) {
        await AsyncStorage.setItem('tenant', JSON.stringify(response.tenant));
        await AsyncStorage.setItem('tenantKey', response.tenant.id);
        await saveDeviceContactsToLocalDB(); // background-safe, non-blocking UX
        navigation.replace('Login');
      } else {
        setError('Invalid response from server. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || err.response?.data?.message || 'Verification failed');
    } finally {
      setVerifying(false); // always clears spinner — no more endless loading
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.backgroundLight} />

      <View style={styles.iconContainer}>
        <Image
          source={require('../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <View style={styles.headerContainer}>
        <Text style={styles.title}>Enter your Application Key to continue</Text>
        <Text style={styles.subtitle}>
          This key identifies your specific organization or store and securely
          connects you to your store.
        </Text>
      </View>

      {/* Permission banner — only when checked AND not granted */}
     

      <View style={styles.formContainer}>
        <View style={styles.field}>
          <InputField
            bg="white"
            textAlign="left"
            label="App Key"
            type="email"
            value={tenantKey}
            onChangeText={(text: React.SetStateAction<string>) => {
              setTenantKey(text);
              setError('');
            }}
            placeholder="e.g., ORG-12345"
            icon="key"
          />
        </View>

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        {/*
          Button is disabled (not loading) while initial permission check runs.
          Once permissionChecked = true, it becomes fully interactive.
          loading is ONLY true during the verifyTenant API call.
        */}
        <Button
          title='Connect to Store'
          onPress={handleVerifyTenant}
          loading={verifying}
          variant="primary"
          size="medium"
        />
      </View>

      <View style={styles.footer}>
        <IconButton
          icon="❓"
          label="Where do I find my tenant key?"
          variant="muted"
          onPress={() =>
            Alert.alert(
              'Finding Your Tenant Key',
              'Contact your administrator or check your welcome email for your tenant key.',
            )
          }
        />
        <View style={styles.secureContainer}>
          <Text style={styles.lockIcon}>🔒</Text>
          <Text style={styles.secureText}>SECURE CONNECTION</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  field:            { gap: 8, marginBottom: 20 },
  container:        { flex: 1, backgroundColor: colors.white, paddingHorizontal: spacing.lg },
  iconContainer:    { alignItems: 'center', marginTop: 120, height: 100 },
  logo:             { width: '70%', height: '70%' },
  headerContainer:  { alignItems: 'center', paddingHorizontal: spacing.md, marginBottom: spacing.xl },
  title:            { ...typography.heading2, color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.sm },
  subtitle:         { ...typography.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 24 },
  formContainer:    { marginTop: spacing.sm },
  errorText:        { color: colors.danger, fontSize: 13, marginBottom: 12, textAlign: 'center' },
  permissionTitle:  { fontSize: 14, fontWeight: '600', color: '#856404' },
  permissionBody:   { fontSize: 13, color: '#856404', textAlign: 'center' },
  footer:           { marginTop: 'auto', marginBottom: spacing.xxl, alignItems: 'center', gap: spacing.md },
  secureContainer:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, opacity: 0.4 },
  lockIcon:         { fontSize: 10 },
  secureText:       { fontSize: 10, fontWeight: '700', color: colors.textPrimary, letterSpacing: 1.5 },
});

export default TenantVerificationScreen;