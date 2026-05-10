import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Keyboard,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { colors } from '../theme';
import { getLastContactsSyncTime, getLastProductsSyncTime, setLastContactsSyncTime, setLastProductsSyncTime } from '../services/storage';
import { fetchAllContacts } from '../services/contactService';
import { fetchAllProducts } from '../services/ProductService';

type Props = {
  route: {
    params: {
      email?: string;
      maskedEmail?: string;
      expire?: string;
    };
  };
};

const OTPVerificationScreen: React.FC<Props> = ({ route }) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState<boolean>(false);
  const [remainingTime, setRemainingTime] = useState<number>(-1); // Use -1 to indicate not initialized
  const [canResend, setCanResend] = useState<boolean>(false);
  const [isCodeExpired, setIsCodeExpired] = useState<boolean>(false);

  const inputRefs = useRef<Array<TextInput | null>>([]);
  const timerInitialized = useRef(false);
  const email = route.params?.email || '';
  const maskedEmail = route.params?.maskedEmail || 'm***e@company.com';
  const expireTime = route.params?.expire;

  // Handle back button press
  const handleBackPress = useCallback(() => {

    // Check if we can go back in the navigation stack
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // Navigate to a fallback screen instead of going back
      navigation.replace('Login');
    }
  }, [navigation]);

  // Calculate remaining time from expire timestamp
  const calculateRemainingTime = useCallback(() => {
    if (!expireTime) return 30; // Default 30 seconds if no expire time

    try {
      const now = new Date();
      const expireDate = new Date(expireTime);

      // Validate date
      if (isNaN(expireDate.getTime())) {
        return 30; // Default 30 seconds
      }

      const diffInSeconds = Math.floor((expireDate.getTime() - now.getTime()) / 1000);

      // Ensure we don't return negative values
      return Math.max(0, diffInSeconds);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      return 30; // Default 30 seconds on error
    }
  }, [expireTime]);

  // Initialize timer once on mount
  useEffect(() => {
    if (timerInitialized.current) return;
    const initialTime = calculateRemainingTime();
    setRemainingTime(initialTime);
    setIsCodeExpired(initialTime <= 0);
    setCanResend(initialTime <= 0);
    timerInitialized.current = true;

    // Focus first input on mount
    const timer = setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 300);

    return () => clearTimeout(timer);
  }, [email, maskedEmail, expireTime, calculateRemainingTime]);

  // Timer effect - countdown
  useEffect(() => {

    if (remainingTime === -1 || !timerInitialized.current) {
      return;
    }

    if (remainingTime <= 0) {
      setIsCodeExpired(true);
      setCanResend(true);
      return;
    }

    const timer = setTimeout(() => {
      setRemainingTime(prev => {
        const newTime = prev - 1;
        return newTime;
      });
    }, 1000);

    return () => {
      clearTimeout(timer);
    };
  }, [remainingTime]);

  const handleOtpChange = (value: string, index: number) => {
    // Only allow numbers
    if (value && !/^\d+$/.test(value)) {
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all digits entered
    if (value && index === 5 && newOtp.every(digit => digit !== '')) {
      Keyboard.dismiss();
      // Small delay before verifying
      setTimeout(() => handleVerify(newOtp.join('')), 100);
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Handle backspace
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (code?: string) => {
    const otpCode = code || otp.join('');

    if (otpCode.length !== 6) {
      Alert.alert('Error', 'Please enter all 6 digits');
      return;
    }

    if (isCodeExpired) {
      Alert.alert('Code Expired', 'The verification code has expired. Please request a new one.');
      return;
    }
    setLoading(true);
    try {
      const response = await api.post('/verify-otp', {
        email: email,
        otp: otpCode,
      });
      if (response.data.success) {
        // Save token if provided
        if (response.data.token) {
          await AsyncStorage.setItem('authToken', response.data.token);

        }

        // Save user data if available
        if (response.data.user) {
          await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
          await AsyncStorage.setItem('selectedBranch', JSON.stringify(response.data.user.branches[0]));
          await AsyncStorage.setItem('currencies', JSON.stringify(response.data.currencies));
          await AsyncStorage.setItem('processes', JSON.stringify(response.data.processes));
          await AsyncStorage.setItem('permissions', JSON.stringify(response.data.permissions));
          const lastContactsSyncTime = getLastContactsSyncTime();
          const lastProductsSyncTime = getLastProductsSyncTime();
          const now = new Date().toISOString();

          const results = await Promise.allSettled([
            fetchAllContacts({ limit: 30, since: lastContactsSyncTime || undefined }),
            fetchAllProducts({ limit: 30, since: lastProductsSyncTime || undefined }),
          ]);

          // Update sync times only if fetch was successful
          if (results[0].status === 'fulfilled') {
            setLastContactsSyncTime(now);
          }
          if (results[1].status === 'fulfilled') {
            setLastProductsSyncTime(now);
          }
        }

        // Clear temporary user data
        await AsyncStorage.removeItem('tempUser');
        navigation.replace('Home');
      } else {
        Alert.alert('Error', response.data.message || 'Verification failed');
        setOtp(['', '', '', '', '', '']);
        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 100);
      }

    } catch (error: any) {

      let errorMessage = 'Verification failed. Please try again.';

      if (error.response) {

        if (error.response.status === 401 || error.response.status === 400) {
          errorMessage = error.response.data?.message || 'Invalid verification code';
        } else if (error.response.status === 410) {
          errorMessage = 'Verification code has expired';
          setIsCodeExpired(true);
          setCanResend(true);
          setRemainingTime(0);
        } else if (error.response.status === 429) {
          errorMessage = 'Too many attempts. Please try again later.';
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.request) {
        errorMessage = 'Network error. Please check your connection.';
      }

      Alert.alert('Verification Failed', errorMessage);

      setOtp(['', '', '', '', '', '']);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);

    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!canResend || loading) return;

    setLoading(true);

    try {
      const response = await api.post('/resend-otp', {
        email: email,
      });

      if (response.data.success) {
        Alert.alert('Success', 'Verification code has been resent to your email');

        // Reset timer with new expire time from response
        const newExpireTime = response.data.data?.expire || response.data.expire;

        if (newExpireTime) {
          const expireDate = new Date(newExpireTime);
          const now = new Date();
          const diffInSeconds = Math.max(0, Math.floor((expireDate.getTime() - now.getTime()) / 1000));
          setRemainingTime(diffInSeconds);
          setIsCodeExpired(diffInSeconds <= 0);
          setCanResend(diffInSeconds <= 0);
        } else {
          setRemainingTime(30);
          setIsCodeExpired(false);
          setCanResend(false);
        }

        // Clear current OTP
        setOtp(['', '', '', '', '', '']);
        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 100);
      } else {
        Alert.alert('Error', response.data.message || 'Failed to resend code');
      }

    } catch (error: any) {

      let errorMessage = 'Failed to resend code. Please try again.';

      if (error.response) {

        if (error.response.status === 429) {
          errorMessage = 'Too many requests. Please wait before trying again.';
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        }
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return '00:00';

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Check if all OTP digits are entered
  const isOtpComplete = otp.every(digit => digit !== '');

  // Check if verify button should be enabled
  const isVerifyEnabled = isOtpComplete && !loading && remainingTime > 0 && timerInitialized.current;

  // Show loading for timer initialization
  if (remainingTime === -1) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Initializing verification...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackPress}
          activeOpacity={0.7}
          disabled={loading}
        >
          <Text style={[styles.backIcon, loading && styles.disabledText]}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Icon and Title Section */}
        <View style={styles.titleSection}>
          <View style={styles.iconContainer}>
            <Text style={styles.shieldIcon}>🛡️</Text>
          </View>

          <Text style={styles.title}>Enter Verification Code</Text>

          <Text style={styles.subtitle}>
            We have sent a 6-digit code to your email{'\n'}
            <Text style={styles.emailText}>{maskedEmail}</Text>
          </Text>

          {/* Expiry time indicator */}
          {expireTime && (
            <View style={styles.expiryContainer}>
              <Text style={[styles.expiryText, isCodeExpired && styles.expiredText]}>
                {isCodeExpired ? 'Code expired' : 'Code expires in:'}
                {!isCodeExpired && (
                  <Text style={styles.expiryTime}> {formatTime(remainingTime)}</Text>
                )}
              </Text>
            </View>
          )}
        </View>

        {/* OTP Input Fields */}
        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={[
                styles.otpInput,
                digit && styles.otpInputFilled,
                isCodeExpired && styles.otpInputDisabled
              ]}
              value={digit}
              onChangeText={(value) => handleOtpChange(value, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              editable={!loading && !isCodeExpired}
              placeholder="-"
              placeholderTextColor={colors.gray400}
              accessible={true}
              accessibilityLabel={`OTP digit ${index + 1}`}
              accessibilityHint={`Enter digit ${index + 1} of your verification code`}
            />
          ))}
        </View>

        {/* Verify Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.verifyButton,
              !isVerifyEnabled && styles.buttonDisabled
            ]}
            onPress={() => handleVerify()}
            disabled={!isVerifyEnabled}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color={colors.darkMuted} size="small" />
            ) : isCodeExpired ? (
              <Text style={styles.verifyButtonText}>Code Expired</Text>
            ) : !isOtpComplete ? (
              <Text style={styles.verifyButtonText}>Enter 6-digit Code</Text>
            ) : (
              <Text style={styles.verifyButtonText}>Verify</Text>
            )}
          </TouchableOpacity>

          {/* Resend Section */}
          <View style={styles.resendSection}>
            <Text style={styles.resendLabel}>Didn't receive the code?</Text>

            <View style={styles.resendRow}>
              <TouchableOpacity
                onPress={handleResendCode}
                disabled={!canResend || loading}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.resendLink,
                  (!canResend || loading) && styles.resendLinkDisabled
                ]}>
                  Resend Code
                </Text>
              </TouchableOpacity>

              {!canResend && remainingTime > 0 && (
                <>
                  <Text style={styles.dot}>•</Text>
                  <Text style={styles.timerText}>{formatTime(remainingTime)}</Text>
                </>
              )}
            </View>

            {isCodeExpired && (
              <Text style={styles.expiredWarning}>
                The verification code has expired. Please request a new one.
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray300,
    marginTop: 30,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: colors.darkMuted,
    fontWeight: 'bold',
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  shieldIcon: {
    fontSize: 48,
  },
  title: {

    fontSize: 23,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '700',
    marginBottom: 10,


  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  emailText: {
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  expiryContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  expiryText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  expiryTime: {
    fontWeight: 'bold',
    color: colors.primary,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
    gap: 8,
  },
  otpInput: {
    flex: 1,
    height: 56,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.white,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  otpInputFilled: {
    borderColor: colors.primaryBorder,
    borderWidth: 2,
    backgroundColor: colors.background,
  },
  otpInputDisabled: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    color: colors.textMuted,
  },
  buttonContainer: {
    gap: 24,
  },
  verifyButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
    backgroundColor: colors.darkMuted,
  },
  verifyButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.gray900,
  },
  resendSection: {
    alignItems: 'center',
    gap: 8,
  },
  resendLabel: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resendLink: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
  },
  resendLinkDisabled: {
    opacity: 0.5,
    color: colors.textMuted,
  },
  dot: {
    fontSize: 14,
    color: '#D1D5DB',
  },
  timerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111813',
    fontVariant: ['tabular-nums'],
  },
  expiredWarning: {
    fontSize: 12,
    color: colors.danger,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
    paddingHorizontal: 20,
  },
  expiredText: {
    color: colors.danger,
    fontWeight: 'bold',
  },
  disabledText: {
    opacity: 0.5,
  },
});

export default OTPVerificationScreen;