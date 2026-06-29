// screens/TenantVerificationScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  StatusBar,
  Image,
  AppState,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
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

  useEffect(() => {
    let cancelled = false;
    const checkWithTimeout = async () => {
      try {
        const timeoutPromise = new Promise<boolean>(resolve =>
          setTimeout(() => resolve(false), 3000),
        );
        const granted = await Promise.race([
          checkContactsPermission(),
          timeoutPromise,
        ]);
        if (!cancelled) setPermissionGranted(granted);
      } catch {
        if (!cancelled) setPermissionGranted(false);
      }
    };
    checkWithTimeout();
    return () => { cancelled = true; };
  }, []);

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

  const handleRequestPermission = async () => {
    const granted = await requestContactsPermission();
    setPermissionGranted(granted);
    if (!granted) {
      setError('Contacts permission is required. Please allow access to continue.');
    } else {
      setError('');
    }
  };

  const handleVerifyTenant = async (): Promise<void> => {
    if (!permissionGranted && Platform.OS === 'android') {
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
        await saveDeviceContactsToLocalDB();
        navigation.replace('Login');
      } else {
        setError('Invalid response from server. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || err.response?.data?.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  return (
    // ✅ FIX 1: KeyboardAvoidingView at the root
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.backgroundLight} />

      {/* ✅ FIX 2: ScrollView wraps all content so nothing overlaps */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ✅ FIX 3: Top section — logo + header. marginTop reduced from 120 → safe flex spacing */}
        <View style={styles.topSection}>
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
        </View>

        {/* ✅ FIX 4: Form in its own section — no marginTop:'auto' dependency */}
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

          <Button
            title="Connect to Store"
            onPress={handleVerifyTenant}
            loading={verifying}
            variant="primary"
            size="medium"
          />
        </View>

        {/* ✅ FIX 5: Footer no longer uses marginTop:'auto' — replaced with paddingTop */}
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  // ✅ FIX 1: container is flex:1, no padding — let ScrollView handle it
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  // ✅ FIX 2: scrollContent uses flexGrow + justifyContent so it centers
  // on tall screens but scrolls naturally on short ones or when keyboard opens
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  // ✅ FIX 3: topSection groups logo + header with safe padding instead of fixed marginTop
  topSection: {
    paddingTop: spacing.xxl,   // replaces the rigid marginTop: 120
    alignItems: 'center',
    marginTop:90,
  },
  // ✅ FIX 3: iconContainer no longer has a fixed height — sizes to its content
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
    width: '100%',
  },
  logo: {
    width: '70%',
    height: 80,   // height on the image, not the container
  },
  headerContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.heading2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  // ✅ FIX 4: formContainer is a plain block — no auto margins
  formContainer: {
    marginTop: spacing.sm,
  },
  field: {
    gap: 8,
    marginBottom: 20,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  // ✅ FIX 5: footer uses paddingTop instead of marginTop:'auto'
  // marginTop:'auto' is valid in a plain View but breaks inside ScrollView's
  // contentContainer because the scroll content has no fixed height to push against
  footer: {
    paddingTop: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  secureContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    opacity: 0.4,
  },
  lockIcon: {
    fontSize: 10,
  },
  secureText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 1.5,
  },
  permissionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#856404',
  },
  permissionBody: {
    fontSize: 13,
    color: '#856404',
    textAlign: 'center',
  },
});

export default TenantVerificationScreen;