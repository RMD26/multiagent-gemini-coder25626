export interface AgentWorkflowData {
  coder_initial: string;
  reviewer_feedback: string;
  coder_final: string;
  runner_output: string;
  final_summary: string;
}

export interface Message {
  id: string;
  role: 'user' | 'system';
  content: string;
  workflowData?: AgentWorkflowData;
  isError?: boolean;
  timestamp: number;
}

export enum AgentRole {
  CODER = 'coder',
  REVIEWER = 'reviewer',
  RUNNER = 'runner',
  SUMMARY = 'summary',
  FINAL_CODE = 'final_code'
}

export interface UserProfile {
  displayName: string;
  email: string;
  bio: string;
}

export interface UserSettings {
  temperature: number;
  responseStyle: 'concise' | 'detailed';
  emailNotifications: boolean;
  pushNotifications: boolean;
  theme: 'light' | 'dark';
}