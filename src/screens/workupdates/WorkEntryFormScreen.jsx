import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert, Modal, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { format } from 'date-fns';
import { dailyStatsAPI, adminAPI } from '../../api/client';
import { COLORS, ITEM_TYPES, ITEM_TYPE_COLORS } from '../../config';
import VoiceInput from '../../components/VoiceInput';

// ── Item type selector modal ──────────────────────────────────────────────────
function TypePickerModal({ visible, onSelect, onClose }) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={mStyles.overlay}>
        <View style={mStyles.sheet}>
          <View style={mStyles.header}>
            <Text style={mStyles.title}>Select Item Type</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={COLORS.text} /></TouchableOpacity>
          </View>
          {ITEM_TYPES.map(t => {
            const colors = ITEM_TYPE_COLORS[t.value] || { bg: '#F3F4F6', text: '#6B7280' };
            return (
              <TouchableOpacity key={t.value} style={mStyles.item} onPress={() => { onSelect(t.value); onClose(); }}>
                <View style={[mStyles.badge, { backgroundColor: colors.bg }]}>
                  <Text style={[mStyles.badgeText, { color: colors.text }]}>{t.label}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

// ── Status picker modal ───────────────────────────────────────────────────────
function StatusPickerModal({ visible, statuses, onSelect, onClose }) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={mStyles.overlay}>
        <View style={mStyles.sheet}>
          <View style={mStyles.header}>
            <Text style={mStyles.title}>Select Status</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={COLORS.text} /></TouchableOpacity>
          </View>
          <FlatList
            data={[{ id: null, name: '— None —' }, ...statuses]}
            keyExtractor={i => String(i.id)}
            renderItem={({ item }) => (
              <TouchableOpacity style={mStyles.item} onPress={() => { onSelect(item); onClose(); }}>
                <Text style={mStyles.itemText}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

const mStyles = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:     { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '65%', paddingBottom: 32 },
  header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title:     { fontSize: 16, fontWeight: '700', color: COLORS.text },
  item:      { paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  itemText:  { fontSize: 15, color: COLORS.text },
  badge:     { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeText: { fontSize: 14, fontWeight: '600' },
});

// ── Item Form (per type) ──────────────────────────────────────────────────────
function ItemForm({ item, index, statuses, onChange, onRemove }) {
  const [showFromStatus, setShowFromStatus] = useState(false);
  const [showToStatus,   setShowToStatus]   = useState(false);

  const colors = ITEM_TYPE_COLORS[item.itemType] || { bg: '#F3F4F6', text: '#6B7280' };
  const typeLabel = ITEM_TYPES.find(t => t.value === item.itemType)?.label || item.itemType;

  function set(field, value) { onChange(index, field, value); }

  return (
    <View style={iStyles.card}>
      <View style={iStyles.cardHeader}>
        <View style={[iStyles.typeBadge, { backgroundColor: colors.bg }]}>
          <Text style={[iStyles.typeText, { color: colors.text }]}>{typeLabel}</Text>
        </View>
        <TouchableOpacity onPress={() => onRemove(index)} style={iStyles.removeBtn}>
          <Ionicons name="trash-outline" size={18} color={COLORS.error} />
        </TouchableOpacity>
      </View>

      {/* Time spent */}
      <View style={iStyles.row}>
        <View style={iStyles.halfField}>
          <Text style={iStyles.label}>Time Spent (h) *</Text>
          <TextInput
            style={iStyles.input}
            value={String(item.timeSpent || '')}
            onChangeText={v => set('timeSpent', parseFloat(v) || 0)}
            keyboardType="decimal-pad"
            placeholder="e.g. 2"
            placeholderTextColor={COLORS.textMuted}
          />
        </View>
      </View>

      {/* TICKETS_VERIFIED fields */}
      {item.itemType === 'TICKETS_VERIFIED' && (
        <>
          <VoiceInput label="ClickUp Link" value={item.clickupLink || ''} onChangeText={v => set('clickupLink', v)} placeholder="https://app.clickup.com/t/…" />

          <View style={iStyles.row}>
            {/* Status From */}
            <View style={iStyles.halfField}>
              <Text style={iStyles.label}>Status From</Text>
              <TouchableOpacity style={iStyles.picker} onPress={() => setShowFromStatus(true)}>
                <Text style={item.statusFromId ? iStyles.pickerVal : iStyles.pickerPh} numberOfLines={1}>
                  {statuses.find(s => s.id === item.statusFromId)?.name || 'Select…'}
                </Text>
                <Ionicons name="chevron-down" size={14} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            {/* Status To */}
            <View style={iStyles.halfField}>
              <Text style={iStyles.label}>Status To</Text>
              <TouchableOpacity style={iStyles.picker} onPress={() => setShowToStatus(true)}>
                <Text style={item.statusToId ? iStyles.pickerVal : iStyles.pickerPh} numberOfLines={1}>
                  {statuses.find(s => s.id === item.statusToId)?.name || 'Select…'}
                </Text>
                <Ionicons name="chevron-down" size={14} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          <VoiceInput label="Comment / Note" value={item.comment || ''} onChangeText={v => set('comment', v)} placeholder="What you did…" multiline />
        </>
      )}

      {/* ATTENDED_MEETINGS fields */}
      {item.itemType === 'ATTENDED_MEETINGS' && (
        <VoiceInput label="Meeting Name" value={item.meetingName || ''} onChangeText={v => set('meetingName', v)} placeholder="e.g. QA Squad meet" />
      )}

      {/* TEST_CASES fields */}
      {item.itemType === 'TEST_CASES' && (
        <>
          <VoiceInput label="Module Name" value={item.moduleName || ''} onChangeText={v => set('moduleName', v)} placeholder="e.g. Wildlife" />
          <View style={iStyles.field}>
            <Text style={iStyles.label}>Action</Text>
            <View style={iStyles.toggleRow}>
              {['added', 'updated'].map(a => (
                <TouchableOpacity
                  key={a}
                  style={[iStyles.toggle, item.action === a && iStyles.toggleActive]}
                  onPress={() => set('action', a)}
                >
                  <Text style={[iStyles.toggleText, item.action === a && iStyles.toggleTextActive]}>
                    {a.charAt(0).toUpperCase() + a.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </>
      )}

      {/* SPENT_ON_KT fields */}
      {item.itemType === 'SPENT_ON_KT' && (
        <>
          <VoiceInput label="Module / Topic" value={item.ktModule || ''} onChangeText={v => set('ktModule', v)} placeholder="e.g. Work Orders" />
          <View style={iStyles.field}>
            <Text style={iStyles.label}>KT Type</Text>
            <View style={iStyles.toggleRow}>
              {[{ value: 'give', label: 'Give KT' }, { value: 'get', label: 'Get KT' }].map(t => (
                <TouchableOpacity
                  key={t.value}
                  style={[iStyles.toggle, item.ktType === t.value && iStyles.toggleActive]}
                  onPress={() => set('ktType', t.value)}
                >
                  <Text style={[iStyles.toggleText, item.ktType === t.value && iStyles.toggleTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </>
      )}

      {/* Status pickers */}
      <StatusPickerModal
        visible={showFromStatus} statuses={statuses}
        onSelect={s => set('statusFromId', s.id)}
        onClose={() => setShowFromStatus(false)}
      />
      <StatusPickerModal
        visible={showToStatus} statuses={statuses}
        onSelect={s => set('statusToId', s.id)}
        onClose={() => setShowToStatus(false)}
      />
    </View>
  );
}

const iStyles = StyleSheet.create({
  card:          { backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: COLORS.primary },
  cardHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  typeBadge:     { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  typeText:      { fontSize: 13, fontWeight: '600' },
  removeBtn:     { padding: 6 },
  row:           { flexDirection: 'row', gap: 10 },
  halfField:     { flex: 1, marginBottom: 12 },
  field:         { marginBottom: 12 },
  label:         { fontSize: 12, fontWeight: '600', color: COLORS.text, marginBottom: 5 },
  input:         { backgroundColor: COLORS.background, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: COLORS.text },
  picker:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.background, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 10 },
  pickerVal:     { flex: 1, fontSize: 13, color: COLORS.text },
  pickerPh:      { flex: 1, fontSize: 13, color: COLORS.textMuted },
  toggleRow:     { flexDirection: 'row', gap: 8 },
  toggle:        { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center' },
  toggleActive:  { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  toggleText:    { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  toggleTextActive: { color: '#fff' },
});

// ── Default item by type ──────────────────────────────────────────────────────
function newItem(type) {
  const base = { itemType: type, timeSpent: 0 };
  if (type === 'TICKETS_VERIFIED')  return { ...base, clickupLink: '', comment: '', statusFromId: null, statusToId: null };
  if (type === 'ATTENDED_MEETINGS') return { ...base, meetingName: '' };
  if (type === 'TEST_CASES')        return { ...base, moduleName: '', action: 'added' };
  if (type === 'SPENT_ON_KT')       return { ...base, ktModule: '', ktType: 'give' };
  return base;
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function WorkEntryFormScreen() {
  const navigation = useNavigation();
  const route      = useRoute();
  const editId     = route.params?.id;
  const isEdit     = !!editId;

  const [summary,    setSummary]    = useState('');
  const [date,       setDate]       = useState(format(new Date(), 'yyyy-MM-dd'));
  const [items,      setItems]      = useState([newItem('TICKETS_VERIFIED')]);
  const [statuses,   setStatuses]   = useState([]);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [saving,     setSaving]     = useState(false);

  // Load ticket statuses for the status pickers
  useEffect(() => {
    adminAPI.getTicketStatuses()
      .then(({ data }) => setStatuses(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // Pre-fill form in edit mode
  useEffect(() => {
    const entry = route.params?.entry;
    if (!entry) return;
    setSummary(entry.summary || '');
    try { setDate(format(new Date(entry.date), 'yyyy-MM-dd')); } catch {}
    if (entry.items?.length) {
      setItems(entry.items.map(i => ({
        itemType:     i.itemType,
        timeSpent:    i.timeSpent || 0,
        clickupLink:  i.clickupLink || '',
        comment:      i.comment || '',
        statusFromId: i.statusFrom?.id || null,
        statusToId:   i.statusTo?.id   || null,
        meetingName:  i.meetingName || '',
        moduleName:   i.moduleName  || '',
        action:       i.action      || 'added',
        ktModule:     i.ktModule    || '',
        ktType:       i.ktType      || 'give',
      })));
    }
  }, []);

  function updateItem(index, field, value) {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  }
  function removeItem(index) {
    if (items.length === 1) return Alert.alert('Info', 'At least one item is required.');
    setItems(prev => prev.filter((_, i) => i !== index));
  }
  function addItem(type) { setItems(prev => [...prev, newItem(type)]); }

  async function handleSave() {
    const validItems = items.filter(i => i.timeSpent > 0);
    if (validItems.length === 0) return Alert.alert('Required', 'At least one item with time > 0 is required.');

    setSaving(true);
    try {
      const payload = { date, summary: summary.trim() || null, items: validItems };
      if (isEdit) {
        await dailyStatsAPI.updateEntry(editId, payload);
        Alert.alert('Saved', 'Work entry updated.');
      } else {
        await dailyStatsAPI.createEntry(payload);
        Alert.alert('Created', 'Work entry added.');
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save entry.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Date */}
      <View style={styles.field}>
        <Text style={styles.label}>Date *</Text>
        <View style={styles.inputRow}>
          <Ionicons name="calendar-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={COLORS.textMuted}
          />
        </View>
      </View>

      {/* Summary */}
      <VoiceInput
        label="Day Summary"
        value={summary}
        onChangeText={setSummary}
        placeholder="What did you work on today?"
        multiline
      />

      {/* Work items */}
      <View style={styles.itemsSection}>
        <Text style={styles.sectionTitle}>Work Items</Text>
        {items.map((item, i) => (
          <ItemForm
            key={i}
            item={item}
            index={i}
            statuses={statuses}
            onChange={updateItem}
            onRemove={removeItem}
          />
        ))}

        <TouchableOpacity style={styles.addItemBtn} onPress={() => setShowTypePicker(true)}>
          <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
          <Text style={styles.addItemText}>Add Work Item</Text>
        </TouchableOpacity>
      </View>

      {/* Save */}
      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
        {saving
          ? <ActivityIndicator color="#fff" />
          : <><Ionicons name="checkmark-circle-outline" size={20} color="#fff" /><Text style={styles.saveBtnText}>{isEdit ? 'Update' : 'Submit'} Entry</Text></>
        }
      </TouchableOpacity>

      <TypePickerModal
        visible={showTypePicker}
        onSelect={addItem}
        onClose={() => setShowTypePicker(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: COLORS.background },
  content:       { padding: 16, paddingBottom: 40 },
  field:         { marginBottom: 16 },
  label:         { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  inputRow:      { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12, height: 48 },
  inputIcon:     { marginRight: 8 },
  input:         { flex: 1, fontSize: 15, color: COLORS.text },
  itemsSection:  { marginBottom: 20 },
  sectionTitle:  { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  addItemBtn:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 10, borderStyle: 'dashed', justifyContent: 'center', marginTop: 4 },
  addItemText:   { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
  saveBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 16, elevation: 3 },
  saveBtnText:   { color: '#fff', fontWeight: '700', fontSize: 16 },
});
