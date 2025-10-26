
import React from 'react';
import { Play, RefreshCw, Brain, Target, Zap, Clock, Shuffle } from 'lucide-react';

interface Subject {
    id: number;
    name: string;
    chapters: { topics: any[] }[];
}

interface EnhancedStudyModeSelectorProps {
  subject: Subject;
  onSelectMode: (modeId: string) => void;
  darkMode: boolean;
  algorithmStats?: any;
}

const EnhancedStudyModeSelector: React.FC<EnhancedStudyModeSelectorProps> = ({
  subject,
  onSelectMode,
  darkMode,
  algorithmStats
}) => {
  const studyModes = [
    {
      id: 'spaced-repetition',
      name: '🔄 Học theo Spaced Repetition',
      description: 'Học các câu hỏi đến hạn ôn tập',
      algorithm: algorithmStats?.fsrs ? `FSRS (${algorithmStats.fsrs.retentionRate.toFixed(1)}% retention)` : 'FSRS'
    },
    {
      id: 'weakest-first', 
      name: '🎯 Học điểm yếu',
      description: 'Tập trung vào các câu hỏi có độ ổn định thấp',
      algorithm: algorithmStats?.leitner ? `Leitner (${algorithmStats.leitner.retentionRate.toFixed(1)}% retention)` : 'Leitner'
    },
    {
      id: 'free-recall',
      name: '🧠 Blank Paper (Free Recall)',
      description: 'Tự nhớ lại kiến thức không nhìn đáp án'
    },
    {
      id: 'interleaved',
      name: '🔀 Học tổng hợp',
      description: 'Học ngẫu nhiên tất cả câu hỏi'
    }
  ];

  return (
    <div className={`mb-6 p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-blue-50'} border-2 ${darkMode ? 'border-blue-500' : 'border-blue-300'}`}>
      <h4 className="font-bold mb-3">🚀 Chế độ học thông minh</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {studyModes.map(mode => (
          <button
            key={mode.id}
            onClick={() => onSelectMode(mode.id)}
            className={`p-3 rounded-lg text-left transition ${
              darkMode 
                ? 'bg-gray-600 hover:bg-gray-500' 
                : 'bg-white hover:bg-blue-100'
            } border ${darkMode ? 'border-gray-500' : 'border-blue-200'}`}
          >
            <div className="font-semibold">{mode.name}</div>
            <div className="text-sm opacity-75 mt-1">{mode.description}</div>
            {mode.algorithm && (
              <div className="text-xs mt-2 text-green-600 dark:text-green-400">
                {mode.algorithm}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default EnhancedStudyModeSelector;