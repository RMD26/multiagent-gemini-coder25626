import React, { useState } from 'react';
import { UserProfile } from '../types';
import { Save, User, Mail, FileText } from 'lucide-react';

interface ProfileViewProps {
  profile: UserProfile;
  onSave: (profile: UserProfile) => void;
  theme?: 'light' | 'dark';
}

export const ProfileView: React.FC<ProfileViewProps> = ({ profile, onSave, theme = 'dark' }) => {
  const [formData, setFormData] = useState<UserProfile>(profile);
  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const isLight = theme === 'light';

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 w-full animate-in fade-in duration-300">
      <div className="mb-8">
        <h2 className={`text-2xl font-bold flex items-center gap-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>
          <User className="text-blue-500" /> User Profile
        </h2>
        <p className={`mt-1 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>Manage your personal information and identity.</p>
      </div>

      <form onSubmit={handleSubmit} className={`space-y-6 border rounded-2xl p-6 shadow-xl ${isLight ? 'bg-white border-gray-200 shadow-gray-200/50' : 'bg-gray-900/50 border-gray-800'}`}>
        {/* Avatar section mock */}
        <div className={`flex items-center gap-6 pb-6 border-b ${isLight ? 'border-gray-100' : 'border-gray-800'}`}>
          <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-blue-900/20">
            {formData.displayName ? formData.displayName.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <button type="button" className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors border ${isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200' : 'bg-gray-800 hover:bg-gray-700 text-white border-gray-700'}`}>
              Change Avatar
            </button>
            <p className={`text-xs mt-2 ${isLight ? 'text-gray-500' : 'text-gray-500'}`}>JPG, GIF or PNG. Max size of 2MB.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1.5 flex items-center gap-2 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
              <User size={14} className="text-gray-500" /> Display Name
            </label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              className={`w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all ${isLight ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-950 border-gray-800 text-gray-100'}`}
              required
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1.5 flex items-center gap-2 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
              <Mail size={14} className="text-gray-500" /> Email Address
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={`w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all ${isLight ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-950 border-gray-800 text-gray-100'}`}
              required
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1.5 flex items-center gap-2 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
              <FileText size={14} className="text-gray-500" /> Bio
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={4}
              className={`w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none ${isLight ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-950 border-gray-800 text-gray-100'}`}
            />
          </div>
        </div>

        <div className="pt-4 flex items-center justify-end gap-4">
          {isSaved && <span className="text-sm text-green-500 animate-pulse">Profile saved successfully!</span>}
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors shadow-lg shadow-blue-900/20"
          >
            <Save size={18} /> Save Changes
          </button>
        </div>
      </form>
    </div>
  );
};