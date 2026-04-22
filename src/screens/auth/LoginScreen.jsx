import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, ScrollView,
  Modal, SafeAreaView,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { COLORS, API_BASE_URL } from '../../config';

const APP_BASE_URL  = API_BASE_URL.replace(/\/api$/, '');
const SSO_START_URL = `${APP_BASE_URL}/api/auth/google?mobile=true`;
// The URL the backend redirects to after successful Google OAuth
const CALLBACK_PREFIX = 'aerotestmanager://sso-callback';

export default function LoginScreen() {
  const { login, loginWithToken } = useAuth();

  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [showPwd,    setShowPwd]    = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [ssoVisible, setSsoVisible] = useState(false);

  // ── Handle the deep-link URL returned by the backend ──────────────────────
  function handleSsoUrl(url) {
    if (!url.startsWith(CALLBACK_PREFIX)) return false;
    try {
      const urlObj      = new URL(url);
      const token       = urlObj.searchParams.get('token');
      const name        = urlObj.searchParams.get('name')  || '';
      const userEmail   = urlObj.searchParams.get('email') || '';
      const permsRaw    = urlObj.searchParams.get('perms') || '[]';
      const permissions = JSON.parse(decodeURIComponent(permsRaw));

      if (!token) throw new Error('No token in redirect URL');

      setSsoVisible(false);
      loginWithToken(token, { name, email: userEmail }, permissions);
      return true;
    } catch (e) {
      setSsoVisible(false);
      Alert.alert('SSO Failed', 'Could not complete sign-in. Please try again.');
      return true;
    }
  }

  // ── WebView navigation state change handler ────────────────────────────────
  function onNavigationStateChange(navState) {
    // The WebView fires this for every URL change — catch the callback redirect
    handleSsoUrl(navState.url);
  }

  // ── WebView URL change (catches redirects before they render) ──────────────
  function onShouldStartLoadWithRequest(request) {
    if (request.url.startsWith(CALLBACK_PREFIX)) {
      handleSsoUrl(request.url);
      return false; // stop the WebView from navigating to the custom scheme
    }
    return true;
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
    <>
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
            <TouchableOpacity
              style={styles.ssoBtn}
              onPress={() => setSsoVisible(true)}
              activeOpacity={0.75}
            >
              <View style={styles.googleIcon}>
                <Text style={styles.googleIconText}>G</Text>
              </View>
              <Text style={styles.ssoBtnText}>Continue with Google (SSO)</Text>
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

            {/* Sign In Button */}
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

      {/* ── Google SSO WebView Modal ─────────────────────────────────────────── */}
      <Modal
        visible={ssoVisible}
        animationType="slide"
        onRequestClose={() => setSsoVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Modal header with close button */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sign in with Google</Text>
            <TouchableOpacity onPress={() => setSsoVisible(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#1C2B33" />
            </TouchableOpacity>
          </View>

          {/* WebView — loads Google OAuth, intercepts the callback redirect */}
          <WebView
            source={{ uri: SSO_START_URL }}
            style={styles.webView}
            onNavigationStateChange={onNavigationStateChange}
            onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.webViewLoader}>
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            )}
            // Allow Google's third-party cookies required for OAuth
            thirdPartyCookiesEnabled
            sharedCookiesEnabled
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  flex:            { flex: 1, backgroundColor: COLORS.primary },
  container:       { flexGrow: 1, justifyContent: 'center', padding: 24 },

  header:          { alignItems: 'center', marginBottom: 32 },
  logoBox:         { width: 88, height: 88, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  appName:         { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  tagline:         { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 },

  card:            { backgroundColor: COLORS.surface, borderRadius: 20, padding: 28, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
  cardTitle:       { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 20 },

  ssoBtn:          { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10, paddingVertical: 13, paddingHorizontal: 16, marginBottom: 20, backgroundColor: COLORS.surface },
  googleIcon:      { width: 24, height: 24, borderRadius: 12, backgroundColor: '#4285F4', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  googleIconText:  { color: '#fff', fontWeight: '800', fontSize: 13 },
  ssoBtnText:      { fontSize: 15, fontWeight: '600', color: COLORS.text },

  divider:         { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  dividerLine:     { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText:     { marginHorizontal: 10, fontSize: 12, color: COLORS.textMuted },

  fieldWrap:       { marginBottom: 20 },
  label:           { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  inputRow:        { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10, backgroundColor: COLORS.background, paddingHorizontal: 12, height: 48 },
  inputIcon:       { marginRight: 8 },
  input:           { flex: 1, fontSize: 15, color: COLORS.text },
  eyeBtn:          { padding: 4 },

  loginBtn:        { backgroundColor: COLORS.primary, borderRadius: 10, height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 8, elevation: 3 },
  loginBtnText:    { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },

  footer:          { textAlign: 'center', color: 'rgba(255,255,255,0.5)', marginTop: 32, fontSize: 12 },

  // Modal styles
  modalContainer:  { flex: 1, backgroundColor: '#fff' },
  modalHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#DEE3E9', backgroundColor: '#fff' },
  modalTitle:      { fontSize: 16, fontWeight: '600', color: '#1C2B33' },
  closeBtn:        { padding: 4 },
  webView:         { flex: 1 },
  webViewLoader:   { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
});
