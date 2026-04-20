import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../config';

// Voice recognition is loaded lazily so the app works even if the
// native module isn't linked yet (Expo Go without dev client).
let Voice = null;
try {
  Voice = require('@react-native-voice/voice').default;
} catch {
  // Running in Expo Go without custom dev client — voice is disabled.
}

export default function VoiceInput({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  style,
}) {
  const [listening,   setListening]   = useState(false);
  const [voiceAvail,  setVoiceAvail]  = useState(!!Voice);
  const partialRef = useRef('');

  useEffect(() => {
    if (!Voice) return;

    // Check availability
    Voice.isAvailable().then(avail => setVoiceAvail(!!avail)).catch(() => setVoiceAvail(false));

    Voice.onSpeechStart   = ()  => { setListening(true); partialRef.current = ''; };
    Voice.onSpeechEnd     = ()  => setListening(false);
    Voice.onSpeechError   = ()  => setListening(false);
    Voice.onSpeechPartialResults = (e) => {
      partialRef.current = e.value?.[0] || '';
    };
    Voice.onSpeechResults = (e) => {
      const spoken = e.value?.[0] || '';
      if (spoken) {
        onChangeText(value ? `${value} ${spoken}` : spoken);
      }
      setListening(false);
    };

    return () => {
      Voice.destroy().catch(() => {});
    };
  }, [value]);

  async function toggleListening() {
    if (!Voice) return;
    if (listening) {
      await Voice.stop().catch(() => {});
      setListening(false);
    } else {
      try {
        await Voice.start('en-US');
      } catch {
        setListening(false);
      }
    }
  }

  return (
    <View style={[styles.wrap, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.row, multiline && styles.rowMulti]}>
        <TextInput
          style={[styles.input, multiline && styles.inputMulti]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
          textAlignVertical={multiline ? 'top' : 'center'}
        />
        {voiceAvail && (
          <TouchableOpacity
            style={[styles.micBtn, listening && styles.micBtnActive]}
            onPress={toggleListening}
            activeOpacity={0.7}
          >
            {listening
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="mic" size={18} color={listening ? '#fff' : COLORS.primary} />
            }
          </TouchableOpacity>
        )}
      </View>
      {listening && (
        <Text style={styles.listeningHint}>Listening… speak now</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:          { marginBottom: 16 },
  label:         { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  row:           { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12, minHeight: 48 },
  rowMulti:      { alignItems: 'flex-start', paddingVertical: 10 },
  input:         { flex: 1, fontSize: 15, color: COLORS.text, paddingVertical: 0 },
  inputMulti:    { minHeight: 72, paddingTop: 2 },
  micBtn:        { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.primary + '15', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  micBtnActive:  { backgroundColor: COLORS.accent },
  listeningHint: { fontSize: 11, color: COLORS.accent, marginTop: 4, fontStyle: 'italic' },
});
