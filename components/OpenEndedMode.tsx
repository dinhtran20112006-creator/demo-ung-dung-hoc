
import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Lightbulb, Target } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

// Interfaces would typically be in a shared types file
interface Topic {
    id: number;
    question: string;
    answer: string;
}

interface Chapter {
    id: number;
    name: string;
    topics: Topic[];
}

interface Subject {
    id: number;
    name: string;
    chapters: Chapter[];
}


interface OpenEndedModeProps {
  subject: Subject;
  chapter: Chapter;
  onClose: () => void;
  darkMode: boolean;
}

const OpenEndedMode: React.FC<OpenEndedModeProps> = ({ subject, chapter, onClose, darkMode }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{[key: number]: string}>({});
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [aiEvaluations, setAiEvaluations] = useState<{[key: number]: string}>({});
  const [isEvaluating, setIsEvaluating] = useState(false);

  const topics = chapter.topics;
  const currentTopic = topics[currentIndex];
  const currentUserAnswer = userAnswers[currentIndex] || '';
  const currentAiEvaluation = aiEvaluations[currentIndex];

  const handleNext = () => {
    if (currentIndex < topics.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowEvaluation(true);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const evaluateWithAI = async (topic: Topic, userAnswer: string): Promise<string> => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      
      const prompt = `
Đánh giá câu trả lời của học sinh:

CÂU HỎI: ${topic.question}
ĐÁP ÁN CHUẨN: ${topic.answer}
CÂU TRẢ LỜI CỦA HỌC SINH: ${userAnswer}

HÃY ĐÁNH GIÁ THEO:
1. Độ chính xác so với đáp án chuẩn
2. Độ đầy đủ thông tin
3. Tính logic và rõ ràng
4. Điểm mạnh và điểm cần cải thiện

Định dạng phản hồi:
✅ ĐÚNG: [phần đúng]
🎯 THIẾU: [phần thiếu/sai]
💡 GỢI Ý: [cách cải thiện]

Giữ ngắn gọn (dưới 150 từ) và viết bằng tiếng Việt.
`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      return response.text;
    } catch (error) {
      console.error("AI Evaluation Error:", error);
      return "Không thể đánh giá câu trả lời lúc này. Hãy tự so sánh với đáp án chuẩn.";
    }
  };

  const handleEvaluateAll = async () => {
    setIsEvaluating(true);
    const evaluations: {[key: number]: string} = {};
    const promises = [];

    for (const [index, answer] of Object.entries(userAnswers)) {
      if (answer.trim()) {
        const topicIndex = parseInt(index);
        promises.push(
            evaluateWithAI(topics[topicIndex], answer).then(evaluation => {
                evaluations[topicIndex] = evaluation;
            })
        );
      }
    }
    
    await Promise.all(promises);
    setAiEvaluations(evaluations);
    setIsEvaluating(false);
  };

  if (showEvaluation) {
    return (
      <div className={`fixed inset-0 ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-100'} z-50 p-6 overflow-y-auto`}>
        <div className="max-w-4xl mx-auto">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-xl p-8`}>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold">📊 Kết quả Tự trả lời</h1>
              <button onClick={onClose} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              {topics.map((topic, index) => (
                <div key={topic.id} className={`p-4 rounded-lg border-2 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                  <h3 className="font-bold text-lg mb-2">{index + 1}. {topic.question}</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <h4 className="font-semibold mb-2 text-green-600 dark:text-green-400">📝 Câu trả lời của bạn:</h4>
                      <div className={`p-3 rounded min-h-[5rem] ${darkMode ? 'bg-gray-600' : 'bg-gray-100'}`}>
                        {userAnswers[index] || <span className="text-gray-400 italic">Chưa trả lời</span>}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2 text-blue-600 dark:text-blue-400">🎯 Đáp án chuẩn:</h4>
                      <div className={`p-3 rounded min-h-[5rem] ${darkMode ? 'bg-gray-600' : 'bg-gray-100'}`}>
                        {topic.answer}
                      </div>
                    </div>
                  </div>

                  {aiEvaluations[index] && (
                    <div className={`p-3 rounded-lg ${darkMode ? 'bg-purple-900/30 border-purple-700' : 'bg-purple-50 border-purple-200'} border`}>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Lightbulb size={16} className="text-purple-500" />
                        Đánh giá AI:
                      </h4>
                      <p className="text-sm whitespace-pre-wrap">{aiEvaluations[index]}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-between mt-6">
              <button
                onClick={() => setShowEvaluation(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold"
              >
                Quay lại
              </button>
              
              <button
                onClick={handleEvaluateAll}
                disabled={isEvaluating}
                className="bg-purple-500 hover:bg-purple-600 disabled:bg-purple-400 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2"
              >
                <Lightbulb size={16} />
                {isEvaluating ? 'Đang đánh giá...' : 'Nhận đánh giá AI'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-100'} z-50 flex flex-col`}>
      {/* Header */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg p-4 flex justify-between items-center`}>
        <div className="flex items-center gap-4">
          <button onClick={onClose} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
            <X size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold">🎯 Tự trả lời đầy đủ</h1>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {chapter.name} - Câu {currentIndex + 1}/{topics.length}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className={`px-3 py-1 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <span className="font-semibold">{currentIndex + 1}/{topics.length}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 overflow-hidden">
        {/* Question & Answer Area */}
        <div className={`rounded-2xl shadow-xl flex flex-col ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-bold text-2xl mb-4 flex items-center gap-2">
              <Target className="text-red-500" />
              Câu hỏi:
            </h2>
            <p className="text-lg leading-relaxed">{currentTopic.question}</p>
          </div>
          
          <div className="flex-1 p-6">
            <label className="block font-semibold mb-3 text-lg">✍️ Câu trả lời của bạn:</label>
            <textarea
              value={currentUserAnswer}
              onChange={(e) => setUserAnswers(prev => ({
                ...prev,
                [currentIndex]: e.target.value
              }))}
              placeholder="Viết câu trả lời đầy đủ của bạn ở đây... 
Cố gắng trình bày rõ ràng, đầy đủ như trong bài thi tự luận."
              className={`w-full h-64 p-4 border-2 rounded-lg resize-none focus:outline-none focus:border-indigo-500 text-lg leading-relaxed ${
                darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>
          
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2 transition"
            >
              <ChevronLeft size={16} />
              Câu trước
            </button>
            
            <button
              onClick={handleNext}
              className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2 transition"
            >
              {currentIndex === topics.length - 1 ? 'Xem kết quả' : 'Câu tiếp theo'}
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className={`rounded-2xl shadow-xl p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h2 className="font-bold text-xl mb-4">💡 Hướng dẫn</h2>
          
          <div className="space-y-4">
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'} border`}>
              <h3 className="font-semibold mb-2 text-blue-700 dark:text-blue-300">🎯 Mục tiêu</h3>
              <p className="text-sm">Tự trình bày kiến thức bằng ngôn ngữ của bạn, không nhìn đáp án.</p>
            </div>
            
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-200'} border`}>
              <h3 className="font-semibold mb-2 text-green-700 dark:text-green-300">✅ Cách làm hiệu quả</h3>
              <ul className="text-sm space-y-1">
                <li>• Viết như đang giải thích cho người khác</li>
                <li>• Sử dụng ví dụ minh họa nếu có thể</li>
                <li>• Trình bày logic, có cấu trúc rõ ràng</li>
                <li>• Không lo lắng về độ dài</li>
              </ul>
            </div>
            
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-purple-900/20 border-purple-700' : 'bg-purple-50 border-purple-200'} border`}>
              <h3 className="font-semibold mb-2 text-purple-700 dark:text-purple-300">📊 Đánh giá</h3>
              <p className="text-sm">Sau khi hoàn thành, AI sẽ giúp đánh giá:</p>
              <ul className="text-sm space-y-1 mt-1">
                <li>• Độ chính xác so với đáp án chuẩn</li>
                <li>• Độ đầy đủ thông tin</li>
                <li>• Gợi ý cải thiện</li>
              </ul>
            </div>
            
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-yellow-900/20' : 'bg-yellow-50'} border ${darkMode ? 'border-yellow-700' : 'border-yellow-200'}`}>
              <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-300">
                💪 Đừng bỏ cuộc! Viết ra dù chỉ một phần bạn nhớ được.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OpenEndedMode;
