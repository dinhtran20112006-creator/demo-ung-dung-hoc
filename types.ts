
export interface QuizQuestion {
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
}

export interface QuizData {
  questions: QuizQuestion[];
}

export type MessageContent = string | { quizData: QuizData };

export interface Message {
  id: string;
  sender: 'user' | 'ai';
  content: MessageContent;
  topic?: string;
}