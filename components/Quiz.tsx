
import React, { useState } from 'react';
import type { QuizData } from '../types';

interface QuizProps {
  quizData: QuizData;
}

export const Quiz: React.FC<QuizProps> = ({ quizData }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const currentQuestion = quizData.questions[currentQuestionIndex];

  const handleAnswerSelect = (index: number) => {
    if (isAnswered) return;
    setSelectedAnswer(index);
    setIsAnswered(true);
    if (index === currentQuestion.correctAnswerIndex) {
      setScore(prev => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quizData.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    } else {
      setIsFinished(true);
    }
  };
  
  const handleRestart = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setScore(0);
    setIsFinished(false);
  }

  if (isFinished) {
    return (
      <div className="p-4 text-center">
        <h3 className="text-xl font-bold mb-2">Hoàn thành bài kiểm tra!</h3>
        <p className="text-lg mb-4">Điểm của bạn: <span className="font-bold text-green-500">{score}</span> / {quizData.questions.length}</p>
        <button
          onClick={handleRestart}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Làm lại
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <p className="font-semibold text-lg mb-4">Câu {currentQuestionIndex + 1}: {currentQuestion.questionText}</p>
      <div className="space-y-3">
        {currentQuestion.options.map((option, index) => {
          let buttonClass = "w-full text-left p-3 border rounded-lg transition-colors duration-200 disabled:cursor-not-allowed";
          if (isAnswered) {
            if (index === currentQuestion.correctAnswerIndex) {
              buttonClass += " bg-green-100 dark:bg-green-900 border-green-500 text-green-800 dark:text-green-200";
            } else if (index === selectedAnswer) {
              buttonClass += " bg-red-100 dark:bg-red-900 border-red-500 text-red-800 dark:text-red-200";
            } else {
               buttonClass += " border-gray-300 dark:border-gray-600"
            }
          } else {
             buttonClass += " border-gray-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-gray-700"
          }
          
          return (
            <button
              key={index}
              onClick={() => handleAnswerSelect(index)}
              disabled={isAnswered}
              className={buttonClass}
            >
              {option}
            </button>
          );
        })}
      </div>
      {isAnswered && (
        <div className="mt-4 text-right">
          <button
            onClick={handleNextQuestion}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            {currentQuestionIndex < quizData.questions.length - 1 ? 'Câu tiếp theo' : 'Hoàn thành'}
          </button>
        </div>
      )}
    </div>
  );
};