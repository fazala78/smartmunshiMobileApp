import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import InputField from '../components/ui/InputField';
import { Button } from '../components/ui';
import { colors } from '../theme';


type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [tenantName, setTenantName] = useState<string>('');
  //  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadTenantInfo();
  }, []);

  const loadTenantInfo = async () => {
    try {
      const tenantData = await AsyncStorage.getItem('tenant');
      if (tenantData) {
        const tenant = JSON.parse(tenantData);
        setTenantName(tenant.name || tenant.id);
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
    }
  };

  const handleChangeTenant = async () => {
    Alert.alert(
      'Change Tenant',
      'Are you sure you want to change tenant? You will need to enter a new tenant key.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Change Tenant',
          style: 'destructive',
          onPress: async () => {
            try {

              // Clear tenant data
              await AsyncStorage.removeItem('tenant');
              await AsyncStorage.removeItem('tenantKey');


              // Navigate back to tenant verification
              navigation.replace('TenantVerification');
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (error) {
              Alert.alert('Error', 'Failed to change tenant');
            }
          }
        }
      ]
    );
  };

  const handleLogin = async (): Promise<void> => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }


    setLoading(true);
    try {
      const response = await api.post('/login', {
        email: email.trim(),
        password: password,
      });

      if (response.data.success) {
        // Create masked email (e.g., "u***r@example.com")
        const maskEmail = (email: string) => {
          const [local, domain] = email.split('@');
          const maskedLocal = local[0] + '***' + local[local.length - 1];
          return `${maskedLocal}@${domain}`;
        };
        // Navigate to OTP screen with email params
        navigation.replace('OTPVerification', {
          email: email.trim(),
          maskedEmail: maskEmail(email.trim()),
          expire: response.data.expire,
        });
      } else {
        Alert.alert('Error', 'Invalid response from server');
      }

    } catch (error: any) {

      let errorMessage = 'Login failed. Please try again.';

      if (error.response) {

        if (error.response.status === 401) {
          errorMessage = error.response.data?.message || 'Invalid email or password';
        } else if (error.response.status === 403) {
          errorMessage = error.response.data?.message || 'Your account has been deactivated';
        } else if (error.response.status === 422) {
          const errors = error.response.data?.errors;
          if (errors) {
            errorMessage = Object.values(errors).flat().join('\n');
          } else {
            errorMessage = error.response.data?.message || 'Validation failed';
          }
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.request) {

        errorMessage = 'Network error. Please check your connection.';
      } else {

        errorMessage = error.message || 'An unexpected error occurred';
      }


      Alert.alert('Login Failed', errorMessage);
    } finally {
      setLoading(false);

    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.titleSection}>
          <Image
            source={require('../assets/logo.png')} // Ensure path is correct
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        {tenantName ? (
          <Text style={styles.title}>
            Welcome to {tenantName}
          </Text>
        ) : null}
        <Text style={styles.subtitle}>
          Access your terminal to start processing transactions.
        </Text>
        <View style={styles.field}>
          <InputField
            bg="white"
            textAlign="left"
            label="Email Address"
            type="email"
            value={email}
            onChangeText={(text: React.SetStateAction<string>) => {
              setEmail(text);
              //   setError(''); // Clear error on input
            }}
            placeholder="email@abc.com"
            icon="email"
          /></View>

        <View style={styles.field}>
          <InputField
            bg="white"
            textAlign="left"
            label="Enter Password"
            type="password"
            value={password}
            onChangeText={(text: React.SetStateAction<string>) => {
              setPassword(text);
              //  setError(''); // Clear error on input
            }}
            placeholder="Password"
            icon="password"
          />
        </View>
        <Button
          title="Login"
          onPress={handleLogin}
          loading={loading}
          variant="primary"
          size="medium"
        />


        {/* Change Tenant Button */}
        <TouchableOpacity
          style={styles.biometricButton}
          onPress={handleChangeTenant}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Text style={styles.biometricIcon}>👤</Text>
          <Text style={styles.biometricText}>Change Account</Text>
        </TouchableOpacity>


        {/* Optional: Add forgot password link */}
        <TouchableOpacity
          onPress={() => {
            Alert.alert('Forgot Password', 'Please contact your administrator to reset your password.');
          }}
          disabled={loading}
        >
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Forgot Password?</Text>
            <View style={styles.dividerLine} />
          </View>
        </TouchableOpacity>






      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  field: {
    gap: 8,
    marginBottom: 20,
  },
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },


  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },

  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    marginTop: 20,
  },
  biometricIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  biometricText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },

  titleSection: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 12,
    height: 80,

  },

  logo: {
    width: '70%',
    height: '100%',
    marginBottom: 10,
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
    marginBottom: 10,

  },

  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.textSecondary,
    marginHorizontal: 16,
    letterSpacing: 1.5,
  },
});

export default LoginScreen; 