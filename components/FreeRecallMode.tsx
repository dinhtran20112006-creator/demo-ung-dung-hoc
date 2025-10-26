
import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Square } from 'lucide-react';

interface Subject {
    name: string;
    chapters: { topics: any[] }[];
}

interface FreeRecallModeProps {
    subject: Subject;
    onClose: () => void;
    darkMode: boolean;
}

export default function FreeRecallMode({ subject, onClose, darkMode }: FreeRecallModeProps) {
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  const [userInput, setUserInput] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [recallStarted, setRecallStarted] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let interval: number;
    if (isActive && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft(time => time - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleRecallComplete();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  useEffect(() => {
    const words = userInput.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
  }, [userInput]);

  const startRecall = () => {
    setIsActive(true);
    setRecallStarted(true);
    textareaRef.current?.focus();
  };

  const pauseRecall = () => {
    setIsActive(false);
  };

  const handleRecallComplete = () => {
    setIsActive(false);
    alert(`🎉 Hoàn thành Free Recall!\n\nBạn đã viết được ${wordCount} từ.`);
    onClose();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 ${darkMode ? 'dark' : ''}`}>
      <div className={`rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        
        <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex justify-between items-center">
            <div>
              <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                🧠 Free Recall Mode
              </h2>
              <p className={`mt-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {subject.name} - Viết tất cả những gì bạn nhớ trong 10 phút
              </p>
            </div>
            <button 
              onClick={onClose}
              className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-500'}`}
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className={`p-4 border-b ${darkMode ? 'border-gray-700 bg-gray-700/50' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`text-3xl font-mono font-bold ${
                timeLeft < 60 ? 'text-red-500' : darkMode ? 'text-green-400' : 'text-green-600'
              }`}>
                {formatTime(timeLeft)}
              </div>
              
              <div className="flex items-center gap-2">
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'
                }`}>
                  📝 {wordCount} từ
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {!recallStarted ? (
                <button onClick={startRecall} className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2">
                  <Play size={16} /> Bắt Đầu
                </button>
              ) : isActive ? (
                <button onClick={pauseRecall} className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2">
                  <Square size={16} /> Tạm Dừng
                </button>
              ) : (
                <button onClick={startRecall} className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2">
                  <Play size={16} /> Tiếp Tục
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-hidden">
          <textarea
            ref={textareaRef}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder={recallStarted 
              ? "Viết tất cả những gì bạn nhớ về môn học này... Đừng dừng lại, cứ viết tiếp!"
              : "Nhấn 'Bắt Đầu' để bắt đầu bài tập Free Recall"
            }
            disabled={!isActive}
            className={`w-full h-full p-4 rounded-lg border-2 text-lg resize-none focus:outline-none focus:border-blue-500 ${
              darkMode 
                ? 'bg-gray-900 text-white border-gray-600 placeholder-gray-500' 
                : 'bg-white text-gray-900 border-gray-300 placeholder-gray-400'
            } ${!isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
        </div>

        <div className={`p-4 border-t ${darkMode ? 'border-gray-700 bg-gray-700/50' : 'border-gray-200 bg-gray-50'}`}>
            <p className={`text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Mục tiêu: Viết liên tục để củng cố trí nhớ dài hạn. Đừng lo lắng về ngữ pháp hay chính tả.</p>
        </div>
      </div>
    </div>
  );
}