import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Easing,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useScrollToTop } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../constants/colors';
import { FONT_FAMILY, TYPE, WEIGHT } from '../constants/typography';
import { RADIUS, SPACING } from '../constants/spacing';
import { elevation } from '../constants/elevation';
import { deleteHistoryItem, getUserHistory } from '../services/firestore';
import { QueryDocumentSnapshot } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import Card from '../components/Card';
import Chip from '../components/Chip';
import Button from '../components/Button';
import IconButton from '../components/IconButton';
import EmptyState from '../components/EmptyState';
import Skeleton, { SkeletonGroup } from '../components/Skeleton';
import SelectSheet, { SelectOption } from '../components/SelectSheet';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';

const HistoryScreen = () => {
  const PAGE_SIZE = 50;
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cursor, setCursor] = useState<QueryDocumentSnapshot | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [yearOpen, setYearOpen] = useState(false);
  const [seasonOpen, setSeasonOpen] = useState(false);
  const [filterYear, setFilterYear] = useState<number | 'all'>('all');
  const [filterSeason, setFilterSeason] = useState<'all' | 'First' | 'Second'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const headerIn = useRef(new Animated.Value(0)).current;
  const listIn = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);

  useScrollToTop(scrollRef);

  const loadHistory = async () => {
    try {
      setError('');
      setLoading(true);
      if (!user) {
        setItems([]);
        setCursor(null);
        setHasMore(false);
        return;
      }
      const { items: data, lastDoc } = await getUserHistory({ limitCount: PAGE_SIZE });
      setItems(data || []);
      setCursor(lastDoc);
      setHasMore((data || []).length >= PAGE_SIZE);
    } catch (e: any) {
      const msg = e?.code || e?.message || 'Could not load history.';
      setError(`Could not load history: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setDeleting(true);
      await deleteHistoryItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.show({ message: 'Record deleted.', tone: 'success' });
    } catch (e: any) {
      const msg = e?.code || e?.message || 'Delete failed.';
      toast.show({ message: `Could not delete: ${msg}`, tone: 'error' });
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
      setPendingDeleteId(null);
    }
  };

  const confirmDelete = (id: string) => {
    setPendingDeleteId(id);
    setConfirmOpen(true);
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadHistory();
    } finally {
      setRefreshing(false);
    }
  };

  const handleLoadMore = async () => {
    if (!user || loadingMore || !hasMore) return;
    try {
      setLoadingMore(true);
      const { items: data, lastDoc } = await getUserHistory({
        limitCount: PAGE_SIZE,
        startAfterDoc: cursor || undefined,
      });
      setItems((prev) => prev.concat(data || []));
      setCursor(lastDoc);
      if (!data || data.length < PAGE_SIZE) setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
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
    const ts = item?.createdAt ?? item?.timestamp;
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

  useEffect(() => {
    if (filterYear !== 'all') return;
    if (years.length === 0) return;
    const currentYear = new Date().getFullYear();
    if (years.includes(currentYear)) {
      setFilterYear(currentYear);
    }
  }, [years, filterYear]);

  const months = [
    { value: 'First' as const, label: 'First Season' },
    { value: 'Second' as const, label: 'Second Season' },
  ];

  const normalizeSeason = (value: any): 'First' | 'Second' | null => {
    const raw = String(value || '').trim().toLowerCase();
    if (raw === '1' || raw.includes('first')) return 'First';
    if (raw === '2' || raw.includes('second')) return 'Second';
    return null;
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filterYear === 'all' && filterSeason === 'all') return true;
      const d = getItemDate(item);
      if (!d) return false;
      if (filterYear !== 'all' && d.getFullYear() !== filterYear) return false;
      if (filterSeason !== 'all' && normalizeSeason(item?.season) !== filterSeason) return false;
      return true;
    });
  }, [items, filterSeason, filterYear]);

  const summary = useMemo(() => {
    const total = items.length;
    const shown = filteredItems.length;
    const hidden = Math.max(total - shown, 0);
    return { total, shown, hidden };
  }, [filteredItems, items.length]);

  const yearOptions: SelectOption<number | 'all'>[] = useMemo(
    () => [
      { label: 'All years', value: 'all' as const },
      ...years.map((y) => ({ label: String(y), value: y })),
    ],
    [years],
  );

  const seasonOptions: SelectOption<'all' | 'First' | 'Second'>[] = [
    { label: 'All seasons', value: 'all' },
    ...months.map((m) => ({ label: m.label, value: m.value })),
  ];

  const filtersActive = filterYear !== 'all' || filterSeason !== 'all';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.bgAccent} />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        <Animated.View
          style={[
            styles.header,
            {
              opacity: headerIn,
              transform: [
                { translateY: headerIn.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
              ],
            },
          ]}
        >
          <View style={styles.headerIcon}>
            <MaterialCommunityIcons name="history" size={24} color={colors.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>History</Text>
            <Text style={styles.subtitle}>Your recent predictions and manual analyses</Text>
          </View>
          <IconButton
            icon="refresh"
            onPress={loadHistory}
            variant="soft"
            size="md"
            accessibilityLabel="Refresh history"
          />
        </Animated.View>

        <Card variant="glass" padding="lg" emphasis="md" style={styles.filterCard}>
          <Text style={styles.filterTitle}>Filter</Text>
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={styles.filterField}
              onPress={() => setYearOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={`Year filter, currently ${filterYear === 'all' ? 'all years' : filterYear}`}
            >
              <Text style={styles.filterLabel}>Year</Text>
              <View style={styles.filterValueRow}>
                <Text style={styles.filterValue}>{filterYear === 'all' ? 'All' : String(filterYear)}</Text>
                <MaterialCommunityIcons name="chevron-down" size={18} color={colors.lightText} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.filterField}
              onPress={() => setSeasonOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={`Season filter, currently ${filterSeason === 'all' ? 'all seasons' : filterSeason}`}
            >
              <Text style={styles.filterLabel}>Season</Text>
              <View style={styles.filterValueRow}>
                <Text style={styles.filterValue}>
                  {filterSeason === 'all'
                    ? 'All'
                    : months.find((m) => m.value === filterSeason)?.label || 'All'}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={18} color={colors.lightText} />
              </View>
            </TouchableOpacity>
          </View>
          {filtersActive && (
            <Button
              label="Clear filters"
              variant="ghost"
              size="sm"
              onPress={() => {
                setFilterYear('all');
                setFilterSeason('all');
              }}
              leftIcon={<MaterialCommunityIcons name="filter-remove-outline" size={14} color={colors.secondary} />}
              style={styles.clearBtn}
              accessibilityLabel="Clear filters"
            />
          )}
        </Card>

        <View style={styles.summaryWrap}>
          <View style={styles.summaryHeroCard}>
            <View style={styles.summaryHeroTop}>
              <Text style={styles.summaryHeroLabel}>Showing</Text>
              <Chip
                label={filtersActive ? 'Filters active' : 'No filters'}
                tone={filtersActive ? 'info' : 'neutral'}
                size="sm"
                icon={filtersActive ? 'filter-variant' : 'filter-outline'}
              />
            </View>
            <Text style={styles.summaryHeroValue}>
              {summary.shown} <Text style={styles.summaryHeroSub}>of {summary.total}</Text>
            </Text>
            <Text style={styles.summaryHeroHint}>
              {summary.hidden > 0
                ? `${summary.hidden} record${summary.hidden === 1 ? '' : 's'} hidden by current filters`
                : 'All records are currently shown'}
            </Text>
          </View>
        </View>

        <Animated.View
          style={[
            styles.listWrap,
            {
              opacity: listIn,
              transform: [
                { translateY: listIn.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
              ],
            },
          ]}
        >
          {loading ? (
            <SkeletonGroup style={styles.skel}>
              <Skeleton height={108} borderRadius={RADIUS.lg} />
              <Skeleton height={108} borderRadius={RADIUS.lg} />
              <Skeleton height={108} borderRadius={RADIUS.lg} />
            </SkeletonGroup>
          ) : !user ? (
            <EmptyState
              icon="account-alert-outline"
              title="Sign in to see your history"
              description="Your saved predictions and analyses will appear here once you sign in."
            />
          ) : error ? (
            <EmptyState
              icon="cloud-off-outline"
              variant="error"
              title="Could not load history"
              description={error}
              actionLabel="Try again"
              onAction={loadHistory}
            />
          ) : filteredItems.length === 0 ? (
            <EmptyState
              icon={items.length === 0 ? 'clipboard-text-outline' : 'filter-variant-remove'}
              title={items.length === 0 ? 'No records yet' : 'No records match your filter'}
              description={
                items.length === 0
                  ? 'Run an analysis from Home or Manual analysis to start building your history.'
                  : 'Try clearing filters to see all records.'
              }
              actionLabel={items.length === 0 ? undefined : 'Clear filters'}
              onAction={
                items.length === 0
                  ? undefined
                  : () => {
                      setFilterYear('all');
                      setFilterSeason('all');
                    }
              }
            />
          ) : (
            filteredItems.map((item) => {
              const itemDate = getItemDate(item);
              return (
                <View key={item.id} style={styles.card}>
                  <View style={styles.cardRow}>
                    <View style={styles.cardIcon}>
                      <MaterialCommunityIcons name="sprout" size={18} color={colors.primary} />
                    </View>
                    <View style={styles.cardText}>
                      <Text style={styles.cardTitle}>
                        {item.sub_county || 'Luwero'} · {normalizeSeason(item.season) || 'Season'}
                      </Text>
                      <Text style={styles.cardSub}>
                        {item.soil_type || 'Mapped soil'} · {item.temperature ?? '—'}°C · {item.rainfall ?? '—'} mm
                      </Text>
                    </View>
                    <IconButton
                      icon="trash-can-outline"
                      onPress={() => confirmDelete(item.id)}
                      variant="danger"
                      size="sm"
                      accessibilityLabel="Delete record"
                    />
                  </View>

                  <View style={styles.recRow}>
                    {(item.recommendations || []).slice(0, 3).map((rec: any, idx: number) => (
                      <Chip key={idx} label={rec.crop} size="sm" tone="success" />
                    ))}
                  </View>
                  {!!itemDate && (
                    <Text style={styles.timestampText}>
                      <MaterialCommunityIcons name="clock-outline" size={11} color={colors.lightText} />{' '}
                      {itemDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </Text>
                  )}
                </View>
              );
            })
          )}

          {hasMore && items.length > 0 && !loading && !error && (
            <Button
              label={loadingMore ? 'Loading…' : 'Load more'}
              variant="tertiary"
              size="sm"
              onPress={handleLoadMore}
              loading={loadingMore}
              style={styles.loadMoreBtn}
              accessibilityLabel="Load more history"
            />
          )}
        </Animated.View>
      </ScrollView>

      <SelectSheet
        visible={yearOpen}
        onClose={() => setYearOpen(false)}
        title="Filter by year"
        options={yearOptions}
        value={filterYear}
        onSelect={(value) => {
          setFilterYear(value as number | 'all');
          setYearOpen(false);
        }}
      />
      <SelectSheet
        visible={seasonOpen}
        onClose={() => setSeasonOpen(false)}
        title="Filter by season"
        options={seasonOptions}
        value={filterSeason}
        onSelect={(value) => {
          setFilterSeason(value as 'all' | 'First' | 'Second');
          setSeasonOpen(false);
        }}
      />
      <ConfirmDialog
        visible={confirmOpen}
        title="Delete this record?"
        message="This will remove the record from your history. This cannot be undone."
        onCancel={() => {
          setConfirmOpen(false);
          setPendingDeleteId(null);
        }}
        onConfirm={() => {
          if (pendingDeleteId) handleDelete(pendingDeleteId);
        }}
        confirmLabel="Delete"
        destructive
        loading={deleting}
        icon="trash-can-outline"
      />
    </SafeAreaView>
  );
};

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.lg },
    headerIcon: {
      width: 44,
      height: 44,
      borderRadius: RADIUS.md,
      backgroundColor: c.iconBg,
      borderWidth: 1,
      borderColor: c.pillBorder,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: SPACING.md,
    },
    headerText: { flex: 1 },
    title: { fontFamily: FONT_FAMILY, fontSize: TYPE.title, fontWeight: WEIGHT.bold, color: c.primary },
    subtitle: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.bodySmall,
      color: c.lightText,
      marginTop: 2,
      lineHeight: 18,
    },
    filterCard: { marginBottom: SPACING.md },
    filterTitle: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.caption,
      fontWeight: WEIGHT.semibold,
      color: c.lightText,
      marginBottom: SPACING.sm,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    filterRow: { flexDirection: 'row', gap: SPACING.sm + 2 },
    filterField: {
      flex: 1,
      borderWidth: 1,
      borderColor: c.glassBorder,
      borderRadius: RADIUS.md,
      padding: SPACING.md - 2,
      backgroundColor: c.glassSoft,
    },
    filterLabel: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
      color: c.lightText,
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    filterValueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    filterValue: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.bodySmall,
      fontWeight: WEIGHT.semibold,
      color: c.text,
    },
    clearBtn: { alignSelf: 'flex-start', marginTop: SPACING.sm, paddingHorizontal: 0 },
    summaryWrap: { marginBottom: SPACING.md, gap: SPACING.sm },
    summaryHeroCard: {
      backgroundColor: c.pillBg,
      borderRadius: RADIUS.md + 2,
      borderWidth: 1,
      borderColor: c.pillBorder,
      paddingVertical: SPACING.md - 2,
      paddingHorizontal: SPACING.md - 1,
    },
    summaryHeroTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    summaryHeroLabel: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.caption,
      color: c.secondary,
      fontWeight: WEIGHT.semibold,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    summaryHeroValue: {
      marginTop: 8,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.h2,
      color: c.primary,
      fontWeight: WEIGHT.bold,
    },
    summaryHeroSub: {
      fontSize: TYPE.bodySmall,
      color: c.secondary,
      fontWeight: WEIGHT.semibold,
    },
    summaryHeroHint: {
      marginTop: 2,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.caption,
      color: c.lightText,
    },
    skel: { gap: SPACING.md },
    card: {
      backgroundColor: c.glass,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: c.glassBorder,
      padding: SPACING.md + 2,
      marginBottom: SPACING.md,
      ...elevation(c.shadow, 'sm'),
    },
    cardRow: { flexDirection: 'row', alignItems: 'center' },
    cardIcon: {
      width: 36,
      height: 36,
      borderRadius: RADIUS.md - 2,
      backgroundColor: c.iconBg,
      borderWidth: 1,
      borderColor: c.pillBorder,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: SPACING.sm + 2,
    },
    cardText: { flex: 1 },
    cardTitle: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.body,
      fontWeight: WEIGHT.semibold,
      color: c.text,
    },
    cardSub: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.caption,
      color: c.lightText,
      marginTop: 3,
    },
    recRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: SPACING.sm + 2, gap: 6 },
    timestampText: {
      fontFamily: FONT_FAMILY,
      marginTop: SPACING.sm,
      color: c.lightText,
      fontSize: TYPE.tiny,
    },
    listWrap: {},
    loadMoreBtn: { marginTop: 4, alignSelf: 'center' },
    bgAccent: {
      position: 'absolute',
      width: 240,
      height: 240,
      borderRadius: 120,
      backgroundColor: c.iconBg,
      right: -80,
      top: -60,
      opacity: 0.5,
    },
  });

export default HistoryScreen;
