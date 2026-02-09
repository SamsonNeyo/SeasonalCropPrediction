import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Animated,
  Easing,
  Modal,
  Pressable,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { deleteHistoryItem, getUserHistory } from '../services/firestore';
import { useAuth } from '../context/AuthContext';

const HistoryScreen = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [yearOpen, setYearOpen] = useState(false);
  const [monthOpen, setMonthOpen] = useState(false);
  const [filterYear, setFilterYear] = useState<number | 'all'>('all');
  const [filterMonth, setFilterMonth] = useState<number | 'all'>('all');
  const headerIn = useRef(new Animated.Value(0)).current;
  const listIn = useRef(new Animated.Value(0)).current;

  const loadHistory = async () => {
    try {
      setError('');
      setLoading(true);
      if (!user) {
        setItems([]);
        return;
      }
      const data = await getUserHistory();
      setItems(data || []);
    } catch (e: any) {
      const msg = e?.code || e?.message || 'Could not load history.';
      setError(`Could not load history: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteHistoryItem(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  useEffect(() => {
    loadHistory();
    Animated.stagger(140, [
      Animated.timing(headerIn, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(listIn, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [user, headerIn, listIn]);

  const getItemDate = (item: any): Date | null => {
    const ts = item?.timestamp;
    if (!ts) return null;
    if (typeof ts === 'string') {
      const d = new Date(ts);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    if (typeof ts?.toDate === 'function') {
      const d = ts.toDate();
      return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
    }
    return null;
  };

  const years = useMemo(() => {
    const set = new Set<number>();
    items.forEach((i) => {
      const d = getItemDate(i);
      if (d) set.add(d.getFullYear());
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [items]);

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filterYear === 'all' && filterMonth === 'all') return true;
      const d = getItemDate(item);
      if (!d) return false;
      if (filterYear !== 'all' && d.getFullYear() !== filterYear) return false;
      if (filterMonth !== 'all' && d.getMonth() + 1 !== filterMonth) return false;
      return true;
    });
  }, [items, filterYear, filterMonth]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.bgAccent} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View
          style={[
            styles.header,
            {
              opacity: headerIn,
              transform: [
                {
                  translateY: headerIn.interpolate({
                    inputRange: [0, 1],
                    outputRange: [12, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.headerIcon}>
            <MaterialCommunityIcons name="history" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>History</Text>
            <Text style={styles.subtitle}>Your recent predictions and manual analyses</Text>
          </View>
          <TouchableOpacity onPress={loadHistory} style={styles.refreshButton}>
            <MaterialCommunityIcons name="refresh" size={18} color={COLORS.primary} />
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.filterCard}>
          <Text style={styles.filterTitle}>Filter by date</Text>
          <View style={styles.filterRow}>
            <TouchableOpacity style={styles.filterField} onPress={() => setYearOpen(true)}>
              <Text style={styles.filterLabel}>Year</Text>
              <View style={styles.filterValueRow}>
                <Text style={styles.filterValue}>
                  {filterYear === 'all' ? 'All' : String(filterYear)}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={18} color={COLORS.lightText} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterField} onPress={() => setMonthOpen(true)}>
              <Text style={styles.filterLabel}>Month</Text>
              <View style={styles.filterValueRow}>
                <Text style={styles.filterValue}>
                  {filterMonth === 'all'
                    ? 'All'
                    : months.find((m) => m.value === filterMonth)?.label || 'All'}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={18} color={COLORS.lightText} />
              </View>
            </TouchableOpacity>
          </View>
          {(filterYear !== 'all' || filterMonth !== 'all') && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                setFilterYear('all');
                setFilterMonth('all');
              }}
            >
              <Text style={styles.clearButtonText}>Clear filters</Text>
            </TouchableOpacity>
          )}
        </View>

        <Animated.View
          style={[
            styles.listWrap,
            {
              opacity: listIn,
              transform: [
                {
                  translateY: listIn.interpolate({
                    inputRange: [0, 1],
                    outputRange: [16, 0],
                  }),
                },
              ],
            },
          ]}
        >
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} />
        ) : !user ? (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons name="account-alert-outline" size={26} color={COLORS.lightText} />
            <Text style={styles.emptyText}>Please sign in to view your history.</Text>
          </View>
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : filteredItems.length === 0 ? (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={26} color={COLORS.lightText} />
            <Text style={styles.emptyText}>
              {items.length === 0 ? 'No records yet. Your history will appear here.' : 'No records match your filter.'}
            </Text>
          </View>
        ) : (
          filteredItems.map((item) => (
            <View key={item.id} style={styles.card}>
                <View style={styles.cardRow}>
                  <View style={styles.cardIcon}>
                    <MaterialCommunityIcons name="sprout" size={18} color={COLORS.primary} />
                  </View>
                  <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>
                    {item.season || 'Season'} - {item.soil_type || 'Soil'}
                  </Text>
                  <Text style={styles.cardSub}>
                    {item.temperature} C - {item.rainfall} mm
                  </Text>
                </View>
                  <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
                    <MaterialCommunityIcons name="trash-can-outline" size={18} color={COLORS.error} />
                  </TouchableOpacity>
                </View>

                <View style={styles.recRow}>
                  {(item.recommendations || []).slice(0, 3).map((rec: any, idx: number) => (
                    <View key={idx} style={styles.recChip}>
                      <Text style={styles.recChipText}>{rec.crop}</Text>
                    </View>
                  ))}
                </View>
                {!!getItemDate(item) && (
                  <Text style={styles.timestampText}>
                    {getItemDate(item)?.toLocaleDateString()}
                  </Text>
                )}
              </View>
            ))
          )}
        </Animated.View>
      </ScrollView>

      <SelectModal
        visible={yearOpen}
        title="Select year"
        onClose={() => setYearOpen(false)}
        options={[
          { label: 'All years', value: 'all' },
          ...years.map((y) => ({ label: String(y), value: y })),
        ]}
        value={filterYear}
        onSelect={(value) => {
          setFilterYear(value as number | 'all');
          setYearOpen(false);
        }}
      />
      <SelectModal
        visible={monthOpen}
        title="Select month"
        onClose={() => setMonthOpen(false)}
        options={[
          { label: 'All months', value: 'all' },
          ...months.map((m) => ({ label: m.label, value: m.value })),
        ]}
        value={filterMonth}
        onSelect={(value) => {
          setFilterMonth(value as number | 'all');
          setMonthOpen(false);
        }}
      />
    </SafeAreaView>
  );
};

type SelectOption = {
  label: string;
  value: number | 'all';
};

const SelectModal = ({
  visible,
  title,
  onClose,
  options,
  value,
  onSelect,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  options: SelectOption[];
  value: number | 'all';
  onSelect: (value: number | 'all') => void;
}) => {
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(slide, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      slide.setValue(0);
    }
  }, [visible, slide]);

  const translateY = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Animated.View style={[styles.modalCard, { transform: [{ translateY }] }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={20} color={COLORS.lightText} />
            </TouchableOpacity>
          </View>
          {options.map((opt) => {
            const selected = opt.value === value;
            return (
              <TouchableOpacity
                key={String(opt.value)}
                style={[styles.modalOption, selected && styles.modalOptionActive]}
                onPress={() => onSelect(opt.value)}
              >
                <Text style={[styles.modalLabel, selected && styles.modalLabelActive]}>{opt.label}</Text>
                {selected && <MaterialCommunityIcons name="check" size={18} color={COLORS.primary} />}
              </TouchableOpacity>
            );
          })}
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 24 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EAF4EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: { flex: 1 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.primary },
  subtitle: { fontSize: 14, color: COLORS.lightText, marginTop: 2 },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  error: { color: COLORS.error, textAlign: 'center', marginTop: 12 },
  emptyBox: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  emptyText: { color: COLORS.lightText, marginTop: 8, textAlign: 'center' },
  filterCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  filterTitle: { fontSize: 14, fontWeight: '700', color: COLORS.secondary, marginBottom: 8 },
  filterRow: { flexDirection: 'row', gap: 10 },
  filterField: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e6e6e6',
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#fbfbfb',
  },
  filterLabel: { fontSize: 12, color: COLORS.lightText, marginBottom: 4 },
  filterValueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  filterValue: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  clearButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#F1F7ED',
    borderWidth: 1,
    borderColor: '#D9E6D1',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  clearButtonText: { fontSize: 12, color: COLORS.secondary, fontWeight: '600' },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#EAF4EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  cardSub: { fontSize: 12, color: COLORS.lightText, marginTop: 2 },
  deleteBtn: { padding: 6 },
  recRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, gap: 6 },
  recChip: {
    backgroundColor: '#F3F4F0',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#e6e6e6',
  },
  recChipText: { fontSize: 11, color: COLORS.text },
  timestampText: { marginTop: 8, color: COLORS.lightText, fontSize: 11 },
  listWrap: {},
  bgAccent: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#E7F2E7',
    right: -80,
    top: -60,
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: 420,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: COLORS.secondary },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ececec',
    backgroundColor: '#fbfbfb',
    marginBottom: 10,
  },
  modalOptionActive: { borderColor: '#CFE4CF', backgroundColor: '#F1F7ED' },
  modalLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  modalLabelActive: { color: COLORS.primary },
});

export default HistoryScreen;
