import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import { dailyStatsAPI } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { COLORS, ITEM_TYPES, ITEM_TYPE_COLORS } from '../../config';

function EntryCard({ entry, canEdit, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  const totalHours = entry.items?.reduce((s, i) => s + (i.timeSpent || 0), 0) || 0;

  // Aggregate hours by item type
  const typeMap = {};
  (entry.items || []).forEach(i => {
    typeMap[i.itemType] = (typeMap[i.itemType] || 0) + i.timeSpent;
  });

  const formattedDate = (() => {
    try { return format(new Date(entry.date), 'dd MMM yyyy'); } catch { return entry.date; }
  })();

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.cardHeader} onPress={() => setExpanded(e => !e)}>
        <View style={styles.cardLeft}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{entry.user?.name?.[0]?.toUpperCase() || '?'}</Text>
          </View>
          <View>
            <Text style={styles.memberName}>{entry.user?.name || 'Unknown'}</Text>
            <Text style={styles.dateText}>{formattedDate}</Text>
            <Text style={styles.metaText}>{entry.items?.length || 0} items · {totalHours.toFixed(1)}h total</Text>
          </View>
        </View>
        <View style={styles.cardRight}>
          {canEdit && (
            <TouchableOpacity style={styles.editBtn} onPress={() => onEdit(entry)}>
              <Ionicons name="pencil-outline" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          )}
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textMuted} />
        </View>
      </TouchableOpacity>

      {/* Type chips */}
      <View style={styles.chips}>
        {Object.entries(typeMap).map(([type, hrs]) => {
          const colors = ITEM_TYPE_COLORS[type] || { bg: '#F3F4F6', text: '#6B7280' };
          const label  = ITEM_TYPES.find(t => t.value === type)?.label?.split(' ')[0] || type;
          return (
            <View key={type} style={[styles.chip, { backgroundColor: colors.bg }]}>
              <Text style={[styles.chipText, { color: colors.text }]}>{label} {hrs.toFixed(1)}h</Text>
            </View>
          );
        })}
      </View>

      {/* Summary */}
      {expanded && entry.summary ? (
        <Text style={styles.summary}>"{entry.summary}"</Text>
      ) : null}

      {/* Items */}
      {expanded && (
        <View style={styles.items}>
          {(entry.items || []).map((item, i) => {
            const colors = ITEM_TYPE_COLORS[item.itemType] || { bg: '#F3F4F6', text: '#6B7280' };
            const label  = ITEM_TYPES.find(t => t.value === item.itemType)?.label || item.itemType;
            return (
              <View key={item.id || i} style={styles.itemRow}>
                <View style={styles.itemHeader}>
                  <View style={[styles.itemTypeBadge, { backgroundColor: colors.bg }]}>
                    <Text style={[styles.itemTypeText, { color: colors.text }]}>{label}</Text>
                  </View>
                  <Text style={styles.itemTime}>{item.timeSpent}h</Text>
                </View>
                {item.itemType === 'TICKETS_VERIFIED' && (
                  <View style={styles.itemDetail}>
                    {item.clickupLink ? <Text style={styles.detailLink} numberOfLines={1}>{item.clickupLink}</Text> : null}
                    {(item.statusFrom || item.statusTo) ? (
                      <Text style={styles.detailText}>
                        Status: {item.statusFrom?.name || '—'} → {item.statusTo?.name || '—'}
                      </Text>
                    ) : null}
                    {item.comment ? <Text style={styles.detailText} numberOfLines={2}>Note: {item.comment}</Text> : null}
                  </View>
                )}
                {item.itemType === 'ATTENDED_MEETINGS' && item.meetingName ? (
                  <Text style={styles.detailText}>{item.meetingName}</Text>
                ) : null}
                {item.itemType === 'TEST_CASES' ? (
                  <Text style={styles.detailText}>
                    {item.moduleName} — {item.action === 'added' ? 'Added' : 'Updated'}
                  </Text>
                ) : null}
                {item.itemType === 'SPENT_ON_KT' ? (
                  <Text style={styles.detailText}>
                    {item.ktModule} — {item.ktType === 'give' ? 'Give KT' : 'Get KT'}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

export default function WorkUpdatesScreen() {
  const navigation = useNavigation();
  const { hasPermission } = useAuth();
  const canAdd  = hasPermission('DAILY_STATS', 'ADD');
  const canEdit = hasPermission('DAILY_STATS', 'EDIT');

  const [entries,    setEntries]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const { data } = await dailyStatsAPI.getEntries({ all: true });
      setEntries(Array.isArray(data) ? data : data.entries || []);
    } catch {
      setError('Failed to load work updates.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Reload when screen comes back into focus (after add/edit)
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  function openEdit(entry) {
    navigation.navigate('WorkEntryForm', { id: entry.id, entry });
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }
  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={48} color={COLORS.textMuted} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Stats bar */}
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>{entries.length} entries</Text>
        <Text style={styles.statsHours}>
          {entries.reduce((s, e) => s + (e.items?.reduce((ss, i) => ss + (i.timeSpent || 0), 0) || 0), 0).toFixed(1)}h total
        </Text>
      </View>

      <FlatList
        data={entries}
        keyExtractor={(item, i) => String(item.id || i)}
        renderItem={({ item }) => (
          <EntryCard entry={item} canEdit={canEdit} onEdit={openEdit} />
        )}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="time-outline" size={56} color={COLORS.border} />
            <Text style={styles.emptyText}>No work entries found.</Text>
            {canAdd && <Text style={styles.emptyHint}>Tap + to add your first entry.</Text>}
          </View>
        }
      />

      {/* FAB */}
      {canAdd && (
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('WorkEntryForm', {})}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen:         { flex: 1, backgroundColor: COLORS.background },
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  statsBar:       { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  statsText:      { fontSize: 13, color: COLORS.textMuted },
  statsHours:     { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  list:           { padding: 12, paddingBottom: 80 },
  card:           { backgroundColor: COLORS.surface, borderRadius: 14, marginBottom: 10, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  cardHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  cardLeft:       { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  cardRight:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar:         { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText:     { color: '#fff', fontWeight: '700', fontSize: 16 },
  memberName:     { fontSize: 14, fontWeight: '700', color: COLORS.accent },
  dateText:       { fontSize: 13, fontWeight: '600', color: COLORS.text, marginTop: 1 },
  metaText:       { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  editBtn:        { padding: 6 },
  chips:          { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 14, paddingBottom: 12 },
  chip:           { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  chipText:       { fontSize: 12, fontWeight: '600' },
  summary:        { fontSize: 13, color: COLORS.textMuted, fontStyle: 'italic', paddingHorizontal: 14, paddingBottom: 10 },
  items:          { borderTopWidth: 1, borderTopColor: COLORS.border, padding: 12, gap: 8 },
  itemRow:        { backgroundColor: COLORS.background, borderRadius: 10, padding: 12 },
  itemHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  itemTypeBadge:  { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  itemTypeText:   { fontSize: 12, fontWeight: '600' },
  itemTime:       { fontSize: 13, fontWeight: '700', color: COLORS.text },
  itemDetail:     { gap: 2 },
  detailLink:     { fontSize: 12, color: COLORS.info },
  detailText:     { fontSize: 12, color: COLORS.textMuted },
  fab:            { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 },
  empty:          { alignItems: 'center', paddingTop: 60 },
  emptyText:      { color: COLORS.textMuted, fontSize: 15, fontWeight: '600', marginTop: 12 },
  emptyHint:      { color: COLORS.textMuted, fontSize: 13, marginTop: 4 },
  errorText:      { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', marginTop: 12, marginBottom: 20 },
  retryBtn:       { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryBtnText:   { color: '#fff', fontWeight: '600' },
});
