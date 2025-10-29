import React, { useState, useEffect, useRef } from 'react';
import { X, Clock, Zap, Flag, SkipForward, Volume2, VolumeX } from 'lucide-react';
import type { QuizSession, QuizQuestion } from '../interfaces/quiz';

interface EnhancedQuizSessionProps {
  session: QuizSession;
  onAnswer: (questionId: string, answer: string, timeSpent: number) => void;
  onComplete: () => void;
  onExit: () => void;
  darkMode: boolean;
}

const EnhancedQuizSession: React.FC<EnhancedQuizSessionProps> = ({
  session,
  onAnswer,
  onComplete,
  onExit,
  darkMode
}) => {
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(session.config.timeLimit * 60);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [isPaused, setIsPaused] = useState(false);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  // FIX: The useRef hook requires an initial value. Initializing with null and updating the type to allow null resolves the TypeScript error.
  const timerRef = useRef<number | null>(null);

  const currentQuestion = session.questions[session.currentQuestionIndex];
  const progress = ((session.currentQuestionIndex + 1) / session.questions.length) * 100;

  useEffect(() => {
    if (isPaused) {
        if(timerRef.current) clearInterval(timerRef.current);
        return;
    }

    timerRef.current = window.setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPaused, session.currentQuestionIndex]); // Relaunch timer when question changes and not paused

  useEffect(() => {
    setQuestionStartTime(Date.now());
    setCurrentAnswer('');
  }, [session.currentQuestionIndex]);

  const handleTimeUp = () => {
    // FIX: The timer will be cleared by the useEffect cleanup when the component unmounts after onComplete is called.
    // This prevents potential race conditions.
    onComplete();
  };

  const handleSubmitAnswer = (isTimeUp = false) => {
    const timeSpent = (Date.now() - questionStartTime) / 1000;
    onAnswer(currentQuestion.id, isTimeUp ? '' : currentAnswer, timeSpent);
    setCurrentAnswer('');
  };

  const handleSkip = () => {
    const timeSpent = (Date.now() - questionStartTime) / 1000;
    onAnswer(currentQuestion.id, '', timeSpent);
    setCurrentAnswer('');
  };


  const toggleFlag = () => {
    const newFlagged = new Set(flaggedQuestions);
    if (newFlagged.has(currentQuestion.id)) {
      newFlagged.delete(currentQuestion.id);
    } else {
      newFlagged.add(currentQuestion.id);
    }
    setFlaggedQuestions(newFlagged);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = () => {
    if (timeRemaining < 300) return 'text-red-500';
    if (timeRemaining < 600) return 'text-yellow-500';
    return darkMode ? 'text-green-400' : 'text-green-600';
  };

  const renderQuestion = () => {
    switch (currentQuestion.type) {
      case 'multiple-choice':
        return (
          <div className="space-y-3">
            {currentQuestion.options?.map((option, index) => (
              <button
                key={index}
                onClick={() => setCurrentAnswer(option)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  currentAnswer === option
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                    : `border-gray-200 dark:border-gray-600 ${
                        darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                      }`
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    currentAnswer === option 
                      ? 'border-indigo-500 bg-indigo-500 text-white' 
                      : 'border-gray-300 dark:border-gray-500'
                  }`}>
                    {currentAnswer === option && '✓'}
                  </div>
                  <span>{option}</span>
                </div>
              </button>
            ))}
          </div>
        );

      case 'true-false':
        return (
          <div className="grid grid-cols-2 gap-4">
            {['Đúng', 'Sai'].map(option => (
              <button
                key={option}
                onClick={() => setCurrentAnswer(option)}
                className={`p-6 rounded-lg border-2 text-lg font-semibold transition-all ${
                  currentAnswer === option
                    ? option === 'Đúng'
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                      : 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                    : `border-gray-200 dark:border-gray-600 ${
                        darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                      }`
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        );

      case 'fill-blank':
        return (
          <div className="space-y-4">
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <p className="text-lg">{currentQuestion.question.replace('______', '__________')}</p>
            </div>
            <input
              type="text"
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              placeholder="Nhập câu trả lời của bạn..."
              className={`w-full p-4 border-2 rounded-lg focus:outline-none focus:border-indigo-500 text-lg ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>
        );

      case 'short-answer':
        return (
          <textarea
            value={currentAnswer}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            placeholder="Viết câu trả lời của bạn ở đây..."
            rows={6}
            className={`w-full p-4 border-2 rounded-lg focus:outline-none focus:border-indigo-500 resize-none ${
              darkMode 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          />
        );

      default:
        return <div>Loại câu hỏi chưa được hỗ trợ</div>;
    }
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-800'} flex flex-col`}>
      {/* Header */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg p-4`}>
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={onExit}
                className={`p-2 rounded-lg ${
                  darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                } transition-colors`}
              >
                <X size={20} />
              </button>
              <div>
                <h1 className="text-xl font-bold">{session.config.name}</h1>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Câu {session.currentQuestionIndex + 1} / {session.questions.length}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {session.streak > 0 && (
                <div className="flex items-center gap-2 bg-orange-500 text-white px-3 py-1 rounded-full">
                  <Zap size={16} />
                  <span className="font-semibold">{session.streak}</span>
                </div>
              )}

              <div className={`px-3 py-1 rounded-full ${
                darkMode ? 'bg-gray-700' : 'bg-gray-100'
              }`}>
                <span className="font-semibold">{session.score} điểm</span>
              </div>

              <div className={`flex items-center gap-2 px-3 py-1 rounded-full font-mono text-lg font-semibold ${getTimeColor()}`}>
                <Clock size={16} />
                <span>{formatTime(timeRemaining)}</span>
              </div>

              <button
                onClick={() => setIsAudioOn(!isAudioOn)}
                className={`p-2 rounded-lg ${
                  darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                } transition-colors`}
              >
                {isAudioOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>

              <button
                onClick={() => setIsPaused(!isPaused)}
                className={`px-3 py-1 rounded-lg font-semibold ${
                  isPaused 
                    ? 'bg-green-500 hover:bg-green-600 text-white' 
                    : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                } transition-colors`}
              >
                {isPaused ? 'Tiếp tục' : 'Tạm dừng'}
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 max-w-4xl mx-auto w-full">
        <div className={`rounded-2xl shadow-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} p-8`}>
          {/* Question Header */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  currentQuestion.difficulty === 'easy' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                    : currentQuestion.difficulty === 'medium'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                }`}>
                  {currentQuestion.difficulty === 'easy' ? 'Dễ' : 
                   currentQuestion.difficulty === 'medium' ? 'Trung bình' : 'Khó'}
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  darkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-800'
                }`}>
                  {currentQuestion.points} điểm
                </div>
              </div>
              
              <h2 className="text-2xl font-bold leading-relaxed">
                {currentQuestion.question}
              </h2>
            </div>

            <button
              onClick={toggleFlag}
              className={`p-2 rounded-lg transition-colors ${
                flaggedQuestions.has(currentQuestion.id)
                  ? 'text-red-500 bg-red-50 dark:bg-red-900/20'
                  : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
            >
              <Flag size={20} fill={flaggedQuestions.has(currentQuestion.id) ? 'currentColor' : 'none'} />
            </button>
          </div>

          {/* Question Content */}
          <div className="mb-8">
            {renderQuestion()}
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center">
            <button
              onClick={handleSkip}
              disabled={session.currentQuestionIndex >= session.questions.length - 1}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
            >
              <SkipForward size={16} />
              Bỏ qua
            </button>

            <div className="flex gap-3">
              {session.config.retryMode === 'immediate' && (
                <button
                  onClick={() => setCurrentAnswer('')}
                  className="px-6 py-2 rounded-lg border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Làm lại
                </button>
              )}

              <button
                onClick={() => handleSubmitAnswer()}
                disabled={!currentAnswer.trim() && (currentQuestion.type === 'fill-blank' || currentQuestion.type === 'short-answer')}
                className="bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-400 text-white px-8 py-2 rounded-lg font-semibold transition-colors"
              >
                {session.currentQuestionIndex < session.questions.length - 1 ? 'Tiếp theo' : 'Kết thúc'}
              </button>
            </div>
          </div>
        </div>

        {/* Question Navigation */}
        <div className={`mt-6 p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
          <h3 className="font-semibold mb-3">Danh sách câu hỏi</h3>
          <div className="grid grid-cols-10 gap-2">
            {session.questions.map((question, index) => {
              const userAnswer = session.userAnswers.find(a => a.questionId === question.id);
              const isCurrent = index === session.currentQuestionIndex;
              const isAnswered = !!userAnswer;
              const isFlagged = flaggedQuestions.has(question.id);
              
              return (
                <button
                  key={question.id}
                  className={`w-8 h-8 rounded text-sm font-semibold transition-all ${
                    isCurrent
                      ? 'bg-indigo-500 text-white ring-2 ring-indigo-300'
                      : isAnswered
                      ? userAnswer.isCorrect
                        ? 'bg-green-500 text-white'
                        : 'bg-red-500 text-white'
                      : `${
                          darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                        }`
                  } ${isFlagged ? 'ring-2 ring-yellow-400' : ''}`}
                >
{/* FIX: The component was truncated. Added the missing content to close the component and export it. */}
                  {index + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedQuizSession;
