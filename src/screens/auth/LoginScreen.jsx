import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../../context/AuthContext';
import { COLORS, API_BASE_URL } from '../../config';

// Required: completes any pending auth session when the app resumes
WebBrowser.maybeCompleteAuthSession();

const APP_BASE_URL  = API_BASE_URL.replace(/\/api$/, '');
const SSO_START_URL = `${APP_BASE_URL}/api/auth/google?mobile=true`;
const MOBILE_SCHEME = 'aerotestmanager';

export default function LoginScreen() {
  const { login, loginWithToken } = useAuth();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [ssoLoading, setSsoLoading] = useState(false);

  // ── Listen for deep link redirect after Google SSO ─────────────────────────
  useEffect(() => {
    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => subscription.remove();
  }, []);

  function handleDeepLink({ url }) {
    if (!url.startsWith(`${MOBILE_SCHEME}://sso-callback`)) return;
    try {
      const parsed      = Linking.parse(url);
      const token       = parsed.queryParams?.token;
      const name        = parsed.queryParams?.name  || '';
      const userEmail   = parsed.queryParams?.email || '';
      const permsRaw    = parsed.queryParams?.perms || '[]';
      const permissions = JSON.parse(decodeURIComponent(permsRaw));

      if (!token) throw new Error('No token');
      setSsoLoading(false);
      loginWithToken(token, { name, email: userEmail }, permissions);
    } catch {
      setSsoLoading(false);
      Alert.alert('SSO Failed', 'Could not complete sign-in. Please try again.');
    }
  }

  // ── Open Google SSO in an in-app Chrome Custom Tab ───────────────────────
  // openAuthSessionAsync automatically closes the tab and returns the redirect
  // URL when Chrome sees the aerotestmanager:// scheme — no deep link listener
  // needed for the happy path.
  async function handleSSO() {
    setSsoLoading(true);
    try {
      const redirectUrl = Linking.createURL('sso-callback');
      const result = await WebBrowser.openAuthSessionAsync(SSO_START_URL, redirectUrl);

      if (result.type === 'success') {
        // Browser returned control with the deep-link URL — handle it directly
        handleDeepLink({ url: result.url });
      } else {
        // User cancelled or browser was dismissed
        setSsoLoading(false);
      }
    } catch {
      setSsoLoading(false);
      Alert.alert('Error', 'Could not open Google Sign-In.');
    }
  }

  // ── Email / Password login ─────────────────────────────────────────────────
  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Required', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Check your credentials.';
      Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Ionicons name="shield-checkmark" size={48} color="#fff" />
          </View>
          <Text style={styles.appName}>Aero Test Manager</Text>
          <Text style={styles.tagline}>QA Team Companion</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign In</Text>

          {/* Google SSO Button */}
          <TouchableOpacity style={styles.ssoBtn} onPress={handleSSO} disabled={ssoLoading}>
            {ssoLoading
              ? <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 12 }} />
              : <View style={styles.googleIcon}><Text style={styles.googleIconText}>G</Text></View>
            }
            <Text style={styles.ssoBtnText}>
              {ssoLoading ? 'Opening Google Sign-In…' : 'Continue with Google (SSO)'}
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or sign in with email</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email */}
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputRow}>
              <Ionicons name="mail-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="you@aerosimple.in"
                placeholderTextColor={COLORS.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPwd}
              />
              <TouchableOpacity onPress={() => setShowPwd(v => !v)} style={styles.eyeBtn}>
                <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Email Login Button */}
          <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.loginBtnText}>Sign In</Text>
            }
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>Aero Test Manager v1.0</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:              { flex: 1, backgroundColor: COLORS.primary },
  container:         { flexGrow: 1, justifyContent: 'center', padding: 24 },

  header:            { alignItems: 'center', marginBottom: 32 },
  logoBox:           { width: 88, height: 88, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  appName:           { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  tagline:           { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 },

  card:              { backgroundColor: COLORS.surface, borderRadius: 20, padding: 28, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
  cardTitle:         { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 20 },

  ssoBtn:            { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10, paddingVertical: 13, paddingHorizontal: 16, marginBottom: 20, backgroundColor: COLORS.surface },
  googleIcon:        { width: 24, height: 24, borderRadius: 12, backgroundColor: '#4285F4', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  googleIconText:    { color: '#fff', fontWeight: '800', fontSize: 13 },
  ssoBtnText:        { fontSize: 15, fontWeight: '600', color: COLORS.text },

  divider:           { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  dividerLine:       { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText:       { marginHorizontal: 10, fontSize: 12, color: COLORS.textMuted },

  fieldWrap:         { marginBottom: 20 },
  label:             { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  inputRow:          { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10, backgroundColor: COLORS.background, paddingHorizontal: 12, height: 48 },
  inputIcon:         { marginRight: 8 },
  input:             { flex: 1, fontSize: 15, color: COLORS.text },
  eyeBtn:            { padding: 4 },

  loginBtn:          { backgroundColor: COLORS.primary, borderRadius: 10, height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 8, elevation: 3 },
  loginBtnText:      { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },

  footer:            { textAlign: 'center', color: 'rgba(255,255,255,0.5)', marginTop: 32, fontSize: 12 },
});
