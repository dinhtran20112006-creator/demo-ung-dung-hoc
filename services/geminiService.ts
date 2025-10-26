
import { GoogleGenAI, Type } from "@google/genai";
import type { QuizData } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function explainTopic(topic: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Hãy giải thích chủ đề sau một cách rõ ràng và dễ hiểu cho người mới bắt đầu: "${topic}". 
      Sử dụng ngôn ngữ đơn giản, các ví dụ nếu cần, và định dạng câu trả lời bằng Markdown. 
      Tập trung vào các khái niệm cốt lõi.`,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini API error in explainTopic:", error);
    throw new Error("Failed to fetch explanation from Gemini API.");
  }
}

export async function generateQuiz(topic: string): Promise<QuizData> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Dựa trên chủ đề "${topic}", hãy tạo một bài trắc nghiệm gồm 5 câu hỏi để kiểm tra kiến thức. 
      Mỗi câu hỏi phải có 4 lựa chọn và chỉ một câu trả lời đúng.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              description: "Một danh sách các câu hỏi trắc nghiệm.",
              items: {
                type: Type.OBJECT,
                properties: {
                  questionText: {
                    type: Type.STRING,
                    description: "Nội dung câu hỏi.",
                  },
                  options: {
                    type: Type.ARRAY,
                    description: "Bốn lựa chọn trả lời, trong đó có một câu đúng.",
                    items: {
                      type: Type.STRING,
                    },
                  },
                  correctAnswerIndex: {
                    type: Type.INTEGER,
                    description: "Chỉ số (0-3) của câu trả lời đúng trong mảng lựa chọn.",
                  },
                },
                required: ["questionText", "options", "correctAnswerIndex"],
              },
            },
          },
          required: ["questions"],
        },
      },
    });

    const jsonString = response.text.trim();
    const parsedData = JSON.parse(jsonString);

    // Validate the structure
    if (parsedData && Array.isArray(parsedData.questions)) {
        return parsedData as QuizData;
    } else {
        throw new Error("Invalid quiz data structure from API.");
    }

  } catch (error) {
    console.error("Gemini API error in generateQuiz:", error);
    throw new Error("Failed to generate quiz from Gemini API.");
  }
}