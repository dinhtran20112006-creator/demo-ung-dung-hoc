import React from 'react';
import { Award, TrendingUp, Target, Clock, Zap, Brain, RotateCcw } from 'lucide-react';
import type { QuizResult } from '../interfaces/quiz';

interface AdvancedQuizResultsProps {
  result: QuizResult;
  onRetry: () => void;
  onReview: () => void;
  onNewQuiz: () => void;
  darkMode: boolean;
}

const AdvancedQuizResults: React.FC<AdvancedQuizResultsProps> = ({
  result,
  onRetry,
  onReview,
  onNewQuiz,
  darkMode
}) => {
  const { session, totalScore, maxPossibleScore, accuracy, averageTimePerQuestion, categoryBreakdown, strengths, weaknesses, recommendations, rank, badgesEarned } = result;

  const getRankColor = () => {
    switch (rank) {
      case 'beginner': return 'text-gray-500 dark:text-gray-400';
      case 'intermediate': return 'text-blue-500 dark:text-blue-400';
      case 'advanced': return 'text-purple-500 dark:text-purple-400';
      case 'expert': return 'text-yellow-500 dark:text-yellow-400';
      default: return 'text-gray-500 dark:text-gray-400';
    }
  };

  const getRankLabel = () => {
    switch (rank) {
      case 'beginner': return 'Mới bắt đầu';
      case 'intermediate': return 'Trung cấp';
      case 'advanced': return 'Nâng cao';
      case 'expert': return 'Chuyên gia';
      default: return 'Mới bắt đầu';
    }
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-blue-950 to-indigo-950'} p-6`}>
      <div className={`max-w-6xl mx-auto ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-xl overflow-hidden`}>
        {/* Header */}
        <div className={`p-8 text-center ${
          accuracy >= 80 
            ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
            : accuracy >= 60
            ? 'bg-gradient-to-r from-yellow-500 to-orange-600'
            : 'bg-gradient-to-r from-red-500 to-pink-600'
        } text-white`}>
          <h1 className="text-4xl font-bold mb-4">Kết Quả Bài Kiểm Tra</h1>
          <div className="flex justify-center items-center gap-8">
            <div className="text-center">
              <div className="text-6xl font-bold">{accuracy.toFixed(1)}%</div>
              <div className="text-lg opacity-90">Độ chính xác</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold">{totalScore}</div>
              <div className="text-sm opacity-90">Điểm số</div>
            </div>
            <div className="text-center">
              <div className={`text-3xl font-bold`}>{getRankLabel()}</div>
              <div className="text-sm opacity-90">Hạng</div>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className={`p-4 rounded-lg text-center ${
              darkMode ? 'bg-gray-700' : 'bg-blue-50'
            }`}>
              <Target className="mx-auto mb-2 text-blue-500" size={24} />
              <div className="text-2xl font-bold">{session.userAnswers.filter(a => a.isCorrect).length}</div>
              <div className="text-sm opacity-75">Câu đúng</div>
            </div>
            
            <div className={`p-4 rounded-lg text-center ${
              darkMode ? 'bg-gray-700' : 'bg-green-50'
            }`}>
              <Zap className="mx-auto mb-2 text-green-500" size={24} />
              <div className="text-2xl font-bold">{session.maxStreak}</div>
              <div className="text-sm opacity-75">Chuỗi đúng cao nhất</div>
            </div>
            
            <div className={`p-4 rounded-lg text-center ${
              darkMode ? 'bg-gray-700' : 'bg-purple-50'
            }`}>
              <Clock className="mx-auto mb-2 text-purple-500" size={24} />
              <div className="text-2xl font-bold">{Math.round(averageTimePerQuestion)}s</div>
              <div className="text-sm opacity-75">Thời gian trung bình</div>
            </div>
            
            <div className={`p-4 rounded-lg text-center ${
              darkMode ? 'bg-gray-700' : 'bg-orange-50'
            }`}>
              <TrendingUp className="mx-auto mb-2 text-orange-500" size={24} />
              <div className="text-2xl font-bold">{Math.round((totalScore / maxPossibleScore) * 100)}%</div>
              <div className="text-sm opacity-75">Hiệu suất</div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* By Question Type */}
            <div>
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Brain size={20} />
                Phân tích theo loại câu hỏi
              </h3>
              <div className="space-y-3">
                {Object.entries(categoryBreakdown.byType).map(([type, data]: [string, any]) => (
                  <div key={type} className={`p-3 rounded-lg ${
                    darkMode ? 'bg-gray-700' : 'bg-gray-50'
                  }`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold capitalize">
                        {type.replace('-', ' ')}
                      </span>
                      <span className={`font-bold ${
                        data.accuracy >= 80 ? 'text-green-500' : 
                        data.accuracy >= 60 ? 'text-yellow-500' : 'text-red-500'
                      }`}>
                        {data.accuracy.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          data.accuracy >= 80 ? 'bg-green-500' : 
                          data.accuracy >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${data.accuracy}%` }}
                      ></div>
                    </div>
                    <div className="text-xs opacity-75 mt-1">
                      {data.correct} / {data.total} câu đúng
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* By Difficulty */}
            <div>
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Target size={20} />
                Phân tích theo độ khó
              </h3>
              <div className="space-y-3">
                {Object.entries(categoryBreakdown.byDifficulty).map(([difficulty, data]: [string, any]) => (
                  <div key={difficulty} className={`p-3 rounded-lg ${
                    darkMode ? 'bg-gray-700' : 'bg-gray-50'
                  }`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold capitalize">
                        {difficulty === 'easy' ? 'Dễ' : difficulty === 'medium' ? 'Trung bình' : 'Khó'}
                      </span>
                      <span className={`font-bold ${
                        data.accuracy >= 80 ? 'text-green-500' : 
                        data.accuracy >= 60 ? 'text-yellow-500' : 'text-red-500'
                      }`}>
                        {data.accuracy.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          data.accuracy >= 80 ? 'bg-green-500' : 
                          data.accuracy >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${data.accuracy}%` }}
                      ></div>
                    </div>
                    <div className="text-xs opacity-75 mt-1">
                      {data.correct} / {data.total} câu đúng
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Insights & Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Strengths */}
            <div>
              <h3 className="text-xl font-bold mb-4 text-green-600 dark:text-green-400">✅ Điểm mạnh</h3>
              <div className="space-y-2">
                {strengths.map((strength, index) => (
                  <div key={index} className={`p-3 rounded-lg ${
                    darkMode ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-200'
                  } border`}>
                    {strength}
                  </div>
                ))}
              </div>
            </div>

            {/* Weaknesses */}
            <div>
              <h3 className="text-xl font-bold mb-4 text-red-600 dark:text-red-400">🎯 Cần cải thiện</h3>
              <div className="space-y-2">
                {weaknesses.map((weakness, index) => (
                  <div key={index} className={`p-3 rounded-lg ${
                    darkMode ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-200'
                  } border`}>
                    {weakness}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Award size={20} className="text-indigo-500" />
              Đề xuất học tập
            </h3>
            <div className={`p-4 rounded-lg ${
              darkMode ? 'bg-indigo-900/20 border-indigo-700' : 'bg-indigo-50 border-indigo-200'
            } border`}>
              <div className="space-y-2">
                {recommendations.map((rec, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Badges Earned */}
          {badgesEarned.length > 0 && (
            <div>
              <h3 className="text-xl font-bold mb-4">🏆 Huy hiệu đạt được</h3>
              <div className="flex flex-wrap gap-3">
                {badgesEarned.map((badge, index) => (
                  <div key={index} className={`px-4 py-2 rounded-full ${
                    darkMode ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-100 text-yellow-800'
                  } font-semibold`}>
                    {badge}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-center gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onRetry}
              className="bg-indigo-500 hover:bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              <RotateCcw size={16} />
              Làm lại bài này
            </button>
            <button
              onClick={onReview}
              className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              Xem lại câu sai
            </button>
            <button
              onClick={onNewQuiz}
              className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              Bài kiểm tra mới
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedQuizResults;