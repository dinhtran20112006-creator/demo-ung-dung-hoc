
import React from 'react';
import { BookOpenIcon } from './icons';

interface WelcomeScreenProps {
  onTopicSelect: (topic: string) => void;
}

const suggestedTopics = [
  "Quang hợp là gì?",
  "Thuyết tương đối của Einstein",
  "Cách hoạt động của Blockchain",
  "Lịch sử của Internet"
];

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onTopicSelect }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-4 text-center">
      <BookOpenIcon className="h-24 w-24 text-blue-400 mb-6" />
      <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Chào mừng bạn đến với Trợ lý học tập AI</h2>
      <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mb-8">
        Nhập bất kỳ chủ đề nào bạn muốn tìm hiểu, và tôi sẽ giải thích nó cho bạn. Sau đó, bạn có thể thử một bài kiểm tra để củng cố kiến thức!
      </p>
      <div className="w-full max-w-lg">
        <h3 className="text-md font-semibold text-gray-700 dark:text-gray-400 mb-4">Hoặc thử một trong các chủ đề sau:</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {suggestedTopics.map(topic => (
            <button
              key={topic}
              onClick={() => onTopicSelect(topic)}
              className="p-3 bg-gray-200 dark:bg-gray-700 rounded-lg text-left text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors duration-200"
            >
              {topic}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};