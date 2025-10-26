
import React, { useEffect, useRef } from 'react';
import type { Message } from '../types';
import { Quiz } from './Quiz';
import { LoadingSpinner } from './LoadingSpinner';
import { UserIcon, SparklesIcon, TestTubeIcon } from './icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatInterfaceProps {
  messages: Message[];
  isLoading: boolean;
  onGenerateQuiz: (topic: string) => void;
}

const ChatMessage: React.FC<{ message: Message; onGenerateQuiz: (topic: string) => void }> = ({ message, onGenerateQuiz }) => {
  const isUser = message.sender === 'user';
  
  const markdownStyles = `prose prose-sm sm:prose-base dark:prose-invert max-w-none 
    prose-p:before:content-none prose-p:after:content-none 
    prose-headings:text-gray-800 dark:prose-headings:text-gray-200
    prose-a:text-blue-500 hover:prose-a:text-blue-600
    prose-code:bg-gray-200 dark:prose-code:bg-gray-700 prose-code:p-1 prose-code:rounded prose-code:font-mono prose-code:text-sm`;

  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="flex items-end gap-2 max-w-xl">
          <div className="bg-blue-500 text-white rounded-lg rounded-br-none p-3 shadow-md">
            <p>{message.content as string}</p>
          </div>
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
             <UserIcon className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>
    );
  }

  // AI Message
  return (
    <div className="flex justify-start mb-4">
      <div className="flex items-start gap-2 max-w-xl">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-600 dark:bg-gray-300 flex items-center justify-center">
            <SparklesIcon className="w-5 h-5 text-white dark:text-gray-800" />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg rounded-bl-none p-4 shadow-md">
          {typeof message.content === 'string' ? (
            <>
              {/* FIX: Moved className from ReactMarkdown to a wrapper div to resolve TS error. */}
              <div className={markdownStyles}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
              </div>
              {message.topic && (
                <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                   <button 
                     onClick={() => onGenerateQuiz(message.topic!)}
                     className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                   >
                     <TestTubeIcon className="w-4 h-4" />
                     Tạo câu hỏi trắc nghiệm
                   </button>
                </div>
              )}
            </>
          ) : (
            <Quiz quizData={message.content.quizData} />
          )}
        </div>
      </div>
    </div>
  );
};


export const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, isLoading, onGenerateQuiz }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  return (
    <div className="p-4 sm:p-6 md:p-8">
      {messages.map(msg => (
        <ChatMessage key={msg.id} message={msg} onGenerateQuiz={onGenerateQuiz} />
      ))}
      {isLoading && <LoadingSpinner />}
      <div ref={messagesEndRef} />
    </div>
  );
};