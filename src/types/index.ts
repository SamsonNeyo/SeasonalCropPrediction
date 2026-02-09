export type Prediction = {
  crop: string;
  confidence: number;
  explanation: string;
};

export type HistoryEntry = {
  id: string;
  date: string;
  season: string;
  soil_type: string;
  temperature: number;
  rainfall: number;
  recommendations: Prediction[];
};

export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};