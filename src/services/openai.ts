import axios from 'axios';
import { api } from './api';

type AdvisorContext = {
  subCounty?: string;
  soilType?: string;
  season?: string;
};

const buildContextMessage = (question: string, context?: AdvisorContext) => {
  const parts = [
    `Sub-county: ${context?.subCounty || 'Bamunanika'}`,
    `Soil type: ${context?.soilType || 'Clay Loam'}`,
    `Season: ${context?.season || 'First'}`,
  ];
  return [
    question.trim(),
    '',
    'Farmer profile context:',
    `- ${parts.join('\n- ')}`,
    '',
    'Response instructions:',
    '- Respond as SmartCrop AI Advisor, in a confident but friendly AI assistant tone.',
    '- Answer the farmer\'s exact question first.',
    '- Use the profile context only where it helps the answer.',
    '- When a structured answer is useful, use these exact headings on separate lines: Short answer, What it means, Recommended actions, Watch out, Next step.',
    '- Use short bullet points for action steps.',
    '- Write in clear, practical English for a Luwero farmer, but make it sound like a helpful AI assistant.',
    '- Explain technical labels or risks in simple terms if the question asks about them.',
    '- Do not add unrelated weather, pest, or market advice unless it supports the question.',
  ].join('\n');
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
