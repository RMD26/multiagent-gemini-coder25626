import React from 'react';
import { Message } from '../types';
import { User, Bot, AlertTriangle } from 'lucide-react';
import { AgentTabs } from './AgentTabs';
import { Markdown } from './Markdown';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`py-8 ${isUser ? 'bg-transparent' : 'bg-gray-900/30 border-y border-gray-800/50'}`}>
      <div className="max-w-5xl mx-auto px-4 flex gap-6">
        {/* Avatar */}
        <div className="flex-shrink-0 mt-1">
          {isUser ? (
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/20">
              <User size={18} className="text-white" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-900/20">
              <Bot size={18} className="text-white" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold text-sm text-gray-200">
              {isUser ? 'You' : 'Gemini Coder System'}
            </span>
            <span className="text-xs text-gray-500">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {message.isError ? (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-red-950/50 border border-red-900/50 text-red-200">
              <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{message.content}</p>
            </div>
          ) : isUser ? (
            <div className="text-gray-300 whitespace-pre-wrap text-base leading-relaxed">
              {message.content}
            </div>
          ) : message.workflowData ? (
            <AgentTabs data={message.workflowData} />
          ) : (
            <Markdown content={message.content} />
          )}
        </div>
      </div>
    </div>
  );
};