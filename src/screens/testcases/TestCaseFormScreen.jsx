import React, { useEffect, useState } from 'react';
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

// ── Picker Modal with optional "Create new" footer ────────────────────────────
function PickerModal({ visible, title, items, onSelect, onClose,
                       keyProp = 'id', labelProp = 'name',
                       onCreateNew, createLabel }) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={mStyles.overlay}>
        <View style={mStyles.sheet}>
          <View style={mStyles.header}>
            <Text style={mStyles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
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
          {onCreateNew && (
            <TouchableOpacity
              style={mStyles.createBtn}
              onPress={() => { onClose(); onCreateNew(); }}
            >
              <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
              <Text style={mStyles.createBtnText}>{createLabel || 'Create New'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── Inline create modal (name input + confirm) ────────────────────────────────
function CreateItemModal({ visible, title, placeholder, onConfirm, onClose, creating }) {
  const [value, setValue] = useState('');

  function submit() {
    const trimmed = value.trim();
    if (!trimmed) { Alert.alert('Required', 'Please enter a name.'); return; }
    onConfirm(trimmed);
  }

  function close() { setValue(''); onClose(); }

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={cStyles.overlay}>
        <View style={cStyles.card}>
          <Text style={cStyles.title}>{title}</Text>
          <TextInput
            style={cStyles.input}
            placeholder={placeholder}
            placeholderTextColor={COLORS.textMuted}
            value={value}
            onChangeText={setValue}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={submit}
          />
          <View style={cStyles.actions}>
            <TouchableOpacity style={cStyles.cancelBtn} onPress={close}>
              <Text style={cStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={cStyles.confirmBtn} onPress={submit} disabled={creating}>
              {creating
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={cStyles.confirmText}>Create</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const mStyles = StyleSheet.create({
  overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:         { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%', paddingBottom: 16 },
  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title:         { fontSize: 16, fontWeight: '700', color: COLORS.text },
  item:          { paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  itemText:      { fontSize: 15, color: COLORS.text },
  itemSub:       { fontSize: 12, color: COLORS.primary, marginTop: 2 },
  empty:         { padding: 20, color: COLORS.textMuted, textAlign: 'center' },
  createBtn:     { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 16, paddingVertical: 12, borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 10, borderStyle: 'dashed', justifyContent: 'center' },
  createBtnText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
});

const cStyles = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  card:        { backgroundColor: COLORS.surface, borderRadius: 16, padding: 24, elevation: 10 },
  title:       { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  input:       { backgroundColor: COLORS.background, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.text, marginBottom: 20 },
  actions:     { flexDirection: 'row', gap: 12 },
  cancelBtn:   { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center' },
  cancelText:  { fontSize: 15, fontWeight: '600', color: COLORS.textMuted },
  confirmBtn:  { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center' },
  confirmText: { fontSize: 15, fontWeight: '600', color: '#fff' },
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
  const [tags,        setTags]        = useState([]);
  const [selTypes,    setSelTypes]    = useState([]);
  const [selTags,     setSelTags]     = useState([]);

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

  // Inline create modals
  const [showCreateSub,  setShowCreateSub]  = useState(false);
  const [showCreateScen, setShowCreateScen] = useState(false);
  const [creating,       setCreating]       = useState(false);

  const [loading, setLoading] = useState(isEdit);
  const [saving,  setSaving]  = useState(false);

  // Load module hierarchy + admin lookup data
  useEffect(() => {
    (async () => {
      try {
        const moduleParams = route.params?.projectId ? { projectId: route.params.projectId } : {};
        const [modulesRes, prioritiesRes, typesRes, tagsRes] = await Promise.all([
          testCasesAPI.getModules(moduleParams),
          adminAPI.getPriorities(),
          adminAPI.getTypes(),
          adminAPI.getTags(),
        ]);
        const loadedModules = modulesRes.data.modules || [];
        setModules(loadedModules);
        setPriorities([{ id: null, name: 'None' }, ...(prioritiesRes.data.priorities || [])]);
        setTypes(typesRes.data.types || []);
        setTags(tagsRes.data.tags || []);

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
      } catch {
        Alert.alert('Error', 'Failed to load form options. Please go back and try again.');
      }
    })();
  }, []);

  // Load existing test case for edit
  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const { data } = await testCasesAPI.getOne(editId);
        const tc = data.testCase;
        setName(tc.name || '');
        setPreCondition(tc.preCondition || '');
        setSteps(tc.steps?.length
          ? tc.steps.map(s => ({ action: s.action, expectedResult: s.expectedResult }))
          : [EMPTY_STEP()]);
        setSelPriority(tc.priority || null);
        setSelTypes((tc.types || []).map(t => t.typeId || t.type?.id));
        setSelTags((tc.tags  || []).map(t => t.tagId  || t.tag?.id));
        const m = tc.scenario?.submodule?.module;
        if (m) { setSelModule(m); setSubmodules(m.submodules || []); }
        const sub = tc.scenario?.submodule;
        if (sub) { setSelSubmodule(sub); setScenarios(sub.scenarios || []); }
        if (tc.scenario) setSelScenario(tc.scenario);
      } catch {
        Alert.alert('Error', 'Could not load test case.');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    })();
  }, [editId]);

  // ── Inline create handlers ─────────────────────────────────────────────────
  async function handleCreateSubmodule(subName) {
    setCreating(true);
    try {
      const { data } = await testCasesAPI.createSubmodule({ name: subName, moduleId: selModule.id });
      const created = data.submodule;
      setSubmodules(prev => [...prev, created]);
      setSelSubmodule(created);
      setScenarios([]);
      setSelScenario(null);
      setShowCreateSub(false);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create submodule.');
    } finally {
      setCreating(false);
    }
  }

  async function handleCreateScenario(scenName) {
    setCreating(true);
    try {
      const { data } = await testCasesAPI.createScenario({ name: scenName, submoduleId: selSubmodule.id });
      const created = data.scenario;
      setScenarios(prev => [...prev, created]);
      setSelScenario(created);
      setShowCreateScen(false);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create scenario.');
    } finally {
      setCreating(false);
    }
  }

  // ── Step helpers ───────────────────────────────────────────────────────────
  function updateStep(index, field, value) {
    setSteps(s => s.map((st, i) => i === index ? { ...st, [field]: value } : st));
  }
  function addStep()     { setSteps(s => [...s, EMPTY_STEP()]); }
  function removeStep(i) { if (steps.length > 1) setSteps(s => s.filter((_, idx) => idx !== i)); }

  async function handleSave() {
    if (!name.trim())  return Alert.alert('Required', 'Test case name is required.');
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
        tagIds:       selTags.filter(Boolean),
        steps:        validSteps.map((s, i) => ({
          order: i + 1, action: s.action.trim(), expectedResult: s.expectedResult.trim(),
        })),
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

      {/* Module */}
      <View style={styles.field}>
        <Text style={styles.label}>Module *</Text>
        <TouchableOpacity style={styles.picker} onPress={() => setShowMod(true)}>
          <Text style={selModule ? styles.pickerValue : styles.pickerPlaceholder}>
            {selModule ? selModule.name : 'Select module…'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Submodule */}
      <View style={styles.field}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>Submodule *</Text>
          {selModule && (
            <TouchableOpacity style={styles.inlineAddBtn} onPress={() => setShowCreateSub(true)}>
              <Ionicons name="add-circle-outline" size={14} color={COLORS.primary} />
              <Text style={styles.inlineAddText}>New</Text>
            </TouchableOpacity>
          )}
        </View>
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

      {/* Scenario */}
      <View style={styles.field}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>Scenario *</Text>
          {selSubmodule && (
            <TouchableOpacity style={styles.inlineAddBtn} onPress={() => setShowCreateScen(true)}>
              <Ionicons name="add-circle-outline" size={14} color={COLORS.primary} />
              <Text style={styles.inlineAddText}>New</Text>
            </TouchableOpacity>
          )}
        </View>
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

      {/* Priority */}
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
          <View style={styles.chips}>
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
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{t.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Tags (multi-select) */}
      {tags.length > 0 && (
        <View style={styles.field}>
          <Text style={styles.label}>Tags</Text>
          <View style={styles.chips}>
            {tags.map(t => {
              const selected = selTags.includes(t.id);
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.tagChip, selected && styles.tagChipSelected]}
                  onPress={() => setSelTags(prev =>
                    prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id]
                  )}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{t.name}</Text>
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
            <VoiceInput label="Action" value={step.action} onChangeText={v => updateStep(i, 'action', v)} placeholder="What to do…" multiline />
            <VoiceInput label="Expected Result" value={step.expectedResult} onChangeText={v => updateStep(i, 'expectedResult', v)} placeholder="Expected outcome…" multiline />
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
          : <><Ionicons name="checkmark-circle-outline" size={20} color="#fff" /><Text style={styles.saveBtnText}>{isEdit ? 'Update' : 'Create'} Test Case</Text></>}
      </TouchableOpacity>

      {/* ── Pickers ── */}
      <PickerModal
        visible={showMod} title="Select Module" items={modules}
        onSelect={m => { setSelModule(m); setSubmodules(m.submodules || []); setSelSubmodule(null); setSelScenario(null); setScenarios([]); }}
        onClose={() => setShowMod(false)}
      />
      <PickerModal
        visible={showSub} title="Select Submodule" items={submodules}
        onSelect={s => { setSelSubmodule(s); setScenarios(s.scenarios || []); setSelScenario(null); }}
        onClose={() => setShowSub(false)}
        onCreateNew={() => setShowCreateSub(true)}
        createLabel="Create new submodule"
      />
      <PickerModal
        visible={showScen} title="Select Scenario" items={scenarios}
        onSelect={s => setSelScenario(s)}
        onClose={() => setShowScen(false)}
        onCreateNew={() => setShowCreateScen(true)}
        createLabel="Create new scenario"
      />
      <PickerModal
        visible={showPri} title="Select Priority" items={priorities}
        onSelect={p => setSelPriority(p.id ? p : null)}
        onClose={() => setShowPri(false)}
      />

      {/* ── Inline create modals ── */}
      <CreateItemModal
        visible={showCreateSub}
        title={`New Submodule in "${selModule?.name}"`}
        placeholder="Submodule name…"
        onConfirm={handleCreateSubmodule}
        onClose={() => setShowCreateSub(false)}
        creating={creating}
      />
      <CreateItemModal
        visible={showCreateScen}
        title={`New Scenario in "${selSubmodule?.name}"`}
        placeholder="Scenario name…"
        onConfirm={handleCreateScenario}
        onClose={() => setShowCreateScen(false)}
        creating={creating}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen:           { flex: 1, backgroundColor: COLORS.background },
  content:          { padding: 16, paddingBottom: 40 },
  center:           { flex: 1, justifyContent: 'center', alignItems: 'center' },
  field:            { marginBottom: 16 },
  labelRow:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  label:            { fontSize: 13, fontWeight: '600', color: COLORS.text },
  inlineAddBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, borderWidth: 1, borderColor: COLORS.primary },
  inlineAddText:    { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  picker:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13 },
  pickerDisabled:   { opacity: 0.5 },
  pickerValue:      { fontSize: 15, color: COLORS.text, flex: 1 },
  pickerPlaceholder:{ fontSize: 15, color: COLORS.textMuted, flex: 1 },
  chips:            { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip:         { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  typeChipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tagChip:          { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.info, backgroundColor: COLORS.surface },
  tagChipSelected:  { backgroundColor: COLORS.info, borderColor: COLORS.info },
  chipText:         { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  chipTextSelected: { color: '#fff' },
  stepsSection:     { marginBottom: 20 },
  stepsTitle:       { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  stepCard:         { backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: COLORS.primary },
  stepHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  stepNumBadge:     { width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  stepNum:          { color: '#fff', fontSize: 12, fontWeight: '700' },
  removeStepBtn:    { padding: 4 },
  addStepBtn:       { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 10, borderStyle: 'dashed', justifyContent: 'center' },
  addStepText:      { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
  saveBtn:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 16, marginTop: 8, elevation: 3 },
  saveBtnText:      { color: '#fff', fontWeight: '700', fontSize: 16 },
});
