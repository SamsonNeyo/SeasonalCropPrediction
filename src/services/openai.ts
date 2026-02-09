import axios from 'axios';
import { api } from './api';

export const getAIAdvice = async (question: string): Promise<string> => {
  try {
    if (!question.trim()) {
      return 'Please type a question first.';
    }
    const response = await api.post('/chat', { message: question });
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
