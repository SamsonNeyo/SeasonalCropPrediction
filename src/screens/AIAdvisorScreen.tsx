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

const QUICK_PROMPTS = [
  'Best crops for first season in Luwero',
  'How to improve loam soil before planting',
  'Signs of nitrogen deficiency in maize',
  'How to reduce pest damage naturally',
];

const AIAdvisorScreen = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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

  const handleAsk = async () => {
    setLoading(true);
    setAnswer('');
    const reply = await getAIAdvice(prompt);
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
            <Text style={styles.subtitle}>Get quick, practical farming guidance</Text>
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
          <Text style={styles.label}>Ask a question</Text>
          <TextInput
            style={styles.input}
            placeholder="Type your question here..."
          placeholderTextColor={colors.lightText}
          value={prompt}
          onChangeText={setPrompt}
          multiline
        />

        <Text style={styles.label}>Quick prompts</Text>
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
          <Text style={styles.label}>Advisor response</Text>
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
    backgroundColor: colors.card,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 14,
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  label: { fontFamily: FONT_FAMILY, fontSize: TYPE.bodySmall, fontWeight: WEIGHT.semibold, color: colors.secondary, marginBottom: 8 },
  input: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 13,
    padding: 12,
    marginBottom: 14,
    backgroundColor: colors.inputBg,
    color: colors.text,
    fontFamily: FONT_FAMILY,
    fontSize: TYPE.body,
    textAlignVertical: 'top',
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: {
    backgroundColor: colors.chipBg,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.chipBorder,
  },
  chipText: { fontSize: TYPE.caption, color: colors.text, fontFamily: FONT_FAMILY },
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
