import React, { useState, useRef, useEffect } from 'react';
import { X, Download, Upload, Clock, Brain, Sparkles } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

// Re-defining Subject here as it's not exported from App.tsx
// In a real app, this would be in a shared types file.
interface Subject {
    id: number;
    name: string;
    chapters: any[]; // Simplified for this component's needs
}

interface BlankPaperModeProps {
  subject: Subject;
  onClose: () => void;
  darkMode: boolean;
}

const BlankPaperMode: React.FC<BlankPaperModeProps> = ({ subject, onClose, darkMode }) => {
  const [recallText, setRecallText] = useState('');
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [showAIReview, setShowAIReview] = useState(false);
  const [aiFeedback, setAiFeedback] = useState('');
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // FIX: Initializing useRef with null for consistency and to avoid potential undefined issues. This might be the cause of the cryptic TypeScript error.
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = window.setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    }

    // Focus textarea khi component mount
    if (textareaRef.current) {
      textareaRef.current.focus();
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isTimerRunning]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmitRecall = () => {
    setIsTimerRunning(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const generateAIFeedback = async () => {
    if (!recallText.trim()) return;

    setIsGeneratingFeedback(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      
      const prompt = `
Bạn là chuyên gia đánh giá Active Recall. Hãy phân tích bài recall của học sinh:

MÔN HỌC: ${subject.name}
NỘI DUNG RECALL: ${recallText}

HÃY PHÂN TÍCH THEO:
1. Độ bao phủ kiến thức (0-10 điểm)
2. Độ chính xác của thông tin
3. Cấu trúc và logic trình bày
4. Gợi ý các điểm cần cải thiện

Định dạng:
📊 ĐÁNH GIÁ TỔNG QUAN: [điểm số]/10
✅ ĐIỂM MẠNH: [liệt kê]
🎯 ĐIỂM CẦN CẢI THIỆN: [liệt kê]
💡 GỢI Ý: [đề xuất cụ thể]

Giữ nguyên định dạng trên và viết bằng tiếng Việt.
`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: prompt,
        config: {
          thinkingConfig: { thinkingBudget: 32768 }
        }
      });

      setAiFeedback(response.text);
      setShowAIReview(true);
    } catch (error) {
      console.error('AI Feedback Error:', error);
      setAiFeedback('Xin lỗi, không thể tạo phản hồi AI lúc này. Hãy tự đánh giá dựa trên ghi chú của bạn.');
      setShowAIReview(true);
    } finally {
      setIsGeneratingFeedback(false);
    }
  };

  const exportRecall = () => {
    const blob = new Blob([`Blank Paper Recall - ${subject.name}\n\nThời gian: ${formatTime(timeElapsed)}\n\n${recallText}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blank-paper-${subject.name}-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetSession = () => {
    setRecallText('');
    setTimeElapsed(0);
    setIsTimerRunning(true);
    setShowAIReview(false);
    setAiFeedback('');
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  return (
    <div className={`fixed inset-0 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-blue-50 to-indigo-100'} z-50 flex flex-col`}>
      {/* Header */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg p-4 flex justify-between items-center`}>
        <div className="flex items-center gap-4">
          <button onClick={onClose} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
            <X size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold">📝 Blank Paper Mode</h1>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Viết tất cả những gì bạn nhớ được về: <strong>{subject.name}</strong>
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <Clock size={16} />
            <span className="font-mono">{formatTime(timeElapsed)}</span>
          </div>
          
          <div className="flex gap-2">
            <button onClick={exportRecall} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`} title="Xuất recall">
              <Download size={16} />
            </button>
            <button onClick={resetSession} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`} title="Bắt đầu lại">
              <Sparkles size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 overflow-hidden">
        {/* Recall Area */}
        <div className={`rounded-2xl shadow-xl flex flex-col ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-bold text-lg">🧠 Viết tất cả những gì bạn nhớ</h2>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Không nhìn tài liệu! Viết tự do, không cần sắp xếp
            </p>
          </div>
          
          <textarea
            ref={textareaRef}
            value={recallText}
            onChange={(e) => setRecallText(e.target.value)}
            placeholder="Bắt đầu viết tất cả kiến thức bạn nhớ được về môn học này... 
- Các khái niệm chính...
- Công thức quan trọng...
- Sự kiện, mốc thời gian...
- Mối quan hệ giữa các ý..."
            className={`flex-1 p-6 resize-none focus:outline-none text-lg leading-relaxed ${
              darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
            }`}
            disabled={!isTimerRunning}
          />
          
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between">
            <button
              onClick={handleSubmitRecall}
              disabled={!isTimerRunning || !recallText.trim()}
              className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-semibold transition"
            >
              Hoàn thành Recall
            </button>
            
            <div className="flex gap-2">
              <button
                onClick={generateAIFeedback}
                disabled={isTimerRunning || !recallText.trim() || isGeneratingFeedback}
                className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2"
              >
                <Brain size={16} />
                {isGeneratingFeedback ? 'AI đang phân tích...' : 'Nhận phản hồi AI'}
              </button>
            </div>
          </div>
        </div>

        {/* Review Area */}
        <div className={`rounded-2xl shadow-xl flex flex-col ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-bold text-lg">📊 Đánh giá & So sánh</h2>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {showAIReview ? 'Phản hồi từ AI Coach' : 'Sau khi hoàn thành recall, bạn có thể nhận phản hồi AI'}
            </p>
          </div>
          
          <div className="flex-1 p-6 overflow-y-auto">
            {showAIReview ? (
              <div className={`prose max-w-none ${darkMode ? 'prose-invert' : ''}`}>
                <pre className={`whitespace-pre-wrap font-sans text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {aiFeedback}
                </pre>
                
                <div className="mt-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-2">📚 So sánh với ghi chú</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    Bây giờ hãy mở ghi chú chính thức và so sánh với những gì bạn đã viết. 
                    Tìm các điểm thiếu sót và sai lệch để củng cố kiến thức.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-xl font-bold mb-2">Chờ bạn hoàn thành Recall</h3>
                <p className={`mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Viết tất cả kiến thức bạn nhớ được vào ô bên trái trước.
                  Sau khi hoàn thành, AI sẽ giúp bạn phân tích và đánh giá.
                </p>
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <h4 className="font-bold mb-2">💡 Mẹo Recall hiệu quả</h4>
                  <ul className="text-sm text-left space-y-1">
                    <li>• Viết tự do, không chỉnh sửa trong lúc viết</li>
                    <li>• Cố gắng nhớ cả các chi tiết nhỏ</li>
                    <li>• Sử dụng sơ đồ, bullet points nếu cần</li>
                    <li>• Đừng lo lắng về sai sót - quan trọng là quá trình nhớ lại</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlankPaperMode;