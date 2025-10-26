
import React from 'react';

export const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex justify-start mb-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8"></div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-md">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
};