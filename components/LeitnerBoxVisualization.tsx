
import React from 'react';
import { BarChart3, Zap } from 'lucide-react';
import { EnhancedSpacedRepetition } from '../enhanced-spaced-repetition';

// FIX: Updated Topic interface to include 'id' required by `getMasteryLevel` and removed unused `easeFactor`.
interface Topic {
    id: number;
    interval?: number;
    repetitions?: number;
}

interface Subject {
    chapters: { topics: Topic[] }[];
}

interface LeitnerBoxVisualizationProps {
    subjects: Subject[];
    darkMode: boolean;
}

export default function LeitnerBoxVisualization({ subjects, darkMode }: LeitnerBoxVisualizationProps) {
  const spacedRepetition = new EnhancedSpacedRepetition();
  
  const calculateMasteryDistribution = () => {
    const allTopics = subjects.flatMap(subject => 
      subject.chapters?.flatMap(chapter => chapter.topics) || []
    );

    const distribution = [0, 0, 0, 0, 0, 0]; // 6 levels
    
    allTopics.forEach(topic => {
      const level = spacedRepetition.getMasteryLevel(topic);
      distribution[level]++;
    });

    return distribution;
  };

  const distribution = calculateMasteryDistribution();
  const totalTopics = distribution.reduce((sum, count) => sum + count, 0);
  
  const getProgressPercentage = (count: number) => {
    return totalTopics > 0 ? (count / totalTopics) * 100 : 0;
  };

  const getMasteryScore = () => {
    if (totalTopics === 0) return 0;
    
    const weightedScore = distribution.reduce((score, count, level) => {
      return score + (count * level);
    }, 0);
    
    // Max possible score is totalTopics * 5 (level 5)
    const maxScore = totalTopics * 5;
    if (maxScore === 0) return 0;
    
    return Math.round((weightedScore / maxScore) * 100);
  };

  const masteryScore = getMasteryScore();

  return (
    <div className={`rounded-2xl p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
      <div className="flex items-center gap-3 mb-6">
        <div className={`p-2 rounded-lg ${darkMode ? 'bg-blue-900' : 'bg-blue-100'}`}>
          <BarChart3 className={darkMode ? 'text-blue-300' : 'text-blue-600'} size={24} />
        </div>
        <div>
          <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            📊 Phân tích thành thạo
          </h3>
          <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
            Theo dõi tiến độ học tập của bạn
          </p>
        </div>
      </div>

      <div className={`mb-6 p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
        <div className="flex items-center justify-between mb-2">
          <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Điểm thành thạo</span>
          <span className={`text-2xl font-bold ${
            masteryScore >= 80 ? 'text-green-500' :
            masteryScore >= 60 ? 'text-yellow-500' : 'text-red-500'
          }`}>
            {masteryScore}%
          </span>
        </div>
        <div className={`w-full rounded-full h-2 ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
          <div 
            className={`h-2 rounded-full ${
              masteryScore >= 80 ? 'bg-green-500' :
              masteryScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${masteryScore}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {distribution.map((count, level) => (
          <div
            key={level}
            className={`p-3 rounded-lg text-center transition-transform hover:scale-105 ${
              spacedRepetition.getMasteryColor(level)
            } text-white`}
          >
            <div className="text-2xl font-bold mb-1">{count}</div>
            <div className="text-xs opacity-90">
              {spacedRepetition.getMasteryLabel(level)}
            </div>
            <div className="text-xs mt-1 opacity-75">
              {getProgressPercentage(count).toFixed(1)}%
            </div>
          </div>
        ))}
      </div>

      <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
        <h4 className={`font-semibold mb-3 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          <Zap size={16} />
          Gợi ý học tập
        </h4>
        
        <div className="space-y-2 text-sm">
          {totalTopics === 0 ? (
             <div className="flex items-center gap-2">
                 <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Thêm câu hỏi để bắt đầu phân tích!</span>
             </div>
          ) : (
            <>
              {distribution[0] > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                  <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                    Ôn <strong>{distribution[0]} thẻ mới</strong> ngay hôm nay
                  </span>
                </div>
              )}
              
              {distribution[1] + distribution[2] > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full flex-shrink-0"></div>
                  <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                    <strong>{distribution[1] + distribution[2]} thẻ trẻ</strong> cần ôn trong 3-7 ngày tới
                  </span>
                </div>
              )}
              
              {masteryScore < 70 && totalTopics > 10 && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                  <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                    Tập trung vào <strong>Active Recall</strong> để tăng điểm thành thạo
                  </span>
                </div>
              )}
              
              {masteryScore >= 80 && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                  <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                    Xuất sắc! Duy trì lịch ôn tập hiện tại
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}