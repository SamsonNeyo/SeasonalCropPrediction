import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useScrollToTop } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../constants/colors';
import { getAIAdvice } from '../services/openai';
import { FONT_FAMILY, TYPE, WEIGHT } from '../constants/typography';
import { RADIUS, SPACING } from '../constants/spacing';
import { elevation } from '../constants/elevation';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';

const webNoOutline = { outlineStyle: 'none', outlineWidth: 0 } as any;

const getCurrentSeason = () => {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 6) return 'First';
  if (month >= 8 && month <= 12) return 'Second';
  return 'First';
};

type Section = {
  heading?: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  body: Array<{ type: 'p'; text: string } | { type: 'li'; text: string }>;
};

const SECTION_PATTERNS: Array<{ test: RegExp; icon: Section['icon']; label: string }> = [
  { test: /^short answer\b/i, icon: 'lightbulb-on-outline', label: 'Short answer' },
  { test: /^what it means\b/i, icon: 'information-outline', label: 'What it means' },
  { test: /^recommended actions?\b/i, icon: 'check-decagram-outline', label: 'Recommended actions' },
  { test: /^next steps?\b/i, icon: 'arrow-right-circle-outline', label: 'Next step' },
  { test: /^watch out\b/i, icon: 'alert-decagram-outline', label: 'Watch out' },
  { test: /^summary\b/i, icon: 'text-box-outline', label: 'Summary' },
  { test: /^tips?\b/i, icon: 'star-four-points-outline', label: 'Tips' },
];

const stripBold = (text: string) => text.replace(/\*\*(.+?)\*\*/g, '$1');

const splitKnownHeading = (text: string) => {
  const cleaned = stripBold(text.replace(/^#{1,6}\s*/, '')).trim();
  for (const pattern of SECTION_PATTERNS) {
    const match = cleaned.match(pattern.test);
    if (!match) continue;
    const rest = cleaned.slice(match[0].length).replace(/^[:\-]\s*/, '').trim();
    return { pattern, rest };
  }
  return null;
};

const parseAdvisorResponse = (raw: string): Section[] => {
  const lines = raw.split(/\r?\n/);
  const sections: Section[] = [];
  let current: Section | null = null;

  const ensureCurrent = (heading?: string, icon: Section['icon'] = 'text-box-outline') => {
    if (!current) {
      current = { heading, icon, body: [] };
      sections.push(current);
    }
    return current;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const headingMatch = splitKnownHeading(line);
    if (headingMatch) {
      current = { heading: headingMatch.pattern.label, icon: headingMatch.pattern.icon, body: [] };
      sections.push(current);
      if (headingMatch.rest) {
        current.body.push({ type: 'p', text: headingMatch.rest });
      }
      continue;
    }

    // Detect bullets
    if (/^[-*•·]\s+/.test(line) || /^\d+[\.\)]\s+/.test(line)) {
      const text = stripBold(line.replace(/^[-*•·]\s+/, '').replace(/^\d+[\.\)]\s+/, ''));
      ensureCurrent().body.push({ type: 'li', text });
      continue;
    }

    // Paragraph
    ensureCurrent().body.push({ type: 'p', text: stripBold(line) });
  }

  return sections.length ? sections : [{ icon: 'text-box-outline', body: [{ type: 'p', text: stripBold(raw) }] }];
};

const TypingDots = ({ colors }: { colors: ThemeColors }) => {
  const dotOne = useRef(new Animated.Value(0)).current;
  const dotTwo = useRef(new Animated.Value(0)).current;
  const dotThree = useRef(new Animated.Value(0)).current;
  const dots = useMemo(() => [dotOne, dotTwo, dotThree], [dotOne, dotTwo, dotThree]);

  useEffect(() => {
    const loops = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(dot, { toValue: 1, duration: 420, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 420, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.delay(160),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [dots]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4 }}>
      {dots.map((dot, idx) => (
        <Animated.View
          key={idx}
          style={{
            width: 7,
            height: 7,
            borderRadius: 4,
            backgroundColor: colors.primary,
            opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] }),
            transform: [
              { translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) },
            ],
          }}
        />
      ))}
    </View>
  );
};

const AIAdvisorScreen = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { userData } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [lastQuestion, setLastQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState(false);
  const headerIn = useRef(new Animated.Value(0)).current;
  const inputIn = useRef(new Animated.Value(0)).current;
  const answerIn = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);

  useScrollToTop(scrollRef);

  useEffect(() => {
    Animated.stagger(120, [
      Animated.timing(headerIn, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(inputIn, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [headerIn, inputIn]);

  useEffect(() => {
    if (answer || loading || error) {
      answerIn.setValue(0);
      Animated.timing(answerIn, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }
  }, [answer, loading, error, answerIn]);

  const season = getCurrentSeason();
  const subCounty = userData?.subCounty || 'Bamunanika';
  const soilType = userData?.soilType || 'Clay Loam';

  const QUICK_PROMPTS = useMemo(
    () => [
      {
        icon: 'sprout-outline' as const,
        label: 'Best crops this season',
        prompt: `Best crops for the ${season.toLowerCase()} season in ${subCounty}, Luwero District.`,
      },
      {
        icon: 'calendar-week-outline' as const,
        label: 'Weekly farm plan',
        prompt: `Give a weekly farm plan for ${subCounty} in ${season} Season (${soilType} soil).`,
      },
      {
        icon: 'bug-outline' as const,
        label: 'Pest watch & control',
        prompt: `Top pests to watch in ${subCounty} during ${season} Season and control steps.`,
      },
      {
        icon: 'basket-outline' as const,
        label: 'Harvest & selling',
        prompt: `When should farmers in ${subCounty} prepare for harvest and selling in ${season} Season?`,
      },
      {
        icon: 'water-outline' as const,
        label: 'Irrigation guidance',
        prompt: `Best irrigation practices for ${soilType} soil in ${subCounty} during ${season} Season.`,
      },
      {
        icon: 'cash' as const,
        label: 'Cost-saving tips',
        prompt: `How can a smallholder farmer in ${subCounty} reduce input costs this ${season.toLowerCase()} season?`,
      },
    ],
    [season, subCounty, soilType],
  );

  const handleAsk = async (overridePrompt?: string) => {
    const q = (overridePrompt ?? prompt).trim();
    if (!q) return;
    setError('');
    setLoading(true);
    setAnswer('');
    setLastQuestion(q);
    if (overridePrompt) setPrompt(overridePrompt);
    try {
      const reply = await getAIAdvice(q, {
        subCounty,
        soilType,
        season: `${season} Season`,
      });
      setAnswer(reply);
    } catch (e: any) {
      setError(e?.message || 'Could not reach the advisor right now.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setPrompt('');
    setAnswer('');
    setLastQuestion('');
    setError('');
  };

  const sections = useMemo(() => (answer ? parseAdvisorResponse(answer) : []), [answer]);
  const hasConversation = !!lastQuestion || loading || !!answer || !!error;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.bgAccent} />
      <View style={styles.bgAccentTwo} />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: headerIn,
              transform: [{ translateY: headerIn.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
            },
          ]}
        >
          <View style={styles.headerIcon}>
            <MaterialCommunityIcons name="brain" size={22} color={colors.primary} />
            <View style={styles.headerIconDot} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>AI Advisor</Text>
            <Text style={styles.subtitle}>Decision support for your next farm action</Text>
          </View>
          <View style={styles.onlineChip}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineChipText}>Online</Text>
          </View>
        </Animated.View>

        {/* ── Context strip ──────────────────────────────────── */}
        <View style={styles.contextStrip}>
          <View style={styles.contextItem}>
            <MaterialCommunityIcons name="map-marker-radius-outline" size={14} color={colors.primary} />
            <View style={styles.contextItemTextWrap}>
              <Text style={styles.contextItemLabel}>Sub-county</Text>
              <Text style={styles.contextItemValue} numberOfLines={1}>{subCounty}</Text>
            </View>
          </View>
          <View style={styles.contextDivider} />
          <View style={styles.contextItem}>
            <MaterialCommunityIcons name="terrain" size={14} color={colors.primary} />
            <View style={styles.contextItemTextWrap}>
              <Text style={styles.contextItemLabel}>Soil</Text>
              <Text style={styles.contextItemValue} numberOfLines={1}>{soilType}</Text>
            </View>
          </View>
          <View style={styles.contextDivider} />
          <View style={styles.contextItem}>
            <MaterialCommunityIcons name="leaf-circle-outline" size={14} color={colors.primary} />
            <View style={styles.contextItemTextWrap}>
              <Text style={styles.contextItemLabel}>Season</Text>
              <Text style={styles.contextItemValue} numberOfLines={1}>{season}</Text>
            </View>
          </View>
        </View>

        {/* ── Suggested prompts (horizontal scroll) ──────────── */}
        <View style={styles.suggestSection}>
          <View style={styles.suggestHead}>
            <View style={styles.sectionDot} />
            <Text style={styles.sectionLabel}>Quick starters</Text>
            <View style={styles.sectionLine} />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestRow}
          >
            {QUICK_PROMPTS.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={styles.suggestChip}
                onPress={() => handleAsk(item.prompt)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={item.label}
              >
                <View style={styles.suggestChipIcon}>
                  <MaterialCommunityIcons name={item.icon} size={16} color={colors.primary} />
                </View>
                <Text style={styles.suggestChipText} numberOfLines={2}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── Composer ───────────────────────────────────────── */}
        <Animated.View
          style={{
            opacity: inputIn,
            transform: [{ translateY: inputIn.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
          }}
        >
          <View style={[styles.composer, focused && styles.composerFocused]}>
            <View style={styles.composerHead}>
              <MaterialCommunityIcons name="message-text-outline" size={14} color={colors.lightText} />
              <Text style={styles.composerLabel}>Your question</Text>
              {!!prompt && (
                <TouchableOpacity
                  onPress={() => setPrompt('')}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel="Clear question"
                >
                  <MaterialCommunityIcons name="close-circle" size={16} color={colors.lightText} />
                </TouchableOpacity>
              )}
            </View>
            <TextInput
              style={[styles.input, Platform.OS === 'web' ? webNoOutline : null]}
              placeholder="What would you like to know about your farm today?"
              placeholderTextColor={colors.lightText}
              value={prompt}
              onChangeText={setPrompt}
              multiline
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              accessibilityLabel="Question for AI advisor"
            />

            <Button
              label={loading ? 'AI is thinking...' : 'Ask advisor'}
              onPress={() => handleAsk()}
              loading={loading}
              disabled={!prompt.trim() && !loading}
              fullWidth
              size="lg"
              leftIcon={!loading ? <MaterialCommunityIcons name="star-four-points" size={18} color={colors.white} /> : undefined}
              style={styles.askBtn}
              accessibilityLabel="Ask AI advisor"
            />
          </View>
        </Animated.View>

        {/* ── Conversation area ──────────────────────────────── */}
        {hasConversation ? (
          <Animated.View
            style={[
              styles.conversation,
              {
                opacity: answerIn,
                transform: [{ translateY: answerIn.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
              },
            ]}
          >
            <View style={styles.convoHeadRow}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionLabel}>Conversation</Text>
              <View style={styles.sectionLine} />
              {!!(answer || error) && (
                <TouchableOpacity onPress={handleClear} hitSlop={6} accessibilityRole="button" accessibilityLabel="Clear conversation">
                  <Text style={styles.clearLink}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>

            {!!lastQuestion && (
              <View style={styles.userMessage}>
                <View style={styles.userAvatar}>
                  <MaterialCommunityIcons name="account" size={16} color={colors.secondary} />
                </View>
                <View style={styles.userBubble}>
                  <Text style={styles.userMessageLabel}>You asked</Text>
                  <Text style={styles.userMessageText}>{lastQuestion}</Text>
                </View>
              </View>
            )}

            {loading ? (
              <View style={styles.aiMessage}>
                <View style={styles.aiAvatar}>
                  <MaterialCommunityIcons name="brain" size={16} color={colors.primary} />
                </View>
                <View style={styles.aiBubble}>
                  <View style={styles.aiHeaderRow}>
                    <Text style={styles.aiName}>SmartCrop AI</Text>
                    <View style={styles.aiBadge}>
                      <Text style={styles.aiBadgeText}>Thinking</Text>
                    </View>
                  </View>
                  <Text style={styles.thinkingHint}>Analyzing your farm context…</Text>
                  <TypingDots colors={colors} />
                </View>
              </View>
            ) : error ? (
              <View style={styles.aiMessage}>
                <View style={styles.aiAvatar}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={16} color={colors.error} />
                </View>
                <View style={[styles.aiBubble, styles.aiBubbleError]}>
                  <View style={styles.aiHeaderRow}>
                    <Text style={styles.aiName}>SmartCrop AI</Text>
                    <View style={[styles.aiBadge, styles.aiBadgeError]}>
                      <Text style={[styles.aiBadgeText, styles.aiBadgeTextError]}>Error</Text>
                    </View>
                  </View>
                  <Text style={styles.errorText}>{error}</Text>
                  <TouchableOpacity
                    onPress={() => handleAsk(lastQuestion)}
                    style={styles.retryBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Retry question"
                  >
                    <MaterialCommunityIcons name="refresh" size={14} color={colors.primary} />
                    <Text style={styles.retryText}>Try again</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : answer ? (
              <View style={styles.aiMessage}>
                <View style={styles.aiAvatar}>
                  <MaterialCommunityIcons name="brain" size={16} color={colors.primary} />
                </View>
                <View style={styles.aiBubble}>
                  <View style={styles.aiHeaderRow}>
                    <Text style={styles.aiName}>SmartCrop AI</Text>
                    <View style={styles.aiBadge}>
                      <MaterialCommunityIcons name="check" size={10} color={colors.primary} />
                      <Text style={styles.aiBadgeText}>Reply</Text>
                    </View>
                  </View>
                  {sections.map((section, idx) => (
                    <View key={`sec-${idx}`} style={[styles.section, idx > 0 && styles.sectionWithDivider]}>
                      {!!section.heading && (
                        <View style={styles.sectionHeaderRow}>
                          <View style={styles.sectionIconWrap}>
                            <MaterialCommunityIcons name={section.icon} size={13} color={colors.primary} />
                          </View>
                          <Text style={styles.sectionHeading}>{section.heading}</Text>
                        </View>
                      )}
                      {section.body.map((b, bIdx) =>
                        b.type === 'li' ? (
                          <View key={`b-${bIdx}`} style={styles.bulletRow}>
                            <View style={styles.bulletDot}>
                              <View style={styles.bulletDotInner} />
                            </View>
                            <Text style={styles.bulletText}>{b.text}</Text>
                          </View>
                        ) : (
                          <Text key={`b-${bIdx}`} style={styles.paragraph}>{b.text}</Text>
                        ),
                      )}
                    </View>
                  ))}
                  <View style={styles.aiFooter}>
                    <View style={styles.aiFooterLeft}>
                      <MaterialCommunityIcons name="shield-check-outline" size={11} color={colors.lightText} />
                      <Text style={styles.disclaimer}>AI guidance — verify with local experts.</Text>
                    </View>
                  </View>
                </View>
              </View>
            ) : null}
          </Animated.View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <MaterialCommunityIcons name="brain" size={32} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Ask anything about your farm</Text>
            <Text style={styles.emptyDesc}>
              Pick a quick starter above or type your own question. Answers are tailored to your sub-county, soil and season.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: SPACING.lg, paddingBottom: SPACING.huge },

    // ── Header ──
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
      marginBottom: SPACING.lg,
    },
    headerIcon: {
      width: 46,
      height: 46,
      borderRadius: RADIUS.md + 1,
      backgroundColor: c.iconBg,
      borderWidth: 1,
      borderColor: c.pillBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerIconDot: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: c.primary,
      borderWidth: 2,
      borderColor: c.glass,
    },
    headerText: { flex: 1, minWidth: 0 },
    title: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.title,
      fontWeight: WEIGHT.bold,
      color: c.primary,
      letterSpacing: 0.2,
    },
    subtitle: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.bodySmall,
      color: c.lightText,
      marginTop: 2,
    },
    onlineChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: c.pillBg,
      borderWidth: 1,
      borderColor: c.pillBorder,
      borderRadius: RADIUS.pill,
      paddingVertical: 4,
      paddingHorizontal: 8,
    },
    onlineDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: c.primary,
    },
    onlineChipText: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
      color: c.primary,
      fontWeight: WEIGHT.bold,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },

    // ── Context strip ──
    contextStrip: {
      flexDirection: 'row',
      alignItems: 'stretch',
      backgroundColor: c.glass,
      borderWidth: 1,
      borderColor: c.glassBorder,
      borderRadius: RADIUS.md,
      paddingVertical: SPACING.sm + 2,
      paddingHorizontal: SPACING.sm + 2,
      marginBottom: SPACING.lg,
      ...elevation(c.shadow, 'sm'),
    },
    contextItem: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      paddingHorizontal: 6,
    },
    contextItemTextWrap: { flex: 1, minWidth: 0 },
    contextItemLabel: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
      color: c.lightText,
      fontWeight: WEIGHT.semibold,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    contextItemValue: {
      marginTop: 1,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.caption,
      color: c.text,
      fontWeight: WEIGHT.bold,
    },
    contextDivider: {
      width: 1,
      alignSelf: 'stretch',
      marginVertical: 2,
      backgroundColor: c.border,
      opacity: 0.6,
    },

    // ── Suggested prompts ──
    suggestSection: { marginBottom: SPACING.lg },
    suggestHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      marginBottom: SPACING.sm + 2,
    },
    sectionDot: {
      width: 6,
      height: 6,
      borderRadius: RADIUS.pill,
      backgroundColor: c.primary,
    },
    sectionLabel: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
      color: c.secondary,
      fontWeight: WEIGHT.bold,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    sectionLine: {
      flex: 1,
      height: 1,
      backgroundColor: c.border,
      opacity: 0.6,
    },
    suggestRow: {
      gap: SPACING.sm,
      paddingHorizontal: 2,
      paddingVertical: 2,
    },
    suggestChip: {
      width: 138,
      flexDirection: 'column',
      gap: SPACING.sm,
      backgroundColor: c.glass,
      borderWidth: 1,
      borderColor: c.glassBorder,
      borderRadius: RADIUS.md,
      paddingVertical: SPACING.md - 2,
      paddingHorizontal: SPACING.md - 2,
      ...elevation(c.shadow, 'sm'),
    },
    suggestChipIcon: {
      width: 32,
      height: 32,
      borderRadius: RADIUS.sm + 2,
      backgroundColor: c.pillBg,
      borderWidth: 1,
      borderColor: c.pillBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    suggestChipText: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.caption,
      color: c.text,
      fontWeight: WEIGHT.semibold,
      lineHeight: 17,
    },

    // ── Composer ──
    composer: {
      backgroundColor: c.glass,
      borderWidth: 1,
      borderColor: c.glassBorder,
      borderRadius: RADIUS.lg,
      padding: SPACING.md + 2,
      ...elevation(c.shadow, 'md'),
    },
    composerFocused: {
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    composerHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: SPACING.sm,
    },
    composerLabel: {
      flex: 1,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
      color: c.lightText,
      fontWeight: WEIGHT.semibold,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    input: {
      minHeight: 88,
      paddingHorizontal: 2,
      paddingVertical: SPACING.sm,
      color: c.text,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.body,
      textAlignVertical: 'top',
    },
    askBtn: { marginTop: SPACING.md - 2 },

    // ── Conversation ──
    conversation: { marginTop: SPACING.xl },
    convoHeadRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      marginBottom: SPACING.md,
    },
    clearLink: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
      color: c.secondary,
      fontWeight: WEIGHT.bold,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    userMessage: {
      flexDirection: 'row',
      gap: SPACING.sm + 2,
      marginBottom: SPACING.md,
    },
    userAvatar: {
      width: 32,
      height: 32,
      borderRadius: RADIUS.pill,
      backgroundColor: c.iconBg,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    userBubble: {
      flex: 1,
      backgroundColor: c.surfaceAlt,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: RADIUS.lg,
      paddingVertical: SPACING.sm + 2,
      paddingHorizontal: SPACING.md,
    },
    userMessageLabel: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
      color: c.lightText,
      fontWeight: WEIGHT.semibold,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    userMessageText: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.bodySmall,
      color: c.text,
      lineHeight: 20,
      fontWeight: WEIGHT.semibold,
    },
    aiMessage: {
      flexDirection: 'row',
      gap: SPACING.sm + 2,
      marginBottom: SPACING.md,
    },
    aiAvatar: {
      width: 32,
      height: 32,
      borderRadius: RADIUS.pill,
      backgroundColor: c.pillBg,
      borderWidth: 1,
      borderColor: c.pillBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    aiBubble: {
      flex: 1,
      backgroundColor: c.glass,
      borderWidth: 1,
      borderColor: c.glassBorder,
      borderRadius: RADIUS.lg,
      paddingVertical: SPACING.md - 1,
      paddingHorizontal: SPACING.md,
      ...elevation(c.shadow, 'md'),
    },
    aiBubbleError: {
      borderColor: `${c.error}40`,
      backgroundColor: `${c.error}10`,
    },
    aiHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: SPACING.sm,
    },
    aiName: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.caption,
      color: c.primary,
      fontWeight: WEIGHT.bold,
      letterSpacing: 0.3,
    },
    aiBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: c.pillBg,
      borderWidth: 1,
      borderColor: c.pillBorder,
      borderRadius: RADIUS.pill,
      paddingVertical: 2,
      paddingHorizontal: 6,
    },
    aiBadgeText: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
      color: c.primary,
      fontWeight: WEIGHT.bold,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    aiBadgeError: {
      backgroundColor: `${c.error}15`,
      borderColor: `${c.error}40`,
    },
    aiBadgeTextError: {
      color: c.error,
    },
    thinkingHint: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.caption,
      color: c.lightText,
      marginBottom: 4,
    },
    errorText: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.bodySmall,
      color: c.text,
      lineHeight: 20,
    },
    retryBtn: {
      alignSelf: 'flex-start',
      marginTop: SPACING.sm + 2,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: c.pillBg,
      borderWidth: 1,
      borderColor: c.pillBorder,
      borderRadius: RADIUS.pill,
      paddingVertical: 5,
      paddingHorizontal: 10,
    },
    retryText: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
      color: c.primary,
      fontWeight: WEIGHT.bold,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },

    // ── Sectioned response ──
    section: {
      marginTop: SPACING.xs,
    },
    sectionWithDivider: {
      marginTop: SPACING.md,
      paddingTop: SPACING.md,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      marginBottom: SPACING.sm,
    },
    sectionIconWrap: {
      width: 22,
      height: 22,
      borderRadius: RADIUS.sm,
      backgroundColor: c.pillBg,
      borderWidth: 1,
      borderColor: c.pillBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionHeading: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.bodySmall,
      color: c.secondary,
      fontWeight: WEIGHT.bold,
    },
    paragraph: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.bodySmall,
      color: c.text,
      lineHeight: 21,
      marginBottom: 6,
    },
    bulletRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: SPACING.sm,
      marginBottom: 5,
    },
    bulletDot: {
      width: 14,
      height: 14,
      borderRadius: RADIUS.pill,
      backgroundColor: c.pillBg,
      borderWidth: 1,
      borderColor: c.pillBorder,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
    },
    bulletDotInner: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.primary,
    },
    bulletText: {
      flex: 1,
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.bodySmall,
      color: c.text,
      lineHeight: 21,
    },
    aiFooter: {
      marginTop: SPACING.md,
      paddingTop: SPACING.sm,
      borderTopWidth: 1,
      borderTopColor: c.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    aiFooterLeft: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
    disclaimer: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.tiny,
      color: c.lightText,
      fontStyle: 'italic',
    },

    // ── Empty state ──
    emptyState: {
      marginTop: SPACING.xl,
      alignItems: 'center',
      paddingVertical: SPACING.xl,
      paddingHorizontal: SPACING.lg,
      backgroundColor: c.glass,
      borderWidth: 1,
      borderColor: c.glassBorder,
      borderRadius: RADIUS.lg,
      ...elevation(c.shadow, 'sm'),
    },
    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: RADIUS.pill,
      backgroundColor: c.pillBg,
      borderWidth: 1,
      borderColor: c.pillBorder,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: SPACING.md,
    },
    emptyTitle: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.body,
      color: c.text,
      fontWeight: WEIGHT.bold,
      marginBottom: 6,
    },
    emptyDesc: {
      fontFamily: FONT_FAMILY,
      fontSize: TYPE.caption,
      color: c.lightText,
      lineHeight: 19,
      textAlign: 'center',
      maxWidth: 360,
    },

    // ── Background accents ──
    bgAccent: {
      position: 'absolute',
      width: 260,
      height: 260,
      borderRadius: 130,
      backgroundColor: c.iconBg,
      right: -85,
      top: -65,
      opacity: 0.55,
    },
    bgAccentTwo: {
      position: 'absolute',
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor: c.pillBg,
      left: -50,
      top: 240,
      opacity: 0.4,
    },
  });

export default AIAdvisorScreen;
