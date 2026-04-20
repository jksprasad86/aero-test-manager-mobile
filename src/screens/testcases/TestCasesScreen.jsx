import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { testCasesAPI } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../config';

// Hierarchy levels
const LEVELS = { MODULE: 'MODULE', SUBMODULE: 'SUBMODULE', SCENARIO: 'SCENARIO', TESTCASE: 'TESTCASE' };

export default function TestCasesScreen() {
  const navigation = useNavigation();
  const { hasPermission } = useAuth();
  const canAdd  = hasPermission('TEST_CASES', 'ADD');
  const canEdit = hasPermission('TEST_CASES', 'EDIT');

  const [allModules,  setAllModules]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [error,       setError]       = useState(null);

  // Breadcrumb trail: [{ level, item }]
  const [trail,       setTrail]       = useState([]);
  // Current list items to show
  const [items,       setItems]       = useState([]);

  const loadModules = useCallback(async () => {
    try {
      setError(null);
      const { data } = await testCasesAPI.getModules();
      setAllModules(data);
      setItems(data);
      setTrail([]);
    } catch {
      setError('Failed to load test cases.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadModules(); }, [loadModules]);

  const onRefresh = () => { setRefreshing(true); loadModules(); };

  // Navigate deeper in hierarchy
  function drillDown(item, level) {
    let nextItems = [];
    let nextLevel = '';

    if (level === LEVELS.MODULE) {
      nextItems = item.submodules || [];
      nextLevel = LEVELS.SUBMODULE;
    } else if (level === LEVELS.SUBMODULE) {
      nextItems = item.scenarios || [];
      nextLevel = LEVELS.SCENARIO;
    } else if (level === LEVELS.SCENARIO) {
      nextItems = item.testCases || [];
      nextLevel = LEVELS.TESTCASE;
    }

    setTrail(t => [...t, { level, item, prevItems: items }]);
    setItems(nextItems);
  }

  // Go back one level
  function goBack() {
    if (trail.length === 0) return;
    const prev = trail[trail.length - 1];
    setItems(prev.prevItems);
    setTrail(t => t.slice(0, -1));
  }

  // Determine current level
  function currentLevel() {
    if (trail.length === 0) return LEVELS.MODULE;
    return [LEVELS.SUBMODULE, LEVELS.SCENARIO, LEVELS.TESTCASE, 'DONE'][trail.length] || LEVELS.TESTCASE;
  }

  const level = currentLevel();

  function handleAdd() {
    // Pass current context so the form can pre-select hierarchy
    const ctx = {};
    if (trail.length >= 1) ctx.moduleId    = trail[0].item.id;
    if (trail.length >= 2) ctx.submoduleId = trail[1].item.id;
    if (trail.length >= 3) ctx.scenarioId  = trail[2].item.id;
    navigation.navigate('TestCaseForm', ctx);
  }

  // ── Render item ──────────────────────────────────────────────────────────────
  function renderItem({ item }) {
    if (level === LEVELS.TESTCASE) {
      return (
        <View style={styles.tcCard}>
          <View style={styles.tcCardHeader}>
            {item.tcId && <Text style={styles.tcId}>{item.tcId}</Text>}
            {item.priority && (
              <View style={[styles.priorityBadge, { backgroundColor: PRIORITY_COLOR[item.priority.name] + '20' }]}>
                <Text style={[styles.priorityText, { color: PRIORITY_COLOR[item.priority.name] }]}>
                  {item.priority.name}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.tcName}>{item.name}</Text>
          {item.preCondition ? <Text style={styles.tcPre} numberOfLines={2}>{item.preCondition}</Text> : null}
          <View style={styles.tcFooter}>
            <Text style={styles.tcSteps}>{item.steps?.length || 0} steps</Text>
            {canEdit && (
              <TouchableOpacity
                onPress={() => navigation.navigate('TestCaseForm', { id: item.id })}
                style={styles.editBtn}
              >
                <Ionicons name="pencil-outline" size={16} color={COLORS.primary} />
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    }

    // Folder-style row for Module / Submodule / Scenario
    const icon = level === LEVELS.MODULE    ? 'folder'
               : level === LEVELS.SUBMODULE ? 'folder-open'
               : 'document-text';
    const count = level === LEVELS.MODULE    ? `${item.submodules?.length || 0} submodules`
                : level === LEVELS.SUBMODULE ? `${item.scenarios?.length || 0} scenarios`
                : `${item.testCases?.length || 0} test cases`;

    return (
      <TouchableOpacity style={styles.folderRow} onPress={() => drillDown(item, level)}>
        <View style={styles.folderIcon}>
          <Ionicons name={icon} size={22} color={COLORS.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.folderName}>{item.name}</Text>
          {item.code ? <Text style={styles.folderCode}>{item.code}</Text> : null}
          <Text style={styles.folderCount}>{count}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
      </TouchableOpacity>
    );
  }

  // ── Loading / Error ──────────────────────────────────────────────────────────
  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }
  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.textMuted} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadModules}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const LEVEL_LABELS = {
    [LEVELS.MODULE]:    'Modules',
    [LEVELS.SUBMODULE]: 'Submodules',
    [LEVELS.SCENARIO]:  'Scenarios',
    [LEVELS.TESTCASE]:  'Test Cases',
  };

  return (
    <View style={styles.screen}>
      {/* Breadcrumb */}
      {trail.length > 0 && (
        <View style={styles.breadcrumb}>
          <TouchableOpacity onPress={() => { setTrail([]); setItems(allModules); }} style={styles.breadItem}>
            <Ionicons name="home-outline" size={14} color={COLORS.primary} />
          </TouchableOpacity>
          {trail.map((t, i) => (
            <React.Fragment key={i}>
              <Ionicons name="chevron-forward" size={12} color={COLORS.textMuted} />
              <TouchableOpacity
                onPress={() => {
                  const sliced = trail.slice(0, i + 1);
                  setTrail(sliced);
                  setItems(trail[i].prevItems ? drillBackTo(trail, i) : allModules);
                }}
              >
                <Text style={styles.breadText} numberOfLines={1}>{t.item.name}</Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>
      )}

      {/* Section header */}
      <View style={styles.sectionHeader}>
        {trail.length > 0 && (
          <TouchableOpacity onPress={goBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        )}
        <Text style={styles.sectionTitle}>
          {trail.length > 0 ? trail[trail.length - 1].item.name : 'All Modules'}
        </Text>
        <Text style={styles.sectionLevel}>{LEVEL_LABELS[level]}</Text>
      </View>

      {/* List */}
      <FlatList
        data={items}
        keyExtractor={(item, i) => String(item.id || i)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-outline" size={48} color={COLORS.border} />
            <Text style={styles.emptyText}>No {LEVEL_LABELS[level].toLowerCase()} found.</Text>
          </View>
        }
      />

      {/* FAB — Add Test Case */}
      {canAdd && level === LEVELS.TESTCASE && (
        <TouchableOpacity style={styles.fab} onPress={handleAdd}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

// Navigate back to a specific breadcrumb depth
function drillBackTo(trail, targetIndex) {
  return trail[targetIndex].prevItems;
}

const PRIORITY_COLOR = {
  HIGH:   '#DC2626',
  MEDIUM: '#D97706',
  LOW:    '#16A34A',
};

const styles = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: COLORS.background },
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },

  breadcrumb:    { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border, flexWrap: 'wrap', gap: 4 },
  breadItem:     { padding: 2 },
  breadText:     { fontSize: 12, color: COLORS.primary, maxWidth: 80 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn:       { marginRight: 10 },
  sectionTitle:  { flex: 1, fontSize: 16, fontWeight: '700', color: COLORS.text },
  sectionLevel:  { fontSize: 12, color: COLORS.textMuted, backgroundColor: COLORS.background, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },

  list:          { padding: 12, paddingBottom: 80 },

  folderRow:     { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginBottom: 8, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  folderIcon:    { width: 42, height: 42, borderRadius: 10, backgroundColor: COLORS.primary + '15', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  folderName:    { fontSize: 15, fontWeight: '600', color: COLORS.text },
  folderCode:    { fontSize: 11, color: COLORS.primary, fontWeight: '600', marginTop: 1 },
  folderCount:   { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  tcCard:        { backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginBottom: 8, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  tcCardHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  tcId:          { fontSize: 12, fontWeight: '700', color: COLORS.primary, backgroundColor: COLORS.primary + '15', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  priorityText:  { fontSize: 11, fontWeight: '700' },
  tcName:        { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  tcPre:         { fontSize: 12, color: COLORS.textMuted, marginBottom: 6 },
  tcFooter:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  tcSteps:       { fontSize: 12, color: COLORS.textMuted },
  editBtn:       { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: COLORS.primary },
  editBtnText:   { fontSize: 12, color: COLORS.primary, fontWeight: '600' },

  fab:           { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 },

  empty:         { alignItems: 'center', paddingTop: 60 },
  emptyText:     { color: COLORS.textMuted, fontSize: 14, marginTop: 12 },
  errorText:     { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', marginTop: 12, marginBottom: 20 },
  retryBtn:      { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryBtnText:  { color: '#fff', fontWeight: '600' },
});
