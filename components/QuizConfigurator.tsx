import React, { useState } from 'react';
import { Settings, Clock, Target, Zap, Star, Award } from 'lucide-react';
import type { Subject, QuizConfig, QuestionType } from '../interfaces/quiz';

interface QuizConfiguratorProps {
  subjects: Subject[];
  onCreateQuiz: (config: QuizConfig) => void;
  onClose: () => void;
  darkMode: boolean;
}

const QuizConfigurator: React.FC<QuizConfiguratorProps> = ({
  subjects,
  onCreateQuiz,
  onClose,
  darkMode
}) => {
  const [config, setConfig] = useState<QuizConfig>({
    id: `config-${Date.now()}`,
    name: 'Bài kiểm tra mới',
    subjectId: subjects[0]?.id || 0,
    chapterIds: [],
    questionCount: 10,
    timeLimit: 30,
    questionTypes: ['multiple-choice', 'true-false', 'fill-blank'],
    difficulties: ['easy', 'medium', 'hard'],
    scoring: {
      pointsPerQuestion: 10,
      timeBonus: true,
      streakBonus: true,
      penaltyForWrong: false
    },
    retryMode: 'immediate',
    showExplanations: true
  });

  const selectedSubject = subjects.find(s => s.id === config.subjectId);

  const questionTypeOptions: { value: QuestionType; label: string; icon: string }[] = [
    { value: 'multiple-choice', label: 'Trắc nghiệm', icon: '🔘' },
    { value: 'true-false', label: 'Đúng/Sai', icon: '✅' },
    { value: 'fill-blank', label: 'Điền khuyết', icon: '📝' },
    { value: 'short-answer', label: 'Tự luận ngắn', icon: '✏️' }
  ];

  const difficultyOptions = [
    { value: 'easy', label: 'Dễ', color: 'bg-green-500' },
    { value: 'medium', label: 'Trung bình', color: 'bg-yellow-500' },
    { value: 'hard', label: 'Khó', color: 'bg-red-500' }
  ];

  const handleCreateQuiz = () => {
    if (config.chapterIds.length === 0 && selectedSubject) {
      config.chapterIds = selectedSubject.chapters.map(c => c.id);
    }
    
    if (config.chapterIds.length === 0) {
      alert('Vui lòng chọn ít nhất một chương!');
      return;
    }
    
    onCreateQuiz(config);
  };

  const toggleChapter = (chapterId: number) => {
    setConfig(prev => ({
      ...prev,
      chapterIds: prev.chapterIds.includes(chapterId)
        ? prev.chapterIds.filter(id => id !== chapterId)
        : [...prev.chapterIds, chapterId]
    }));
  };

  const toggleQuestionType = (type: QuestionType) => {
    setConfig(prev => ({
      ...prev,
      questionTypes: prev.questionTypes.includes(type)
        ? prev.questionTypes.filter(t => t !== type)
        : [...prev.questionTypes, type]
    }));
  };

  const toggleDifficulty = (difficulty: 'easy' | 'medium' | 'hard') => {
    setConfig(prev => ({
      ...prev,
      difficulties: prev.difficulties.includes(difficulty)
        ? prev.difficulties.filter(d => d !== difficulty)
        : [...prev.difficulties, difficulty]
    }));
  };

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 ${darkMode ? 'dark' : ''}`}>
      <div className={`rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto ${
        darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
      } shadow-2xl`}>
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Settings className="text-indigo-500" size={24} />
            <div>
              <h2 className="text-2xl font-bold">Cấu hình Quiz</h2>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Tùy chỉnh bài kiểm tra theo nhu cầu của bạn
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg ${
              darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            } transition-colors`}
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block font-semibold mb-2">Tên bài kiểm tra</label>
              <input
                type="text"
                value={config.name}
                onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
                className={`w-full p-3 border-2 rounded-lg focus:outline-none focus:border-indigo-500 ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder="Nhập tên bài kiểm tra..."
              />
            </div>

            <div>
              <label className="block font-semibold mb-2">Môn học</label>
              <select
                value={config.subjectId}
                onChange={(e) => setConfig(prev => ({ ...prev, subjectId: Number(e.target.value), chapterIds: [] }))}
                className={`w-full p-3 border-2 rounded-lg focus:outline-none focus:border-indigo-500 ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                {subjects.map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Chapter Selection */}
          <div>
            <label className="block font-semibold mb-3">Chọn chương</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 border rounded-lg">
              {selectedSubject?.chapters.map(chapter => (
                <label key={chapter.id} className="flex items-center space-x-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.chapterIds.includes(chapter.id)}
                    onChange={() => toggleChapter(chapter.id)}
                    className="rounded text-indigo-500 focus:ring-indigo-500"
                  />
                  <span className="text-sm">{chapter.name}</span>
                </label>
              ))}
            </div>
            {selectedSubject?.chapters.length === 0 && (
              <p className="text-sm text-red-500 mt-2">Môn học này chưa có chương nào</p>
            )}
          </div>

          {/* Quiz Settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block font-semibold mb-2 flex items-center gap-2">
                <Target size={16} />
                Số câu hỏi
              </label>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={config.questionCount}
                onChange={(e) => setConfig(prev => ({ ...prev, questionCount: Number(e.target.value) }))}
                className="w-full"
              />
              <div className="text-center font-semibold text-indigo-500">{config.questionCount} câu</div>
            </div>

            <div>
              <label className="block font-semibold mb-2 flex items-center gap-2">
                <Clock size={16} />
                Thời gian (phút)
              </label>
              <input
                type="range"
                min="5"
                max="120"
                step="5"
                value={config.timeLimit}
                onChange={(e) => setConfig(prev => ({ ...prev, timeLimit: Number(e.target.value) }))}
                className="w-full"
              />
              <div className="text-center font-semibold text-indigo-500">{config.timeLimit} phút</div>
            </div>

            <div>
              <label className="block font-semibold mb-2 flex items-center gap-2">
                <Zap size={16} />
                Điểm mỗi câu
              </label>
              <select
                value={config.scoring.pointsPerQuestion}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  scoring: { ...prev.scoring, pointsPerQuestion: Number(e.target.value) }
                }))}
                className={`w-full p-2 border rounded ${
                  darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                }`}
              >
                <option value={5}>5 điểm</option>
                <option value={10}>10 điểm</option>
                <option value={15}>15 điểm</option>
                <option value={20}>20 điểm</option>
              </select>
            </div>
          </div>

          {/* Question Types */}
          <div>
            <label className="block font-semibold mb-3">Loại câu hỏi</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {questionTypeOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => toggleQuestionType(option.value)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    config.questionTypes.includes(option.value)
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                      : `border-gray-200 dark:border-gray-600 ${
                          darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                        }`
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{option.icon}</span>
                    <span className="font-medium">{option.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty Levels */}
          <div>
            <label className="block font-semibold mb-3">Độ khó</label>
            <div className="flex gap-3">
              {difficultyOptions.map(option => (
                <button
                  key={option.value as string}
                  onClick={() => toggleDifficulty(option.value as 'easy' | 'medium' | 'hard')}
                  className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                    config.difficulties.includes(option.value as 'easy' | 'medium' | 'hard')
                      ? `${option.color} text-white border-transparent`
                      : `border-gray-200 dark:border-gray-600 ${
                          darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                        }`
                  }`}
                >
                  <div className="font-medium">{option.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Settings */}
          <div className={`p-4 rounded-lg ${
            darkMode ? 'bg-gray-700' : 'bg-gray-50'
          }`}>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Award size={16} />
              Cài đặt nâng cao
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={config.scoring.timeBonus}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    scoring: { ...prev.scoring, timeBonus: e.target.checked }
                  }))}
                  className="rounded text-indigo-500 focus:ring-indigo-500"
                />
                <span className="text-sm">Bonus thời gian</span>
              </label>

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={config.scoring.streakBonus}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    scoring: { ...prev.scoring, streakBonus: e.target.checked }
                  }))}
                  className="rounded text-indigo-500 focus:ring-indigo-500"
                />
                <span className="text-sm">Bonus chuỗi đúng</span>
              </label>

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={config.scoring.penaltyForWrong}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    scoring: { ...prev.scoring, penaltyForWrong: e.target.checked }
                  }))}
                  className="rounded text-indigo-500 focus:ring-indigo-500"
                />
                <span className="text-sm">Trừ điểm khi sai</span>
              </label>

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={config.showExplanations}
                  onChange={(e) => setConfig(prev => ({ ...prev, showExplanations: e.target.checked }))}
                  className="rounded text-indigo-500 focus:ring-indigo-500"
                />
                <span className="text-sm">Hiển thị giải thích</span>
              </label>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className={`px-6 py-2 rounded-lg font-semibold ${
              darkMode 
                ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            } transition-colors`}
          >
            Hủy
          </button>
          <button
            onClick={handleCreateQuiz}
            disabled={config.chapterIds.length === 0}
            className="bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
          >
            <Star size={16} />
            Tạo Quiz
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizConfigurator;
