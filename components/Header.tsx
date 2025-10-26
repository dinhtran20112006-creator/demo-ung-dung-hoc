
import React from 'react';
import { BookOpenIcon } from './icons';

export const Header: React.FC = () => {
  return (
    <header className="flex items-center justify-center p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-10">
      <div className="flex items-center space-x-3">
        <BookOpenIcon className="h-8 w-8 text-blue-500" />
        <h1 className="text-xl font-bold text-gray-800 dark:text-white">AI Learning Companion</h1>
      </div>
    </header>
  );
};