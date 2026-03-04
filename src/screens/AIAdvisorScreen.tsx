import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { getAIAdvice } from '../services/openai';
import { FONT_FAMILY, TYPE, WEIGHT } from '../constants/typography';
import { useAuth } from '../context/AuthContext';

const getCurrentSeason = () => {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 6) return 'First';
  if (month >= 8 && month <= 12) return 'Second';
  return 'First';
};

const AIAdvisorScreen = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { userData } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const headerIn = useRef(new Animated.Value(0)).current;
  const cardIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(120, [
      Animated.timing(headerIn, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(cardIn, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [headerIn, cardIn]);

  const season = getCurrentSeason();
  const subCounty = userData?.subCounty || 'Bamunanika';
  const soilType = userData?.soilType || 'Clay Loam';
  const QUICK_PROMPTS = [
    `Best crops for the ${season.toLowerCase()} season in ${subCounty}, Luwero District.`,
    `Give a weekly farm plan for ${subCounty} in ${season} Season (${soilType} soil).`,
    `Top pests to watch in ${subCounty} during ${season} Season and control steps.`,
    `When should farmers in ${subCounty} prepare for harvest and selling in ${season} Season?`,
  ];
  const answerSummary = useMemo(() => {
    if (!answer) return '';
    const firstSentence = answer.split(/[\n.!?]/).find((line) => line.trim().length > 18);
    return firstSentence?.trim() || '';
  }, [answer]);

  const handleAsk = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setAnswer('');
    const reply = await getAIAdvice(prompt, {
      subCounty,
      soilType,
      season: `${season} Season`,
    });
    setAnswer(reply);
    setLoading(false);
  };

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
            <MaterialCommunityIcons name="brain" size={24} color={colors.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>AI Advisor</Text>
            <Text style={styles.subtitle}>Decision support for your next farm action</Text>
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.card,
            {
              opacity: cardIn,
              transform: [
                {
                  translateY: cardIn.interpolate({
                    inputRange: [0, 1],
                    outputRange: [16, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.sectionBadge}>
            <MaterialCommunityIcons name="lightning-bolt-outline" size={13} color={colors.primary} />
            <Text style={styles.sectionBadgeText}>Ask</Text>
          </View>
          <View style={styles.contextCard}>
            <View style={styles.contextPill}>
              <MaterialCommunityIcons name="map-marker-radius-outline" size={14} color={colors.secondary} />
              <Text style={styles.contextText}>{subCounty}</Text>
            </View>
            <View style={styles.contextPill}>
              <MaterialCommunityIcons name="layers-outline" size={14} color={colors.secondary} />
              <Text style={styles.contextText}>{soilType}</Text>
            </View>
            <View style={styles.contextPill}>
              <MaterialCommunityIcons name="leaf-circle-outline" size={14} color={colors.secondary} />
              <Text style={styles.contextText}>{season} Season</Text>
            </View>
          </View>
          <Text style={styles.label}>Ask a question</Text>
          <TextInput
            style={styles.input}
            placeholder="Type your question here..."
            placeholderTextColor={colors.lightText}
            value={prompt}
            onChangeText={setPrompt}
            multiline
          />

          <Text style={styles.label}>Suggested prompts</Text>
          <View style={styles.chipsRow}>
            {QUICK_PROMPTS.map((item) => (
              <TouchableOpacity key={item} style={styles.chip} onPress={() => setPrompt(item)}>
                <Text style={styles.chipText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, (loading || !prompt.trim()) && styles.primaryButtonDisabled]}
            onPress={handleAsk}
            disabled={loading || !prompt.trim()}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <MaterialCommunityIcons name="star-four-points" size={18} color={colors.white} />
                <Text style={styles.primaryButtonText}>Ask Advisor</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

        <Animated.View
          style={[
            styles.card,
            {
              opacity: cardIn,
              transform: [
                {
                  translateY: cardIn.interpolate({
                    inputRange: [0, 1],
                    outputRange: [22, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.sectionBadge}>
            <MaterialCommunityIcons name="file-document-outline" size={13} color={colors.primary} />
            <Text style={styles.sectionBadgeText}>Decision</Text>
          </View>
          <Text style={styles.label}>Advisor response</Text>
          {!!answerSummary && !loading && <Text style={styles.summaryText}>{answerSummary}</Text>}
          {loading ? (
            <Text style={styles.answerMuted}>Thinking...</Text>
          ) : (
            <Text style={styles.answer}>{answer || 'No response yet. Ask a question to start.'}</Text>
          )}
          <Text style={styles.disclaimer}>
            Advice is informational and should be validated with local agronomy guidance.
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 28 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.iconBg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: { flex: 1 },
  title: { fontFamily: FONT_FAMILY, fontSize: TYPE.h2, fontWeight: WEIGHT.bold, color: colors.primary, letterSpacing: 0.2 },
  subtitle: { fontFamily: FONT_FAMILY, fontSize: TYPE.bodySmall, color: colors.lightText, marginTop: 2 },
  card: {
    backgroundColor: colors.glass,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 16,
    marginBottom: 14,
    shadowColor: colors.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  sectionBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.pillBorder,
    backgroundColor: colors.pillBg,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 10,
  },
  sectionBadgeText: {
    marginLeft: 4,
    color: colors.primary,
    fontFamily: FONT_FAMILY,
    fontSize: TYPE.tiny,
    fontWeight: WEIGHT.semibold,
  },
  label: { fontFamily: FONT_FAMILY, fontSize: TYPE.bodySmall, fontWeight: WEIGHT.semibold, color: colors.secondary, marginBottom: 8 },
  input: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 13,
    padding: 12,
    marginBottom: 14,
    backgroundColor: colors.glassSoft,
    color: colors.text,
    fontFamily: FONT_FAMILY,
    fontSize: TYPE.body,
    textAlignVertical: 'top',
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start' },
  chip: {
    backgroundColor: colors.glassSoft,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    maxWidth: '100%',
    flexShrink: 1,
  },
  chipText: { fontSize: TYPE.caption, color: colors.text, fontFamily: FONT_FAMILY, flexShrink: 1, flexWrap: 'wrap' },
  contextCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  contextPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glassSoft,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 9,
  },
  contextText: {
    marginLeft: 5,
    color: colors.secondary,
    fontFamily: FONT_FAMILY,
    fontSize: TYPE.caption,
    fontWeight: WEIGHT.semibold,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonDisabled: {
    backgroundColor: '#9DBA9D',
  },
  primaryButtonText: { color: colors.white, fontWeight: WEIGHT.semibold, fontSize: TYPE.body, fontFamily: FONT_FAMILY },
  summaryText: {
    color: colors.secondary,
    fontSize: TYPE.bodySmall,
    lineHeight: 20,
    fontFamily: FONT_FAMILY,
    marginBottom: 8,
    fontWeight: WEIGHT.semibold,
  },
  answer: { color: colors.text, fontSize: TYPE.bodySmall, lineHeight: 22, fontFamily: FONT_FAMILY },
  answerMuted: { color: colors.lightText, fontSize: TYPE.bodySmall, fontFamily: FONT_FAMILY },
  disclaimer: { marginTop: 12, color: colors.lightText, fontSize: TYPE.caption, fontFamily: FONT_FAMILY },
  bgAccent: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: colors.iconBg,
    right: -85,
    top: -65,
    opacity: 0.72,
  },
});

export default AIAdvisorScreen;
