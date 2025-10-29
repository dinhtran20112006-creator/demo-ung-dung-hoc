// components/ModernFlashcard.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX, RotateCcw, Zap, Lightbulb, Target, X } from 'lucide-react';

interface ModernFlashcardProps {
  question: string;
  answer: string;
  revealed: boolean;
  onReveal: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onExit: () => void;
  currentIndex: number;
  totalCards: number;
  darkMode: boolean;
  onConfidenceSelect: (confidence: string) => void;
  isAI?: boolean;
  difficulty?: string;
  type?: string;
}

const ModernFlashcard: React.FC<ModernFlashcardProps> = ({
  question,
  answer,
  revealed,
  onReveal,
  onNext,
  onPrevious,
  onExit,
  currentIndex,
  totalCards,
  darkMode,
  onConfidenceSelect,
  isAI = false,
  difficulty,
  type
}) => {
  const [isFlipping, setIsFlipping] = useState(false);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [hintLevel, setHintLevel] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const hints = [
    "Hãy thử nhớ lại các từ khóa chính...",
    "Liên hệ với kiến thức bạn đã biết...",
    "Suy nghĩ về bối cảnh hoặc ví dụ...",
    "Đây là gợi ý cuối cùng trước khi xem đáp án!"
  ];

  const speakText = (text: string) => {
    if (!isAudioOn || !('speechSynthesis' in window)) return;
    
    window.speechSynthesis.cancel();
    
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = 'vi-VN';
    speech.rate = 0.8;
    speech.volume = 0.7;
    window.speechSynthesis.speak(speech);
  };

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleReveal = () => {
    if (revealed) return;
    
    setIsFlipping(true);
    setTimeout(() => {
      onReveal();
      setIsFlipping(false);
      if (isAudioOn) {
        setTimeout(() => speakText(`Đáp án: ${answer}`), 300);
      }
    }, 300);
  };

  const handleHint = () => {
    if (revealed) return;
    
    if (hintLevel < hints.length - 1) {
      setHintLevel(prev => prev + 1);
      speakText(hints[hintLevel]);
    } else {
      handleReveal();
    }
  };

  const getDifficultyColor = (diff?: string) => {
    switch (diff) {
      case 'easy': return 'text-green-500';
      case 'medium': return 'text-yellow-500';
      case 'hard': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getTypeColor = (type?: string) => {
    switch (type) {
      case 'concept': return 'text-blue-500';
      case 'application': return 'text-purple-500';
      case 'analysis': return 'text-pink-500';
      case 'evaluation': return 'text-orange-500';
      default: return 'text-gray-500';
    }
  };

  useEffect(() => {
    if (isAudioOn && !revealed) {
      speakText(question);
    }
  }, [question, isAudioOn, revealed]);

  return (
    <div className={`w-full max-w-2xl mx-auto ${darkMode ? 'text-white' : 'text-gray-800'}`}>
      {/* Header with card info */}
      <div className="flex justify-between items-center mb-4 px-2">
        <div className="flex items-center gap-4">
          <span className={`text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {currentIndex + 1} / {totalCards}
          </span>
          {isAI && (
            <span className="px-2 py-1 bg-gradient-to-r from-green-500 to-teal-600 text-white text-xs rounded-full">
              🤖 AI
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAudioOn(!isAudioOn)}
            className={`p-2 rounded-full transition-colors ${
              darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
            }`}
            title={isAudioOn ? "Tắt âm thanh" : "Bật âm thanh"}
          >
            {isAudioOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          
          <button
            onClick={handleHint}
            disabled={revealed}
            className={`p-2 rounded-full transition-colors ${
              darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
            } ${revealed ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Gợi ý"
          >
            <Lightbulb size={18} />
          </button>

          <button
            onClick={onExit}
            className={`p-2 rounded-full transition-colors ${
              darkMode ? 'hover:bg-red-700' : 'hover:bg-red-200'
            }`}
            title="Thoát"
          >
            <X size={18} className="text-red-500" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-6">
        <div 
          className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500 shadow-lg"
          style={{ width: `${((currentIndex + 1) / totalCards) * 100}%` }}
        />
      </div>

      {/* Flashcard */}
      <div className="flip-container">
        <div
          ref={cardRef}
          className={`flip-card cursor-pointer ${revealed ? 'flipped' : ''} ${
            isFlipping ? 'scale-95' : 'scale-100'
          }`}
          onClick={!revealed ? handleReveal : undefined}
        >
          {/* Front - Question */}
          <div className={`flip-front rounded-2xl p-8 min-h-[400px] flex flex-col justify-center items-center text-center shadow-2xl border-2 ${
            darkMode 
              ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-indigo-500' 
              : 'bg-gradient-to-br from-white to-blue-50 border-indigo-300'
          }`}>
            
            <div className="absolute top-4 right-4 w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
            
            <div className="w-full max-w-lg">
              <div className="flex justify-center mb-6">
                <Target className="text-indigo-500 float-animation" size={32} />
              </div>
              
              <h3 className="text-2xl font-bold mb-6 leading-relaxed px-4">
                {question}
              </h3>
              
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                {difficulty && (
                  <div className={`px-4 py-2 rounded-full text-sm font-semibold border-2 ${
                    darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-white/50 border-gray-200'
                  }`}>
                    <span className={getDifficultyColor(difficulty)}>
                      {difficulty === 'easy' ? '🟢 Dễ' : 
                       difficulty === 'medium' ? '🟡 Trung bình' : 
                       '🔴 Khó'}
                    </span>
                  </div>
                )}
                
                {type && (
                  <div className={`px-4 py-2 rounded-full text-sm font-semibold border-2 ${
                    darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-white/50 border-gray-200'
                  }`}>
                    <span className={getTypeColor(type)}>
                      {type === 'concept' ? '📚 Khái niệm' :
                       type === 'application' ? '⚡ Ứng dụng' :
                       type === 'analysis' ? '🔍 Phân tích' :
                       '🎯 Đánh giá'}
                    </span>
                  </div>
                )}
              </div>

              {hintLevel > 0 && (
                <div className={`mt-6 p-4 rounded-xl border-2 ${
                  darkMode ? 'bg-blue-900/30 border-blue-600' : 'bg-blue-50 border-blue-200'
                }`}>
                  <p className="text-sm font-medium flex items-center justify-center gap-2">
                    <span className="text-yellow-500">💡</span>
                    {hints[hintLevel - 1]}
                  </p>
                </div>
              )}
            </div>

            {!revealed && (
              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
                <p className="text-sm text-gray-500 dark:text-gray-400 animate-bounce flex items-center gap-2">
                  <span>👆</span>
                  Nhấn để lật thẻ hoặc dùng phím Space
                </p>
              </div>
            )}
          </div>

          {/* Back - Answer */}
          <div className={`flip-back rounded-2xl p-8 min-h-[400px] flex flex-col justify-center items-center text-center shadow-2xl border-2 ${
            darkMode 
              ? 'bg-gradient-to-br from-green-900/80 to-emerald-900/80 border-green-500' 
              : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-400'
          }`}>
            
            <div className="w-full max-w-lg">
              <div className="flex justify-center mb-6">
                <Zap className="text-green-500 float-animation" size={32} />
              </div>
              
              <h3 className="text-lg font-semibold mb-4 text-green-600 dark:text-green-400">
                Đáp án:
              </h3>
              
              <p className="text-xl leading-relaxed mb-8 px-4">
                {answer}
              </p>

              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-lg mx-auto">
                {[
                  { value: 'red', label: 'Không nhớ', emoji: '😫', color: 'bg-red-500 hover:bg-red-600' },
                  { value: 'orange', label: 'Hơi nhớ', emoji: '😕', color: 'bg-orange-500 hover:bg-orange-600' },
                  { value: 'yellow', label: 'Nhớ tốt', emoji: '😊', color: 'bg-yellow-500 hover:bg-yellow-600' },
                  { value: 'green', label: 'Xuất sắc', emoji: '🎉', color: 'bg-green-500 hover:bg-green-600' }
                ].map((level) => (
                  <button
                    key={level.value}
                    onClick={() => onConfidenceSelect(level.value)}
                    className={`${level.color} confidence-btn text-white p-4 rounded-xl font-semibold transition-all transform hover:scale-105 flex flex-col items-center justify-center gap-2 min-h-[80px]`}
                  >
                    <span className="text-2xl">{level.emoji}</span>
                    <span className="text-xs">{level.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center mt-8 px-4">
        <button
          onClick={onPrevious}
          disabled={currentIndex === 0}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
            currentIndex === 0 
              ? 'opacity-50 cursor-not-allowed' 
              : darkMode 
                ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
          }`}
        >
          ← Trước
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setHintLevel(0);
              if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
              }
            }}
            className={`p-3 rounded-full transition ${
              darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
            }`}
            title="Đặt lại"
          >
            <RotateCcw size={20} />
          </button>
        </div>

        <button
          onClick={onNext}
          disabled={!revealed}
          className={`flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
        >
          Tiếp theo →
        </button>
      </div>

      {/* Shortcuts */}
      <div className="mt-6 text-center">
        <div className="inline-flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-gray-800/50 px-4 py-2 rounded-full">
          <span>Space: Lật thẻ</span>
          <span>1-4: Đánh giá</span>
          <span>←→: Điều hướng</span>
          <span>H: Gợi ý</span>
          <span>ESC: Thoát</span>
        </div>
      </div>
    </div>
  );
};

export default ModernFlashcard;