import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

const PredictionCard = ({ prediction }: { prediction: any }) => {
  if (!prediction) return null;
  const { crop, confidence, explanation } = prediction;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.icon}>
          <MaterialCommunityIcons name="sprout" size={18} color={COLORS.primary} />
        </View>
        <View style={styles.text}>
          <Text style={styles.title}>{crop || 'Crop'}</Text>
          <Text style={styles.subtitle}>{confidence ? `${confidence}% confidence` : 'Recommended'}</Text>
        </View>
      </View>
      {!!explanation && <Text style={styles.explanation}>{explanation}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#EAF4EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  text: { flex: 1 },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: 12, color: COLORS.lightText, marginTop: 2 },
  explanation: { marginTop: 8, fontSize: 13, color: COLORS.text, lineHeight: 18 },
});

export default PredictionCard;
