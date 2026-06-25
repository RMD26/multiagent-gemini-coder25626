import React, { useState } from 'react';
import { AgentWorkflowData, AgentRole } from '../types';
import { Markdown } from './Markdown';
import { Code2, ShieldCheck, PlayCircle, CheckCircle2 } from 'lucide-react';

interface AgentTabsProps {
  data: AgentWorkflowData;
}

export const AgentTabs: React.FC<AgentTabsProps> = ({ data }) => {
  // Fix: Use the updated AgentRole enum to avoid TypeScript union type errors
  const [activeTab, setActiveTab] = useState<AgentRole>(AgentRole.SUMMARY);

  const tabs = [
    { id: AgentRole.SUMMARY, label: 'Summary', icon: CheckCircle2, content: data.final_summary, color: 'text-green-400' },
    { id: AgentRole.CODER, label: 'Plan & Initial Code', icon: Code2, content: data.coder_initial, color: 'text-blue-400' },
    { id: AgentRole.REVIEWER, label: 'Review', icon: ShieldCheck, content: data.reviewer_feedback, color: 'text-purple-400' },
    { id: AgentRole.RUNNER, label: 'Execution', icon: PlayCircle, content: data.runner_output, color: 'text-orange-400' },
    { id: AgentRole.FINAL_CODE, label: 'Final Code / Diffs', icon: Code2, content: data.coder_final, color: 'text-emerald-400' },
  ];

  return (
    <div className="mt-4 border border-gray-800 rounded-xl overflow-hidden bg-gray-900/50 shadow-lg">
      {/* Tab Headers */}
      <div className="flex overflow-x-auto border-b border-gray-800 bg-gray-950/50 scrollbar-hide">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap
                ${isActive 
                  ? `bg-gray-800 text-white border-b-2 border-blue-500` 
                  : `text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 border-b-2 border-transparent`
                }
              `}
            >
              <Icon size={16} className={isActive ? tab.color : 'text-gray-500'} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="p-6 max-h-[600px] overflow-y-auto custom-scrollbar">
        {tabs.map((tab) => (
          <div 
            key={tab.id} 
            className={activeTab === tab.id ? 'block animate-in fade-in duration-300' : 'hidden'}
          >
            <Markdown content={tab.content} />
          </div>
        ))}
      </div>
    </div>
  );
};