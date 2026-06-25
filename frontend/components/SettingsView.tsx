import React, { useState } from 'react';
import { UserSettings } from '../types';
import { Save, Sliders, Thermometer, LayoutTemplate, Bell, Palette, Bot } from 'lucide-react';

interface SettingsViewProps {
  settings: UserSettings;
  onSave: (settings: UserSettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onSave }) => {
  const [formData, setFormData] = useState<UserSettings>(settings);
  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const isLight = formData.theme === 'light';

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 w-full animate-in fade-in duration-300">
      <div className="mb-8">
        <h2 className={`text-2xl font-bold flex items-center gap-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>
          <Sliders className="text-purple-500" /> System Settings
        </h2>
        <p className={`mt-1 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>Configure application preferences and agent behavior.</p>
      </div>

      <form onSubmit={handleSubmit} className={`space-y-8 border rounded-2xl p-6 shadow-xl ${isLight ? 'bg-white border-gray-200 shadow-gray-200/50' : 'bg-gray-900/50 border-gray-800'}`}>
        
        {/* App Preferences */}
        <div className="space-y-6">
          <h3 className={`text-lg font-medium flex items-center gap-2 border-b pb-2 ${isLight ? 'text-gray-900 border-gray-200' : 'text-white border-gray-800'}`}>
            <Palette size={18} className="text-blue-500" /> App Preferences
          </h3>
          
          {/* Theme */}
          <div className="flex items-center justify-between">
            <div>
              <label className={`text-sm font-medium ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>Theme</label>
              <p className="text-xs text-gray-500">Select your preferred interface theme.</p>
            </div>
            <div className={`flex border rounded-lg p-1 ${isLight ? 'bg-gray-100 border-gray-200' : 'bg-gray-950 border-gray-800'}`}>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, theme: 'light' })}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${formData.theme === 'light' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Light
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, theme: 'dark' })}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${formData.theme === 'dark' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Dark
              </button>
            </div>
          </div>

          {/* Email Notifications */}
          <div className="flex items-center justify-between">
            <div>
              <label className={`text-sm font-medium ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>Email Notifications</label>
              <p className="text-xs text-gray-500">Receive updates and alerts via email.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={formData.emailNotifications}
                onChange={(e) => setFormData({ ...formData, emailNotifications: e.target.checked })}
              />
              <div className={`w-11 h-6 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 ${isLight ? 'bg-gray-300' : 'bg-gray-700'}`}></div>
            </label>
          </div>

          {/* Push Notifications */}
          <div className="flex items-center justify-between">
            <div>
              <label className={`text-sm font-medium ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>Push Notifications</label>
              <p className="text-xs text-gray-500">Receive push notifications in your browser.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={formData.pushNotifications}
                onChange={(e) => setFormData({ ...formData, pushNotifications: e.target.checked })}
              />
              <div className={`w-11 h-6 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 ${isLight ? 'bg-gray-300' : 'bg-gray-700'}`}></div>
            </label>
          </div>
        </div>

        {/* Agent Configuration */}
        <div className={`space-y-6 pt-6 border-t ${isLight ? 'border-gray-200' : 'border-gray-800'}`}>
          <h3 className={`text-lg font-medium flex items-center gap-2 border-b pb-2 ${isLight ? 'text-gray-900 border-gray-200' : 'text-white border-gray-800'}`}>
            <Bot size={18} className="text-purple-500" /> Agent Configuration
          </h3>

          {/* Temperature Setting */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className={`text-sm font-medium flex items-center gap-2 ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>
                <Thermometer size={16} className="text-orange-500" /> Agent Temperature
              </label>
              <span className={`text-xs font-mono px-2 py-1 rounded ${isLight ? 'bg-gray-100 text-gray-700' : 'bg-gray-800 text-gray-300'}`}>{formData.temperature.toFixed(1)}</span>
            </div>
            <p className="text-xs text-gray-500">Controls randomness. Lower values are more deterministic (better for coding), higher values are more creative.</p>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={formData.temperature}
              onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
              className={`w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 ${isLight ? 'bg-gray-200' : 'bg-gray-800'}`}
            />
            <div className="flex justify-between text-xs text-gray-500 font-medium px-1">
              <span>Precise (0.0)</span>
              <span>Balanced (0.5)</span>
              <span>Creative (1.0)</span>
            </div>
          </div>

          {/* Response Style Setting */}
          <div className="space-y-3 pt-4">
            <label className={`text-sm font-medium flex items-center gap-2 ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>
              <LayoutTemplate size={16} className="text-green-500" /> Response Style
            </label>
            <p className="text-xs text-gray-500 mb-3">Choose how detailed the agent's explanations should be.</p>
            <div className="grid grid-cols-2 gap-4">
              <label className={`flex items-center justify-center px-4 py-3 border rounded-xl cursor-pointer transition-all ${formData.responseStyle === 'concise' ? (isLight ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-blue-900/20 border-blue-500 text-blue-400') : (isLight ? 'bg-white border-gray-200 text-gray-600 hover:border-gray-300' : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700')}`}>
                <input
                  type="radio"
                  name="responseStyle"
                  value="concise"
                  checked={formData.responseStyle === 'concise'}
                  onChange={(e) => setFormData({ ...formData, responseStyle: e.target.value as 'concise' | 'detailed' })}
                  className="sr-only"
                />
                <span className="font-medium text-sm">Concise</span>
              </label>
              <label className={`flex items-center justify-center px-4 py-3 border rounded-xl cursor-pointer transition-all ${formData.responseStyle === 'detailed' ? (isLight ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-blue-900/20 border-blue-500 text-blue-400') : (isLight ? 'bg-white border-gray-200 text-gray-600 hover:border-gray-300' : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700')}`}>
                <input
                  type="radio"
                  name="responseStyle"
                  value="detailed"
                  checked={formData.responseStyle === 'detailed'}
                  onChange={(e) => setFormData({ ...formData, responseStyle: e.target.value as 'concise' | 'detailed' })}
                  className="sr-only"
                />
                <span className="font-medium text-sm">Detailed</span>
              </label>
            </div>
          </div>
        </div>

        <div className={`pt-6 border-t flex items-center justify-end gap-4 ${isLight ? 'border-gray-200' : 'border-gray-800'}`}>
          {isSaved && <span className="text-sm text-green-500 animate-pulse">Settings saved successfully!</span>}
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors shadow-lg shadow-blue-900/20"
          >
            <Save size={18} /> Save Settings
          </button>
        </div>
      </form>
    </div>
  );
};