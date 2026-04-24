import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, TouchableOpacity, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { testCasesAPI } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../config';

const PRIORITY_COLOR = {
  High:   '#DC2626',
  Medium: '#D97706',
  Low:    '#16A34A',
};

export default function TestCaseDetailScreen() {
  const navigation = useNavigation();
  const route      = useRoute();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('TEST_CASES', 'EDIT');

  const [tc,      setTc]      = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await testCasesAPI.getOne(route.params.id);
        setTc(data.testCase);
      } catch {
        Alert.alert('Error', 'Could not load test case.');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    })();
  }, [route.params.id]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }
  if (!tc) return null;

  const priorityColor = PRIORITY_COLOR[tc.priority?.name] || COLORS.textMuted;
  const breadcrumb = [
    tc.scenario?.submodule?.module?.name,
    tc.scenario?.submodule?.name,
    tc.scenario?.name,
  ].filter(Boolean).join(' › ');

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>

      {/* Header card */}
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          {tc.tcId && <Text style={styles.tcId}>{tc.tcId}</Text>}
          {tc.priority && (
            <View style={[styles.priorityBadge, { backgroundColor: priorityColor + '20' }]}>
              <Text style={[styles.priorityText, { color: priorityColor }]}>{tc.priority.name}</Text>
            </View>
          )}
        </View>
        <Text style={styles.tcName}>{tc.name}</Text>
        {breadcrumb ? <Text style={styles.breadcrumb}>{breadcrumb}</Text> : null}

        {/* Types */}
        {tc.types?.length > 0 && (
          <View style={styles.tagRow}>
            {tc.types.map(t => (
              <View key={t.typeId} style={styles.typeTag}>
                <Text style={styles.typeTagText}>{t.type?.name}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Tags */}
        {tc.tags?.length > 0 && (
          <View style={styles.tagRow}>
            {tc.tags.map(t => (
              <View key={t.tag.id} style={[styles.colorTag, { backgroundColor: t.tag.color || COLORS.textMuted }]}>
                <Text style={styles.colorTagText}>{t.tag.name}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Pre-condition */}
      {tc.preCondition ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pre-condition</Text>
          <Text style={styles.sectionBody}>{tc.preCondition}</Text>
        </View>
      ) : null}

      {/* Steps */}
      {tc.steps?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Steps</Text>
          {tc.steps.map((step, i) => (
            <View key={i} style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <View style={styles.stepNumBadge}>
                  <Text style={styles.stepNum}>{i + 1}</Text>
                </View>
              </View>
              <View style={styles.stepBody}>
                <Text style={styles.stepLabel}>Action</Text>
                <Text style={styles.stepText}>{step.action}</Text>
                {step.expectedResult ? (
                  <>
                    <Text style={[styles.stepLabel, { marginTop: 8 }]}>Expected Result</Text>
                    <Text style={styles.stepText}>{step.expectedResult}</Text>
                  </>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Edit button */}
      {canEdit && (
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => navigation.navigate('TestCaseForm', { id: tc.id })}
        >
          <Ionicons name="pencil-outline" size={18} color="#fff" />
          <Text style={styles.editBtnText}>Edit Test Case</Text>
        </TouchableOpacity>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen:          { flex: 1, backgroundColor: COLORS.background },
  content:         { padding: 16, paddingBottom: 40 },
  center:          { flex: 1, justifyContent: 'center', alignItems: 'center' },

  headerCard:      { backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6 },
  headerRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  tcId:            { fontSize: 12, fontWeight: '700', color: COLORS.primary, backgroundColor: COLORS.primary + '15', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  priorityBadge:   { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  priorityText:    { fontSize: 12, fontWeight: '700' },
  tcName:          { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  breadcrumb:      { fontSize: 12, color: COLORS.textMuted, marginBottom: 10 },
  tagRow:          { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  typeTag:         { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE' },
  typeTagText:     { fontSize: 12, color: '#1D4ED8', fontWeight: '600' },
  colorTag:        { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  colorTagText:    { fontSize: 12, color: '#fff', fontWeight: '600' },

  section:         { backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, marginBottom: 12, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  sectionTitle:    { fontSize: 13, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  sectionBody:     { fontSize: 14, color: COLORS.text, lineHeight: 20 },

  stepCard:        { borderLeftWidth: 3, borderLeftColor: COLORS.primary, paddingLeft: 12, marginBottom: 14 },
  stepHeader:      { marginBottom: 6 },
  stepNumBadge:    { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  stepNum:         { color: '#fff', fontSize: 11, fontWeight: '700' },
  stepBody:        {},
  stepLabel:       { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 },
  stepText:        { fontSize: 14, color: COLORS.text, lineHeight: 20 },

  editBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 15, marginTop: 8, elevation: 3 },
  editBtnText:     { color: '#fff', fontWeight: '700', fontSize: 16 },
});
