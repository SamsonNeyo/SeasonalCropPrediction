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
  Platform,
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
import { downloadReport, downloadSingleRecord } from '../utils/reportGenerator';

const HistoryScreen = () => {
  const PAGE_SIZE = 50;
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user, userData } = useAuth();
  const [generatingReport, setGeneratingReport] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
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
    const anim = Animated.stagger(140, [
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
    ]);
    anim.start();
    return () => anim.stop();
  }, [user]); // animated refs are stable — excluded from deps

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

  const toggleExpand = (id: string) =>
    setExpandedId((prev) => (prev === id ? null : id));

  const handleDownloadSingle = async (item: any) => {
    try {
      setDownloadingId(item.id);
      await downloadSingleRecord(item, {
        userName: userData?.name || user?.email?.split('@')[0],
        region: userData?.region || 'Luwero',
        subCounty: userData?.subCounty,
      });
    } catch {
      toast.show({ message: 'Could not generate record.', tone: 'error' });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleGenerateReport = async () => {
    if (filteredItems.length === 0) return;
    try {
      setGeneratingReport(true);
      await downloadReport({
        items: filteredItems,
        userName: userData?.name || user?.email?.split('@')[0],
        region: userData?.region || 'Luwero',
        subCounty: userData?.subCounty,
        filterYear,
        filterSeason,
      });
    } catch {
      toast.show({ message: 'Could not generate report.', tone: 'error' });
    } finally {
      setGeneratingReport(false);
    }
  };

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
          <View style={styles.headerActions}>
            <IconButton
              icon="refresh"
              onPress={loadHistory}
              variant="soft"
              size="md"
              accessibilityLabel="Refresh history"
            />
            {filteredItems.length > 0 && !loading && (
              <IconButton
                icon={generatingReport ? 'loading' : 'file-download-outline'}
                onPress={handleGenerateReport}
                variant="soft"
                size="md"
                accessibilityLabel="Download report"
              />
            )}
          </View>
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
            {summary.shown > 0 && !loading && (
              <TouchableOpacity
                style={styles.reportBtn}
                onPress={handleGenerateReport}
                disabled={generatingReport}
                accessibilityRole="button"
                accessibilityLabel="Download report"
              >
                <MaterialCommunityIcons
                  name={generatingReport ? 'progress-clock' : 'file-download-outline'}
                  size={15}
                  color={colors.primary}
                />
                <Text style={styles.reportBtnText}>
                  {generatingReport ? 'Generating…' : `Download report (${summary.shown})`}
                </Text>
              </TouchableOpacity>
            )}
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
              const isExpanded = expandedId === item.id;
              const recs: any[] = item.recommendations || [];
              const topPlan = recs[0]?.planning;

              return (
                <View key={item.id} style={[styles.card, isExpanded && styles.cardExpanded]}>
                  {/* Tappable header */}
                  <TouchableOpacity
                    onPress={() => toggleExpand(item.id)}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel={isExpanded ? 'Collapse record' : 'Expand record'}
                  >
                    <View style={styles.cardRow}>
                      <View style={styles.cardIcon}>
                        <MaterialCommunityIcons name="sprout" size={18} color={colors.primary} />
                      </View>
                      <View style={styles.cardText}>
                        <Text style={styles.cardTitle}>
                          {item.sub_county || 'Luwero'} · {normalizeSeason(item.season) || 'Season'} Season
                        </Text>
                        <Text style={styles.cardSub}>
                          {item.soil_type || 'Mapped soil'} · {item.temperature ?? '—'}°C · {item.rainfall ?? '—'} mm
                        </Text>
                      </View>
                      <MaterialCommunityIcons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={colors.lightText}
                        style={{ marginLeft: SPACING.xs }}
                      />
                    </View>
                    <View style={styles.recRow}>
                      {recs.slice(0, 3).map((rec: any, idx: number) => (
                        <Chip key={idx} label={rec.crop} size="sm" tone="success" />
                      ))}
                    </View>
                    {!!itemDate && (
                      <Text style={styles.timestampText}>
                        <MaterialCommunityIcons name="clock-outline" size={11} color={colors.lightText} />{' '}
                        {itemDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </Text>
                    )}
                  </TouchableOpacity>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <View style={styles.expandedWrap}>
                      <View style={styles.expandDivider} />

                      {/* All recommendations */}
                      <Text style={styles.expandSection}>All Recommendations</Text>
                      {recs.map((rec: any, idx: number) => {
                        const score = rec.confidence_score ?? rec.confidence;
                        const pct = score == null ? 0 : score > 1 ? Math.round(score) : Math.round(score * 100);
                        return (
                          <View key={idx} style={styles.recDetailRow}>
                            <View style={styles.recRank}>
                              <Text style={styles.recRankText}>{idx + 1}</Text>
                            </View>
                            <View style={styles.recDetailBody}>
                              <View style={styles.recDetailTop}>
                                <Text style={styles.recCropName}>{rec.crop}</Text>
                                <Text style={styles.recConfPct}>{score != null ? `${pct}%` : '—'}</Text>
                              </View>
                              {score != null && (
                                <View style={styles.confBarWrap}>
                                  <View style={[styles.confBarFill, { width: `${pct}%` as any }]} />
                                </View>
                              )}
                              {!!rec.explanation && (
                                <Text style={styles.recExplain}>{rec.explanation}</Text>
                              )}
                            </View>
                          </View>
                        );
                      })}

                      {/* Planting plan */}
                      {!!topPlan && (
                        <View style={styles.planBox}>
                          <Text style={styles.expandSection}>
                            Planting Plan — {recs[0]?.crop}
                          </Text>
                          <View style={styles.planMetaRow}>
                            {!!topPlan.duration_days && (
                              <View style={styles.planMetaItem}>
                                <Text style={styles.planMetaLabel}>Duration</Text>
                                <Text style={styles.planMetaValue}>{topPlan.duration_days} days</Text>
                              </View>
                            )}
                            {!!topPlan.harvest_window && (
                              <View style={styles.planMetaItem}>
                                <Text style={styles.planMetaLabel}>Harvest window</Text>
                                <Text style={styles.planMetaValue}>{topPlan.harvest_window}</Text>
                              </View>
                            )}
                          </View>
                          {(topPlan.planning_actions || []).map((action: string, i: number) => (
                            <View key={i} style={styles.planAction}>
                              <View style={styles.planDot} />
                              <Text style={styles.planActionText}>{action}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {/* Card actions */}
                      <View style={styles.cardActions}>
                        <TouchableOpacity
                          style={styles.cardActionBtn}
                          onPress={() => handleDownloadSingle(item)}
                          disabled={downloadingId === item.id}
                          accessibilityRole="button"
                          accessibilityLabel="Download this record"
                        >
                          <MaterialCommunityIcons
                            name={downloadingId === item.id ? 'progress-clock' : 'file-download-outline'}
                            size={14}
                            color={colors.primary}
                          />
                          <Text style={styles.cardActionBtnText}>
                            {downloadingId === item.id ? 'Generating…' : 'Download record'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.cardActionBtn, styles.cardActionDanger]}
                          onPress={() => confirmDelete(item.id)}
                          accessibilityRole="button"
                          accessibilityLabel="Delete record"
                        >
                          <MaterialCommunityIcons name="trash-can-outline" size={14} color={colors.error} />
                          <Text style={[styles.cardActionBtnText, { color: colors.error }]}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* Collapsed delete button */}
                  {!isExpanded && (
                    <TouchableOpacity
                      style={styles.cardDeleteCorner}
                      onPress={() => confirmDelete(item.id)}
                      accessibilityRole="button"
                      accessibilityLabel="Delete record"
                    >
                      <MaterialCommunityIcons name="trash-can-outline" size={14} color={colors.lightText} />
                    </TouchableOpacity>
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
    headerActions: { flexDirection: 'row', gap: SPACING.sm },
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
    reportBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.xs + 2,
      marginTop: SPACING.md,
      alignSelf: 'flex-start',
      backgroundColor: c.iconBg,
      borderWidth: 1,
      borderColor: c.pillBorder,
      borderRadius: RADIUS.pill,
      paddingVertical: SPACING.xs + 2,
      paddingHorizontal: SPACING.md,
    },
    reportBtnText: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.caption,
      fontWeight: WEIGHT.semibold,
      color: c.primary,
    },
    skel: { gap: SPACING.md },
    card: {
      backgroundColor: c.glass,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: c.glassBorder,
      marginBottom: SPACING.md,
      overflow: 'hidden',
      ...elevation(c.shadow, 'sm'),
    },
    cardExpanded: {
      borderColor: c.primary,
      borderWidth: 1.5,
    },
    cardRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md + 2, paddingTop: SPACING.md + 2 },
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
    recRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: SPACING.sm + 2, gap: 6, paddingHorizontal: SPACING.md + 2 },
    timestampText: {
      fontFamily: FONT_FAMILY,
      paddingHorizontal: SPACING.md + 2,
      paddingBottom: SPACING.md,
      marginTop: SPACING.sm,
      color: c.lightText,
      fontSize: TYPE.tiny,
    },
    cardDeleteCorner: {
      position: 'absolute',
      top: SPACING.sm,
      right: SPACING.sm,
      padding: SPACING.xs + 2,
    },
    // ── Expanded ──
    expandedWrap: { paddingHorizontal: SPACING.md + 2, paddingBottom: SPACING.md + 2 },
    expandDivider: { height: 1, backgroundColor: c.glassBorder, marginVertical: SPACING.md },
    expandSection: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
      fontWeight: WEIGHT.bold,
      color: c.secondary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: SPACING.sm + 2,
    },
    recDetailRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: SPACING.sm,
      marginBottom: SPACING.sm + 2,
    },
    recRank: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: c.pillBg,
      borderWidth: 1,
      borderColor: c.pillBorder,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
      flexShrink: 0,
    },
    recRankText: { fontFamily: FONT_FAMILY, fontSize: 10, fontWeight: WEIGHT.bold, color: c.secondary },
    recDetailBody: { flex: 1 },
    recDetailTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    recCropName: { fontFamily: FONT_FAMILY, fontSize: TYPE.bodySmall, fontWeight: WEIGHT.bold, color: c.text },
    recConfPct: { fontFamily: FONT_FAMILY, fontSize: TYPE.bodySmall, fontWeight: WEIGHT.bold, color: c.primary },
    confBarWrap: {
      height: 5,
      backgroundColor: c.pillBg,
      borderRadius: 3,
      marginTop: 5,
      overflow: 'hidden',
    },
    confBarFill: {
      height: '100%',
      backgroundColor: c.primary,
      borderRadius: 3,
    },
    recExplain: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
      color: c.lightText,
      marginTop: 4,
      lineHeight: 16,
    },
    planBox: { marginTop: SPACING.md },
    planMetaRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.sm + 2 },
    planMetaItem: { flex: 1 },
    planMetaLabel: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
      color: c.lightText,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    planMetaValue: { fontFamily: FONT_FAMILY, fontSize: TYPE.bodySmall, fontWeight: WEIGHT.semibold, color: c.text, marginTop: 2 },
    planAction: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, marginBottom: SPACING.xs + 2 },
    planDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: c.secondary, marginTop: 6, flexShrink: 0 },
    planActionText: { fontFamily: FONT_FAMILY, fontSize: TYPE.caption, color: c.lightText, flex: 1, lineHeight: 18 },
    cardActions: {
      flexDirection: 'row',
      gap: SPACING.sm,
      marginTop: SPACING.md + 2,
      paddingTop: SPACING.md,
      borderTopWidth: 1,
      borderTopColor: c.glassBorder,
    },
    cardActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.xs + 2,
      backgroundColor: c.iconBg,
      borderWidth: 1,
      borderColor: c.pillBorder,
      borderRadius: RADIUS.pill,
      paddingVertical: SPACING.xs + 2,
      paddingHorizontal: SPACING.md,
    },
    cardActionDanger: { borderColor: `${c.error}40`, backgroundColor: `${c.error}08` },
    cardActionBtnText: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.caption,
      fontWeight: WEIGHT.semibold,
      color: c.primary,
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
