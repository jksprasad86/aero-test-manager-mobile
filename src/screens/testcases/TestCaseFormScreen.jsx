import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert, Modal, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { testCasesAPI, adminAPI } from '../../api/client';
import { COLORS } from '../../config';
import VoiceInput from '../../components/VoiceInput';

const EMPTY_STEP = () => ({ action: '', expectedResult: '' });

// ── Picker Modal ──────────────────────────────────────────────────────────────
function PickerModal({ visible, title, items, onSelect, onClose, keyProp = 'id', labelProp = 'name' }) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={mStyles.overlay}>
        <View style={mStyles.sheet}>
          <View style={mStyles.header}>
            <Text style={mStyles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={COLORS.text} /></TouchableOpacity>
          </View>
          <FlatList
            data={items}
            keyExtractor={i => String(i[keyProp])}
            renderItem={({ item }) => (
              <TouchableOpacity style={mStyles.item} onPress={() => { onSelect(item); onClose(); }}>
                <Text style={mStyles.itemText}>{item[labelProp]}</Text>
                {item.code ? <Text style={mStyles.itemSub}>{item.code}</Text> : null}
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={mStyles.empty}>No options available.</Text>}
          />
        </View>
      </View>
    </Modal>
  );
}

const mStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:   { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%', paddingBottom: 32 },
  header:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title:   { fontSize: 16, fontWeight: '700', color: COLORS.text },
  item:    { paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  itemText:{ fontSize: 15, color: COLORS.text },
  itemSub: { fontSize: 12, color: COLORS.primary, marginTop: 2 },
  empty:   { padding: 20, color: COLORS.textMuted, textAlign: 'center' },
});

// ── Main Form ─────────────────────────────────────────────────────────────────
export default function TestCaseFormScreen() {
  const navigation = useNavigation();
  const route      = useRoute();
  const editId     = route.params?.id;
  const isEdit     = !!editId;

  const [modules,     setModules]     = useState([]);
  const [submodules,  setSubmodules]  = useState([]);
  const [scenarios,   setScenarios]   = useState([]);
  const [priorities,  setPriorities]  = useState([]);
  const [types,       setTypes]       = useState([]);
  const [selTypes,    setSelTypes]    = useState([]); // selected type IDs
  const [showTypes,   setShowTypes]   = useState(false);

  // Form state
  const [name,         setName]         = useState('');
  const [preCondition, setPreCondition] = useState('');
  const [selModule,    setSelModule]    = useState(null);
  const [selSubmodule, setSelSubmodule] = useState(null);
  const [selScenario,  setSelScenario]  = useState(null);
  const [selPriority,  setSelPriority]  = useState(null);
  const [steps,        setSteps]        = useState([EMPTY_STEP()]);

  // Picker visibility
  const [showMod,  setShowMod]  = useState(false);
  const [showSub,  setShowSub]  = useState(false);
  const [showScen, setShowScen] = useState(false);
  const [showPri,  setShowPri]  = useState(false);

  const [loading, setLoading] = useState(isEdit);
  const [saving,  setSaving]  = useState(false);

  // Load module hierarchy + admin lookup data
  useEffect(() => {
    (async () => {
      const moduleParams = route.params?.projectId ? { projectId: route.params.projectId } : {};
      const [modulesRes, prioritiesRes, typesRes] = await Promise.all([
        testCasesAPI.getModules(moduleParams),
        adminAPI.getPriorities(),
        adminAPI.getTypes(),
      ]);
      const loadedModules = modulesRes.data.modules || [];
      setModules(loadedModules);
      setPriorities([{ id: null, name: 'None' }, ...(prioritiesRes.data.priorities || [])]);
      setTypes(typesRes.data.types || []);

      // Pre-select from navigation params
      if (route.params?.moduleId) {
        const m = loadedModules.find(x => x.id === route.params.moduleId);
        if (m) {
          setSelModule(m);
          setSubmodules(m.submodules || []);
          if (route.params?.submoduleId) {
            const s = (m.submodules || []).find(x => x.id === route.params.submoduleId);
            if (s) {
              setSelSubmodule(s);
              setScenarios(s.scenarios || []);
              if (route.params?.scenarioId) {
                const sc = (s.scenarios || []).find(x => x.id === route.params.scenarioId);
                if (sc) setSelScenario(sc);
              }
            }
          }
        }
      }
    })();
  }, []);

  // Load existing test case for edit
  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const { data } = await testCasesAPI.getOne(editId);
        setName(data.name || '');
        setPreCondition(data.preCondition || '');
        setSteps(data.steps?.length ? data.steps.map(s => ({ action: s.action, expectedResult: s.expectedResult })) : [EMPTY_STEP()]);
        setSelPriority(data.priority || null);
        setSelTypes((data.types || []).map(t => t.typeId || t.type?.id));
        // Set hierarchy
        const m = data.scenario?.submodule?.module;
        if (m) { setSelModule(m); setSubmodules(m.submodules || []); }
        const sub = data.scenario?.submodule;
        if (sub) { setSelSubmodule(sub); setScenarios(sub.scenarios || []); }
        if (data.scenario) setSelScenario(data.scenario);
      } catch {
        Alert.alert('Error', 'Could not load test case.');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    })();
  }, [editId]);

  // Step helpers
  function updateStep(index, field, value) {
    setSteps(s => s.map((st, i) => i === index ? { ...st, [field]: value } : st));
  }
  function addStep()    { setSteps(s => [...s, EMPTY_STEP()]); }
  function removeStep(i){ if (steps.length > 1) setSteps(s => s.filter((_, idx) => idx !== i)); }

  async function handleSave() {
    if (!name.trim()) return Alert.alert('Required', 'Test case name is required.');
    if (!selScenario)  return Alert.alert('Required', 'Please select a scenario.');

    const validSteps = steps.filter(s => s.action.trim());
    if (validSteps.length === 0) return Alert.alert('Required', 'At least one step with an action is required.');

    setSaving(true);
    try {
      const payload = {
        name:         name.trim(),
        preCondition: preCondition.trim() || null,
        scenarioId:   selScenario.id,
        priorityId:   selPriority?.id || null,
        typeIds:      selTypes.filter(Boolean),
        steps:        validSteps.map((s, i) => ({ order: i + 1, action: s.action.trim(), expectedResult: s.expectedResult.trim() })),
      };

      if (isEdit) {
        await testCasesAPI.update(editId, payload);
        Alert.alert('Saved', 'Test case updated successfully.');
      } else {
        await testCasesAPI.create(payload);
        Alert.alert('Created', 'Test case added successfully.');
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save test case.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

      {/* Name */}
      <VoiceInput label="Test Case Name *" value={name} onChangeText={setName} placeholder="Enter test case name" />

      {/* Pre-condition */}
      <VoiceInput label="Pre-condition" value={preCondition} onChangeText={setPreCondition} placeholder="Optional pre-condition" multiline />

      {/* Module picker */}
      <View style={styles.field}>
        <Text style={styles.label}>Module *</Text>
        <TouchableOpacity style={styles.picker} onPress={() => setShowMod(true)}>
          <Text style={selModule ? styles.pickerValue : styles.pickerPlaceholder}>
            {selModule ? selModule.name : 'Select module…'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Submodule picker */}
      <View style={styles.field}>
        <Text style={styles.label}>Submodule *</Text>
        <TouchableOpacity
          style={[styles.picker, !selModule && styles.pickerDisabled]}
          onPress={() => selModule && setShowSub(true)}
        >
          <Text style={selSubmodule ? styles.pickerValue : styles.pickerPlaceholder}>
            {selSubmodule ? selSubmodule.name : 'Select submodule…'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Scenario picker */}
      <View style={styles.field}>
        <Text style={styles.label}>Scenario *</Text>
        <TouchableOpacity
          style={[styles.picker, !selSubmodule && styles.pickerDisabled]}
          onPress={() => selSubmodule && setShowScen(true)}
        >
          <Text style={selScenario ? styles.pickerValue : styles.pickerPlaceholder}>
            {selScenario ? selScenario.name : 'Select scenario…'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Priority picker */}
      <View style={styles.field}>
        <Text style={styles.label}>Priority</Text>
        <TouchableOpacity style={styles.picker} onPress={() => setShowPri(true)}>
          <Text style={selPriority ? styles.pickerValue : styles.pickerPlaceholder}>
            {selPriority?.name || 'Select priority…'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Types (multi-select) */}
      {types.length > 0 && (
        <View style={styles.field}>
          <Text style={styles.label}>Types</Text>
          <View style={styles.typeChips}>
            {types.map(t => {
              const selected = selTypes.includes(t.id);
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.typeChip, selected && styles.typeChipSelected]}
                  onPress={() => setSelTypes(prev =>
                    prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id]
                  )}
                >
                  <Text style={[styles.typeChipText, selected && styles.typeChipTextSelected]}>
                    {t.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Steps */}
      <View style={styles.stepsSection}>
        <Text style={styles.stepsTitle}>Test Steps *</Text>
        {steps.map((step, i) => (
          <View key={i} style={styles.stepCard}>
            <View style={styles.stepHeader}>
              <View style={styles.stepNumBadge}><Text style={styles.stepNum}>{i + 1}</Text></View>
              {steps.length > 1 && (
                <TouchableOpacity onPress={() => removeStep(i)} style={styles.removeStepBtn}>
                  <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                </TouchableOpacity>
              )}
            </View>
            <VoiceInput
              label="Action"
              value={step.action}
              onChangeText={v => updateStep(i, 'action', v)}
              placeholder="What to do…"
              multiline
            />
            <VoiceInput
              label="Expected Result"
              value={step.expectedResult}
              onChangeText={v => updateStep(i, 'expectedResult', v)}
              placeholder="Expected outcome…"
              multiline
            />
          </View>
        ))}
        <TouchableOpacity style={styles.addStepBtn} onPress={addStep}>
          <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
          <Text style={styles.addStepText}>Add Step</Text>
        </TouchableOpacity>
      </View>

      {/* Save */}
      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
        {saving
          ? <ActivityIndicator color="#fff" />
          : <><Ionicons name="checkmark-circle-outline" size={20} color="#fff" /><Text style={styles.saveBtnText}>{isEdit ? 'Update' : 'Create'} Test Case</Text></>
        }
      </TouchableOpacity>

      {/* Pickers */}
      <PickerModal
        visible={showMod} title="Select Module" items={modules}
        onSelect={m => { setSelModule(m); setSubmodules(m.submodules || []); setSelSubmodule(null); setSelScenario(null); setScenarios([]); }}
        onClose={() => setShowMod(false)}
      />
      <PickerModal
        visible={showSub} title="Select Submodule" items={submodules}
        onSelect={s => { setSelSubmodule(s); setScenarios(s.scenarios || []); setSelScenario(null); }}
        onClose={() => setShowSub(false)}
      />
      <PickerModal
        visible={showScen} title="Select Scenario" items={scenarios}
        onSelect={s => setSelScenario(s)}
        onClose={() => setShowScen(false)}
      />
      <PickerModal
        visible={showPri} title="Select Priority"
        items={priorities}
        onSelect={p => setSelPriority(p.id ? p : null)}
        onClose={() => setShowPri(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen:          { flex: 1, backgroundColor: COLORS.background },
  content:         { padding: 16, paddingBottom: 40 },
  center:          { flex: 1, justifyContent: 'center', alignItems: 'center' },
  field:           { marginBottom: 16 },
  label:           { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  picker:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13 },
  pickerDisabled:  { opacity: 0.5 },
  pickerValue:     { fontSize: 15, color: COLORS.text, flex: 1 },
  pickerPlaceholder: { fontSize: 15, color: COLORS.textMuted, flex: 1 },
  stepsSection:    { marginBottom: 20 },
  stepsTitle:      { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  stepCard:        { backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: COLORS.primary },
  stepHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  stepNumBadge:    { width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  stepNum:         { color: '#fff', fontSize: 12, fontWeight: '700' },
  removeStepBtn:   { padding: 4 },
  addStepBtn:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 10, borderStyle: 'dashed', justifyContent: 'center' },
  addStepText:     { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
  saveBtn:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 16, marginTop: 8, elevation: 3 },
  saveBtnText:         { color: '#fff', fontWeight: '700', fontSize: 16 },
  typeChips:           { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip:            { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  typeChipSelected:    { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeChipText:        { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  typeChipTextSelected:{ color: '#fff' },
});
