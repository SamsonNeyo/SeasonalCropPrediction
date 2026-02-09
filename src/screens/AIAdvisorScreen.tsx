import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Animated,
  Easing,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { getAIAdvice } from '../services/openai';

const QUICK_PROMPTS = [
  'Best crops for first season in Luwero',
  'How to improve loam soil before planting',
  'Signs of nitrogen deficiency in maize',
  'How to reduce pest damage naturally',
];

const AIAdvisorScreen = () => {
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
            <MaterialCommunityIcons name="brain" size={24} color={COLORS.primary} />
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
            placeholderTextColor={COLORS.lightText}
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
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <MaterialCommunityIcons name="star-four-points" size={18} color={COLORS.white} />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 28 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
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
  title: { fontSize: 22, fontWeight: '800', color: COLORS.primary, letterSpacing: 0.2 },
  subtitle: { fontSize: 14, color: COLORS.lightText, marginTop: 2 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.secondary, marginBottom: 8 },
  input: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    backgroundColor: '#fafafa',
    color: COLORS.text,
    textAlignVertical: 'top',
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: {
    backgroundColor: '#F3F4F0',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e6e6e6',
  },
  chipText: { fontSize: 12, color: COLORS.text },
  primaryButton: {
    backgroundColor: COLORS.primary,
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
  primaryButtonText: { color: COLORS.white, fontWeight: '600', fontSize: 16 },
  answer: { color: COLORS.text, fontSize: 14, lineHeight: 22 },
  answerMuted: { color: COLORS.lightText, fontSize: 14 },
  disclaimer: { marginTop: 12, color: COLORS.lightText, fontSize: 12 },
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
});

export default AIAdvisorScreen;
