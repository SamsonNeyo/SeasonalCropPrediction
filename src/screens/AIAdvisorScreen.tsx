import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
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
  { test: /^short answer\b/i,        icon: 'lightbulb-on-outline',     label: 'Short answer' },
  { test: /^what it means\b/i,       icon: 'information-outline',      label: 'What it means' },
  { test: /^recommended actions?\b/i, icon: 'check-decagram-outline',  label: 'Recommended actions' },
  { test: /^next steps?\b/i,         icon: 'arrow-right-circle-outline', label: 'Next step' },
  { test: /^watch out\b/i,           icon: 'alert-decagram-outline',   label: 'Watch out' },
  { test: /^summary\b/i,             icon: 'text-box-outline',         label: 'Summary' },
  { test: /^tips?\b/i,               icon: 'star-four-points-outline', label: 'Tips' },
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
    if (!current) { current = { heading, icon, body: [] }; sections.push(current); }
    return current;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const headingMatch = splitKnownHeading(line);
    if (headingMatch) {
      current = { heading: headingMatch.pattern.label, icon: headingMatch.pattern.icon, body: [] };
      sections.push(current);
      if (headingMatch.rest) current.body.push({ type: 'p', text: headingMatch.rest });
      continue;
    }
    if (/^[-*•·]\s+/.test(line) || /^\d+[\.\)]\s+/.test(line)) {
      const text = stripBold(line.replace(/^[-*•·]\s+/, '').replace(/^\d+[\.\)]\s+/, ''));
      ensureCurrent().body.push({ type: 'li', text });
      continue;
    }
    ensureCurrent().body.push({ type: 'p', text: stripBold(line) });
  }

  return sections.length ? sections : [{ icon: 'text-box-outline', body: [{ type: 'p', text: stripBold(raw) }] }];
};

const TypingDots = ({ colors }: { colors: ThemeColors }) => {
  const dotOne   = useRef(new Animated.Value(0)).current;
  const dotTwo   = useRef(new Animated.Value(0)).current;
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
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [dots]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4 }}>
      {dots.map((dot, idx) => (
        <Animated.View
          key={idx}
          style={{
            width: 7, height: 7, borderRadius: 4,
            backgroundColor: colors.primary,
            opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] }),
            transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }],
          }}
        />
      ))}
    </View>
  );
};

// ── Message type ─────────────────────────────────────────────────────────────
type Message = {
  id: string;
  role: 'user' | 'ai';
  text: string;
  displayText?: string;
  loading?: boolean;
  typing?: boolean;
  error?: boolean;
  retryFor?: string;
};

// ── Screen ───────────────────────────────────────────────────────────────────
const AIAdvisorScreen = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { userData } = useAuth();

  const [messages, setMessages]       = useState<Message[]>([]);
  const [input, setInput]             = useState('');
  const [isLoading, setIsLoading]     = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const headerIn = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);
  const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
    };
  }, []);

  useScrollToTop(scrollRef);

  useEffect(() => {
    Animated.timing(headerIn, {
      toValue: 1, duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [headerIn]);

  const season    = getCurrentSeason();
  const subCounty = userData?.subCounty || 'Bamunanika';
  const soilType  = userData?.soilType  || 'Clay Loam';

  const QUICK_PROMPTS = useMemo(() => [
    { icon: 'sprout-outline'        as const, label: 'Best crops this season',
      text: `Best crops for the ${season.toLowerCase()} season in ${subCounty}, Luwero District.` },
    { icon: 'calendar-week-outline' as const, label: 'Weekly farm plan',
      text: `Give a weekly farm plan for ${subCounty} in ${season} Season (${soilType} soil).` },
    { icon: 'bug-outline'           as const, label: 'Pest watch & control',
      text: `Top pests to watch in ${subCounty} during ${season} Season and control steps.` },
    { icon: 'basket-outline'        as const, label: 'Harvest & selling',
      text: `When should farmers in ${subCounty} prepare for harvest and selling in ${season} Season?` },
    { icon: 'water-outline'         as const, label: 'Irrigation guidance',
      text: `Best irrigation practices for ${soilType} soil in ${subCounty} during ${season} Season.` },
    { icon: 'cash'                  as const, label: 'Cost-saving tips',
      text: `How can a smallholder farmer in ${subCounty} reduce input costs this ${season.toLowerCase()} season?` },
  ], [season, subCounty, soilType]);

  const sendMessage = async (text: string) => {
    const q = text.trim();
    if (!q || isLoading) return;

    const aiId = `a-${Date.now()}`;
    setMessages(prev => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', text: q },
      { id: aiId, role: 'ai', text: '', loading: true, retryFor: q },
    ]);
    setInput('');
    setIsLoading(true);

    try {
      const reply = await getAIAdvice(q, { subCounty, soilType, season: `${season} Season` });
      setIsLoading(false);
      setMessages(prev =>
        prev.map(m => m.id === aiId ? { ...m, text: reply, displayText: '', loading: false, typing: true } : m),
      );

      const words = reply.split(' ');
      let wordIdx = 0;
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = setInterval(() => {
        wordIdx += 3;
        const done = wordIdx >= words.length;
        const chunk = words.slice(0, Math.min(wordIdx, words.length)).join(' ');
        setMessages(prev =>
          prev.map(m => m.id === aiId ? { ...m, displayText: chunk, typing: !done } : m),
        );
        if (done) {
          clearInterval(typingIntervalRef.current!);
          typingIntervalRef.current = null;
        }
      }, 38);
    } catch (e: any) {
      setIsLoading(false);
      setMessages(prev =>
        prev.map(m =>
          m.id === aiId
            ? { ...m, text: e?.message || 'Could not reach the advisor right now.', loading: false, error: true }
            : m,
        ),
      );
    }
  };

  const handleRetry = (question: string) => {
    setMessages(prev => {
      const idx = [...prev].reverse().findIndex(m => m.role === 'ai' && m.error);
      return idx === -1 ? prev : prev.slice(0, prev.length - 1 - idx);
    });
    sendMessage(question);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.bgAccent,    { pointerEvents: 'none' } as any]} />
      <View style={[styles.bgAccentTwo, { pointerEvents: 'none' } as any]} />

      {/* ── Static header ──────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.topSection,
          {
            opacity: headerIn,
            transform: [{ translateY: headerIn.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
          },
        ]}
      >
        {/* Header row */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <MaterialCommunityIcons name="brain" size={22} color={colors.primary} />
            <View style={styles.headerIconDot} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>AI Advisor</Text>
            <Text style={styles.subtitle}>Decision support for your next farm action</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
            {messages.length > 0 && (
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={() => setMessages([])}
                accessibilityRole="button"
                accessibilityLabel="New chat"
              >
                <MaterialCommunityIcons name="plus-circle-outline" size={14} color={colors.primary} />
                <Text style={styles.clearBtnText}>New</Text>
              </TouchableOpacity>
            )}
            <View style={styles.onlineChip}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineChipText}>Online</Text>
            </View>
          </View>
        </View>

        {/* Context strip */}
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
      </Animated.View>

      {/* ── Chat area + input bar ───────────────────────────────── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
            /* ── Empty state ── */
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <MaterialCommunityIcons name="brain" size={32} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>Ask anything about your farm</Text>
              <Text style={styles.emptyDesc}>
                Type your question below, or tap a quick starter to begin.
              </Text>

              {/* Quick prompts grid */}
              <View style={styles.quickGrid}>
                {QUICK_PROMPTS.map(item => (
                  <TouchableOpacity
                    key={item.label}
                    style={styles.quickChip}
                    onPress={() => sendMessage(item.text)}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                  >
                    <View style={styles.quickChipIcon}>
                      <MaterialCommunityIcons name={item.icon} size={16} color={colors.primary} />
                    </View>
                    <Text style={styles.quickChipText} numberOfLines={2}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            /* ── Message bubbles ── */
            messages.map(msg =>
              msg.role === 'user' ? (
                /* User bubble */
                <View key={msg.id} style={styles.userMessage}>
                  <View style={styles.userAvatar}>
                    <MaterialCommunityIcons name="account" size={16} color={colors.secondary} />
                  </View>
                  <View style={styles.userBubble}>
                    <Text style={styles.userMessageText}>{msg.text}</Text>
                  </View>
                </View>
              ) : (
                /* AI bubble */
                <View key={msg.id} style={styles.aiMessage}>
                  <View style={styles.aiAvatar}>
                    <MaterialCommunityIcons name="brain" size={16} color={colors.primary} />
                  </View>
                  <View style={[styles.aiBubble, msg.error && styles.aiBubbleError]}>
                    <View style={styles.aiHeaderRow}>
                      <Text style={styles.aiName}>SmartCrop AI</Text>
                      <View style={[styles.aiBadge, msg.error && styles.aiBadgeError]}>
                        {msg.loading ? (
                          <Text style={styles.aiBadgeText}>Thinking</Text>
                        ) : msg.typing ? (
                          <Text style={styles.aiBadgeText}>Typing</Text>
                        ) : msg.error ? (
                          <Text style={[styles.aiBadgeText, styles.aiBadgeTextError]}>Error</Text>
                        ) : (
                          <>
                            <MaterialCommunityIcons name="check" size={10} color={colors.primary} />
                            <Text style={styles.aiBadgeText}>Reply</Text>
                          </>
                        )}
                      </View>
                    </View>

                    {msg.loading ? (
                      <>
                        <Text style={styles.thinkingHint}>Analyzing your farm context…</Text>
                        <TypingDots colors={colors} />
                      </>
                    ) : msg.typing ? (
                      <>
                        {parseAdvisorResponse(msg.displayText || '').map((section, idx) => (
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
                        <Text style={[styles.paragraph, { color: colors.primary }]}>▋</Text>
                      </>
                    ) : msg.error ? (
                      <>
                        <Text style={styles.errorText}>{msg.text}</Text>
                        {!!msg.retryFor && (
                          <TouchableOpacity
                            onPress={() => handleRetry(msg.retryFor!)}
                            style={styles.retryBtn}
                            accessibilityRole="button"
                            accessibilityLabel="Retry question"
                          >
                            <MaterialCommunityIcons name="refresh" size={14} color={colors.primary} />
                            <Text style={styles.retryText}>Try again</Text>
                          </TouchableOpacity>
                        )}
                      </>
                    ) : (
                      <>
                        {parseAdvisorResponse(msg.text).map((section, idx) => (
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
                          <MaterialCommunityIcons name="shield-check-outline" size={11} color={colors.lightText} />
                          <Text style={styles.disclaimer}>AI guidance — verify with local experts.</Text>
                        </View>
                      </>
                    )}
                  </View>
                </View>
              ),
            )
          )}
        </ScrollView>

        {/* ── Input bar ──────────────────────────────────────────── */}
        <View style={[styles.inputBar, inputFocused && styles.inputBarFocused]}>
          <TextInput
            style={[styles.inputBarText, Platform.OS === 'web' ? webNoOutline : null]}
            placeholder="Ask about your farm…"
            placeholderTextColor={colors.lightText}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            accessibilityLabel="Type your farming question"
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || isLoading) && styles.sendBtnDisabled]}
            onPress={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            accessibilityRole="button"
            accessibilityLabel="Send question"
          >
            {isLoading
              ? <ActivityIndicator size="small" color="#fff" />
              : <MaterialCommunityIcons name="send" size={19} color="#fff" />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ── Styles ───────────────────────────────────────────────────────────────────
const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },

    // ── Top static section ──
    topSection: {
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.sm,
      paddingBottom: SPACING.sm,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
      marginBottom: SPACING.md,
    },
    headerIcon: {
      width: 46, height: 46,
      borderRadius: RADIUS.md + 1,
      backgroundColor: c.iconBg,
      borderWidth: 1, borderColor: c.pillBorder,
      alignItems: 'center', justifyContent: 'center',
    },
    headerIconDot: {
      position: 'absolute', top: 4, right: 4,
      width: 10, height: 10, borderRadius: 5,
      backgroundColor: c.primary,
      borderWidth: 2, borderColor: c.glass,
    },
    headerText: { flex: 1, minWidth: 0 },
    title: {
      fontFamily: FONT_FAMILY, fontSize: TYPE.title,
      fontWeight: WEIGHT.bold, color: c.primary, letterSpacing: 0.2,
    },
    subtitle: {
      fontFamily: FONT_FAMILY, fontSize: TYPE.bodySmall,
      color: c.lightText, marginTop: 2,
    },
    clearBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: c.pillBg,
      borderWidth: 1, borderColor: c.pillBorder,
      borderRadius: RADIUS.pill,
      paddingVertical: 4, paddingHorizontal: 8,
    },
    clearBtnText: {
      fontFamily: FONT_FAMILY, fontSize: TYPE.tiny,
      color: c.primary, fontWeight: WEIGHT.bold,
      letterSpacing: 0.4, textTransform: 'uppercase',
    },
    onlineChip: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: c.pillBg, borderWidth: 1, borderColor: c.pillBorder,
      borderRadius: RADIUS.pill, paddingVertical: 4, paddingHorizontal: 8,
    },
    onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: c.primary },
    onlineChipText: {
      fontFamily: FONT_FAMILY, fontSize: TYPE.tiny,
      color: c.primary, fontWeight: WEIGHT.bold,
      letterSpacing: 0.4, textTransform: 'uppercase',
    },

    // ── Context strip ──
    contextStrip: {
      flexDirection: 'row', alignItems: 'stretch',
      backgroundColor: c.glass,
      borderWidth: 1, borderColor: c.glassBorder,
      borderRadius: RADIUS.md,
      paddingVertical: SPACING.sm + 2, paddingHorizontal: SPACING.sm + 2,
      ...elevation(c.shadow, 'sm'),
    },
    contextItem: {
      flex: 1, minWidth: 0,
      flexDirection: 'row', alignItems: 'center',
      gap: SPACING.sm, paddingHorizontal: 6,
    },
    contextItemTextWrap: { flex: 1, minWidth: 0 },
    contextItemLabel: {
      fontFamily: FONT_FAMILY, fontSize: TYPE.tiny,
      color: c.lightText, fontWeight: WEIGHT.semibold,
      letterSpacing: 0.5, textTransform: 'uppercase',
    },
    contextItemValue: {
      marginTop: 1, fontFamily: FONT_FAMILY,
      fontSize: TYPE.caption, color: c.text, fontWeight: WEIGHT.bold,
    },
    contextDivider: {
      width: 1, alignSelf: 'stretch',
      marginVertical: 2, backgroundColor: c.border, opacity: 0.6,
    },

    // ── Messages list ──
    messagesList: { flex: 1 },
    messagesContent: {
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.md,
      paddingBottom: SPACING.sm,
      flexGrow: 1,
    },

    // ── Empty state ──
    emptyState: {
      flex: 1, alignItems: 'center',
      paddingTop: SPACING.xl, paddingHorizontal: SPACING.sm,
    },
    emptyIcon: {
      width: 64, height: 64, borderRadius: RADIUS.pill,
      backgroundColor: c.pillBg, borderWidth: 1, borderColor: c.pillBorder,
      alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md,
    },
    emptyTitle: {
      fontFamily: FONT_FAMILY, fontSize: TYPE.body,
      color: c.text, fontWeight: WEIGHT.bold, marginBottom: 6, textAlign: 'center',
    },
    emptyDesc: {
      fontFamily: FONT_FAMILY, fontSize: TYPE.caption,
      color: c.lightText, lineHeight: 19, textAlign: 'center',
      maxWidth: 320, marginBottom: SPACING.xl,
    },
    quickGrid: {
      flexDirection: 'row', flexWrap: 'wrap',
      gap: SPACING.sm, justifyContent: 'center',
      width: '100%',
    },
    quickChip: {
      width: '47%',
      backgroundColor: c.glass,
      borderWidth: 1, borderColor: c.glassBorder,
      borderRadius: RADIUS.md,
      paddingVertical: SPACING.md - 2, paddingHorizontal: SPACING.md - 2,
      gap: SPACING.sm,
      ...elevation(c.shadow, 'sm'),
    },
    quickChipIcon: {
      width: 32, height: 32, borderRadius: RADIUS.sm + 2,
      backgroundColor: c.pillBg, borderWidth: 1, borderColor: c.pillBorder,
      alignItems: 'center', justifyContent: 'center',
    },
    quickChipText: {
      fontFamily: FONT_FAMILY, fontSize: TYPE.caption,
      color: c.text, fontWeight: WEIGHT.semibold, lineHeight: 17,
    },

    // ── User message ──
    userMessage: {
      flexDirection: 'row', gap: SPACING.sm + 2, marginBottom: SPACING.md,
      justifyContent: 'flex-end',
    },
    userAvatar: {
      width: 30, height: 30, borderRadius: RADIUS.pill,
      backgroundColor: c.iconBg, borderWidth: 1, borderColor: c.border,
      alignItems: 'center', justifyContent: 'center',
      alignSelf: 'flex-end',
    },
    userBubble: {
      maxWidth: '78%',
      backgroundColor: c.primary,
      borderRadius: RADIUS.lg,
      borderBottomRightRadius: 6,
      paddingVertical: SPACING.sm + 2, paddingHorizontal: SPACING.md,
    },
    userMessageText: {
      fontFamily: FONT_FAMILY, fontSize: TYPE.bodySmall,
      color: '#fff', lineHeight: 20,
    },

    // ── AI message ──
    aiMessage: {
      flexDirection: 'row', gap: SPACING.sm + 2, marginBottom: SPACING.md,
    },
    aiAvatar: {
      width: 30, height: 30, borderRadius: RADIUS.pill,
      backgroundColor: c.pillBg, borderWidth: 1, borderColor: c.pillBorder,
      alignItems: 'center', justifyContent: 'center',
      alignSelf: 'flex-start',
    },
    aiBubble: {
      flex: 1,
      backgroundColor: c.glass, borderWidth: 1, borderColor: c.glassBorder,
      borderRadius: RADIUS.lg, borderTopLeftRadius: 6,
      paddingVertical: SPACING.md - 1, paddingHorizontal: SPACING.md,
      ...elevation(c.shadow, 'sm'),
    },
    aiBubbleError: { borderColor: `${c.error}40`, backgroundColor: `${c.error}10` },
    aiHeaderRow: {
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'space-between', marginBottom: SPACING.sm,
    },
    aiName: {
      fontFamily: FONT_FAMILY, fontSize: TYPE.caption,
      color: c.primary, fontWeight: WEIGHT.bold, letterSpacing: 0.3,
    },
    aiBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 3,
      backgroundColor: c.pillBg, borderWidth: 1, borderColor: c.pillBorder,
      borderRadius: RADIUS.pill, paddingVertical: 2, paddingHorizontal: 6,
    },
    aiBadgeError: { backgroundColor: `${c.error}15`, borderColor: `${c.error}40` },
    aiBadgeText: {
      fontFamily: FONT_FAMILY, fontSize: TYPE.tiny,
      color: c.primary, fontWeight: WEIGHT.bold,
      letterSpacing: 0.4, textTransform: 'uppercase',
    },
    aiBadgeTextError: { color: c.error },
    thinkingHint: {
      fontFamily: FONT_FAMILY, fontSize: TYPE.caption,
      color: c.lightText, marginBottom: 4,
    },
    errorText: {
      fontFamily: FONT_FAMILY, fontSize: TYPE.bodySmall,
      color: c.text, lineHeight: 20,
    },
    retryBtn: {
      alignSelf: 'flex-start', marginTop: SPACING.sm + 2,
      flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: c.pillBg, borderWidth: 1, borderColor: c.pillBorder,
      borderRadius: RADIUS.pill, paddingVertical: 5, paddingHorizontal: 10,
    },
    retryText: {
      fontFamily: FONT_FAMILY, fontSize: TYPE.tiny,
      color: c.primary, fontWeight: WEIGHT.bold,
      letterSpacing: 0.4, textTransform: 'uppercase',
    },

    // ── Sectioned response ──
    section: { marginTop: SPACING.xs },
    sectionWithDivider: {
      marginTop: SPACING.md, paddingTop: SPACING.md,
      borderTopWidth: 1, borderTopColor: c.border,
    },
    sectionHeaderRow: {
      flexDirection: 'row', alignItems: 'center',
      gap: SPACING.sm, marginBottom: SPACING.sm,
    },
    sectionIconWrap: {
      width: 22, height: 22, borderRadius: RADIUS.sm,
      backgroundColor: c.pillBg, borderWidth: 1, borderColor: c.pillBorder,
      alignItems: 'center', justifyContent: 'center',
    },
    sectionHeading: {
      fontFamily: FONT_FAMILY, fontSize: TYPE.bodySmall,
      color: c.secondary, fontWeight: WEIGHT.bold,
    },
    paragraph: {
      fontFamily: FONT_FAMILY, fontSize: TYPE.bodySmall,
      color: c.text, lineHeight: 21, marginBottom: 6,
    },
    bulletRow: {
      flexDirection: 'row', alignItems: 'flex-start',
      gap: SPACING.sm, marginBottom: 5,
    },
    bulletDot: {
      width: 14, height: 14, borderRadius: RADIUS.pill,
      backgroundColor: c.pillBg, borderWidth: 1, borderColor: c.pillBorder,
      alignItems: 'center', justifyContent: 'center', marginTop: 4,
    },
    bulletDotInner: { width: 4, height: 4, borderRadius: 2, backgroundColor: c.primary },
    bulletText: {
      flex: 1, fontFamily: FONT_FAMILY,
      fontSize: TYPE.bodySmall, color: c.text, lineHeight: 21,
    },
    aiFooter: {
      marginTop: SPACING.md, paddingTop: SPACING.sm,
      borderTopWidth: 1, borderTopColor: c.border,
      flexDirection: 'row', alignItems: 'center', gap: 5,
    },
    disclaimer: {
      fontFamily: FONT_FAMILY, fontSize: TYPE.tiny,
      color: c.lightText, fontStyle: 'italic',
    },

    // ── Input bar ──
    inputBar: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: SPACING.sm,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm + 2,
      backgroundColor: c.surface,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    inputBarFocused: { borderTopColor: c.primary },
    inputBarText: {
      flex: 1,
      backgroundColor: c.glass,
      borderWidth: 1, borderColor: c.glassBorder,
      borderRadius: RADIUS.xl,
      paddingHorizontal: SPACING.md,
      paddingTop: SPACING.sm + 2,
      paddingBottom: SPACING.sm + 2,
      maxHeight: 120,
      fontFamily: FONT_FAMILY, fontSize: TYPE.body,
      color: c.text,
    },
    sendBtn: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: c.primary,
      alignItems: 'center', justifyContent: 'center',
      ...elevation(c.shadow, 'sm'),
    },
    sendBtnDisabled: { backgroundColor: c.border, ...elevation(c.shadow, 'none') },

    // ── Background accents ──
    bgAccent: {
      position: 'absolute', width: 260, height: 260, borderRadius: 130,
      backgroundColor: c.iconBg, right: -85, top: -65, opacity: 0.55,
    },
    bgAccentTwo: {
      position: 'absolute', width: 180, height: 180, borderRadius: 90,
      backgroundColor: c.pillBg, left: -50, top: 240, opacity: 0.4,
    },
  });

export default AIAdvisorScreen;
