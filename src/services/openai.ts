import axios from 'axios';
import { api } from './api';

type AdvisorContext = {
  subCounty?: string;
  soilType?: string;
  season?: string;
};

const buildContextMessage = (question: string, context?: AdvisorContext) => {
  if (!context) return question;
  const parts = [
    `Sub-county: ${context.subCounty || 'Bamunanika'}`,
    `Soil type: ${context.soilType || 'Clay Loam'}`,
    `Season: ${context.season || 'First'}`,
  ];
  return `${question}\n\nFarmer profile context:\n- ${parts.join('\n- ')}`;
};

export const getAIAdvice = async (question: string, context?: AdvisorContext): Promise<string> => {
  try {
    if (!question.trim()) {
      return 'Please type a question first.';
    }
    const response = await api.post('/chat', { message: buildContextMessage(question, context) });
    return response.data.answer?.trim() || 'No response from AI advisor.';
  } catch (error) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    const detail = axios.isAxiosError(error) ? (error.response?.data as any)?.detail : undefined;
    console.error('AI advisor request failed:', status, detail ?? error);
    if (detail) return String(detail);
    if (status) return `AI advisor error (${status}). Please try again.`;
    return 'Sorry, I could not connect to the AI advisor right now. Please check your internet and try again.';
  }
};
