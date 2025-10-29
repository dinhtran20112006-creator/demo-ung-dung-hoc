import React, { useState } from 'react';
import { X, Zap, Plus, Star, ThumbsUp, ThumbsDown, Trash2, Edit, Save, CheckCircle } from 'lucide-react';

// Redefined locally as it's not exported from App.tsx
interface AIPromptVersion {
  id: string;
  name: string;
  prompt: string;
  qualityScore: number;
  usageCount: number;
  positiveFeedback: number;
  negativeFeedback: number;
  isDefault?: boolean;
}

interface AIPromptManagerProps {
  prompts: AIPromptVersion[];
  setPrompts: React.Dispatch<React.SetStateAction<AIPromptVersion[]>>;
  onClose: () => void;
  darkMode: boolean;
}

const AIPromptManager: React.FC<AIPromptManagerProps> = ({ prompts, setPrompts, onClose, darkMode }) => {
  const [editingPrompt, setEditingPrompt] = useState<Partial<AIPromptVersion> | null>(null);

  const handleSetDefault = (promptId: string) => {
    setPrompts(prompts.map(p => ({ ...p, isDefault: p.id === promptId })));
  };

  const handleDelete = (promptId: string) => {
    if (confirm('Are you sure you want to delete this prompt? This cannot be undone.')) {
      setPrompts(prompts.filter(p => p.id !== promptId));
    }
  };

  const handleSave = () => {
    if (!editingPrompt || !editingPrompt.name?.trim() || !editingPrompt.prompt?.trim()) {
      alert('Prompt name and content cannot be empty.');
      return;
    }

    if (editingPrompt.id) { // Editing existing
      setPrompts(prompts.map(p => p.id === editingPrompt.id ? { ...p, ...editingPrompt } as AIPromptVersion : p));
    } else { // Adding new
      const newPrompt: AIPromptVersion = {
        id: `custom-${Date.now()}`,
        name: editingPrompt.name,
        prompt: editingPrompt.prompt,
        qualityScore: 0.8,
        usageCount: 0,
        positiveFeedback: 0,
        negativeFeedback: 0,
        isDefault: false,
      };
      setPrompts([...prompts, newPrompt]);
    }
    setEditingPrompt(null);
  };

  const handleAddNew = () => {
    setEditingPrompt({ name: '', prompt: '' });
  };
  
  const renderFeedbackBar = (prompt: AIPromptVersion) => {
      const total = prompt.positiveFeedback + prompt.negativeFeedback;
      if (total === 0) {
          return <div className={`h-2 rounded-full ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}></div>;
      }
      const positiveWidth = (prompt.positiveFeedback / total) * 100;

      return (
          <div className={`h-2 rounded-full flex ${darkMode ? 'bg-red-900/50' : 'bg-red-100'}`}>
              <div className="bg-green-500 rounded-l-full" style={{ width: `${positiveWidth}%` }}></div>
          </div>
      );
  }

  const renderEditForm = () => (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl max-w-2xl w-full p-6 shadow-2xl`}>
        <h3 className="text-xl font-bold mb-4">{editingPrompt?.id ? 'Edit Prompt' : 'Add New Prompt'}</h3>
        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Prompt Name</label>
            <input
              type="text"
              value={editingPrompt?.name || ''}
              onChange={e => setEditingPrompt({ ...editingPrompt, name: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Prompt Content</label>
            <textarea
              value={editingPrompt?.prompt || ''}
              onChange={e => setEditingPrompt({ ...editingPrompt, prompt: e.target.value })}
              rows={10}
              className={`w-full px-3 py-2 border rounded-lg font-mono text-sm ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
              placeholder="Enter your prompt here. Use {notes} and {difficulty} as placeholders."
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setEditingPrompt(null)} className={`px-4 py-2 rounded-lg font-semibold ${darkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-200 hover:bg-gray-300'}`}>Cancel</button>
          <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2">
            <Save size={16} /> Save
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      {editingPrompt && renderEditForm()}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col p-8`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold flex items-center gap-2"><Zap /> AI Prompt Manager</h2>
          <button onClick={onClose} className={`${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}>
            <X size={28} />
          </button>
        </div>
        
        <div className="mb-4">
             <button onClick={handleAddNew} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2">
                <Plus size={16} /> Add New Prompt
            </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-4 space-y-4">
          {prompts.map(prompt => (
            <div key={prompt.id} className={`p-4 rounded-lg border-2 ${prompt.isDefault ? 'border-yellow-500' : (darkMode ? 'border-gray-700' : 'border-gray-200')} ${darkMode ? 'bg-gray-900/50' : 'bg-gray-50/50'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-lg flex items-center gap-2">
                    {prompt.name}
                    {prompt.isDefault && <span className="text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full font-semibold">Default</span>}
                  </h4>
                  <div className={`mt-2 p-3 rounded-lg text-sm font-mono whitespace-pre-wrap max-h-24 overflow-y-auto ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    {prompt.prompt}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 ml-4 flex-shrink-0">
                  <button
                    onClick={() => handleSetDefault(prompt.id)}
                    disabled={prompt.isDefault}
                    className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md font-semibold bg-yellow-400/20 text-yellow-600 dark:text-yellow-300 hover:bg-yellow-400/40 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {prompt.isDefault ? <CheckCircle size={14} /> : <Star size={14} />}
                    {prompt.isDefault ? 'Default' : 'Set Default'}
                  </button>
                   <div className="flex gap-2">
                     <button onClick={() => setEditingPrompt(prompt)} className={`p-2 rounded-md ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}><Edit size={14} /></button>
                     <button onClick={() => handleDelete(prompt.id)} className={`p-2 rounded-md ${darkMode ? 'bg-red-900/50 hover:bg-red-900/80 text-red-400' : 'bg-red-100 hover:bg-red-200 text-red-600'}`}><Trash2 size={14} /></button>
                   </div>
                </div>
              </div>
              <div className="mt-4 border-t pt-3 border-gray-200 dark:border-gray-700 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex flex-col">
                    <span className="font-semibold">Quality Score</span>
                    <span className={`flex items-center gap-1 font-bold text-lg ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                      <Star size={16} className="text-yellow-500" />
                      {prompt.qualityScore.toFixed(2)}
                    </span>
                  </div>
                   <div className="flex flex-col">
                    <span className="font-semibold">Usage</span>
                     <span className={`font-bold text-lg ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{prompt.usageCount}</span>
                  </div>
                  <div className="flex flex-col col-span-2">
                    <span className="font-semibold mb-1">Feedback</span>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 text-green-500"><ThumbsUp size={14}/> {prompt.positiveFeedback}</div>
                        <div className="flex-1">
                          {renderFeedbackBar(prompt)}
                        </div>
                        <div className="flex items-center gap-1 text-red-500"><ThumbsDown size={14}/> {prompt.negativeFeedback}</div>
                    </div>
                  </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AIPromptManager;
