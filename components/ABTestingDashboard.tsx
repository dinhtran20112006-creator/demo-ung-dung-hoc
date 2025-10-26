
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { EnhancedSpacedRepetition } from '../enhanced-spaced-repetition';

interface AIPromptVersion {
  id: string;
  name: string;
  prompt: string;
  qualityScore: number;
  usageCount: number;
  positiveFeedback: number;
  negativeFeedback: number;
}

interface ABTestingDashboardProps {
  enhancedSpacedRepetition: EnhancedSpacedRepetition;
  aiPromptVersions: AIPromptVersion[];
  darkMode: boolean;
}

const ABTestingDashboard: React.FC<ABTestingDashboardProps> = ({
  enhancedSpacedRepetition,
  aiPromptVersions,
  darkMode
}) => {
  const algorithmStats = enhancedSpacedRepetition.getAlgorithmComparison();
  const algorithmData = Object.values(algorithmStats).map((algo: any, index) => ({
    name: algo.name,
    retention: algo.averageRetention,
    performance: algo.averagePerformance,
    retentionRate: algo.retentionRate,
    dataPoints: algo.dataPoints,
    fill: ['#8884d8', '#82ca9d', '#ffc658'][index % 3]
  }));

  const promptData = aiPromptVersions.map(prompt => ({
    name: prompt.name,
    quality: prompt.qualityScore * 100,
    usage: prompt.usageCount,
    positive: prompt.positiveFeedback,
    negative: prompt.negativeFeedback,
    effectiveness: prompt.usageCount > 0 ? 
      (prompt.positiveFeedback / (prompt.positiveFeedback + prompt.negativeFeedback || 1)) * 100 : 0
  }));
  
  const tickColor = darkMode ? '#9ca3af' : '#6b7280';


  return (
    <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-900' : 'bg-gray-700/50'} shadow-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
      <h3 className="text-2xl font-bold mb-6">📊 A/B Testing Dashboard</h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Algorithm Comparison */}
        <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
          <h4 className="font-bold mb-4">📈 So sánh Thuật toán Spaced Repetition</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={algorithmData}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#4b5563' : '#e5e7eb'} />
              <XAxis dataKey="name" stroke={tickColor} fontSize={12} />
              <YAxis stroke={tickColor} fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: darkMode ? '#1f2937' : '#ffffff',
                  borderColor: darkMode ? '#374151' : '#e5e7eb'
                }}
                labelStyle={{ color: darkMode ? '#f9fafb' : '#1f2937' }}
              />
              <Legend wrapperStyle={{fontSize: "12px"}} />
              <Bar dataKey="retentionRate" name="Tỷ lệ duy trì (%)" fill="#8884d8" />
              <Bar dataKey="performance" name="Hiệu suất TB" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Prompt Effectiveness */}
        <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
          <h4 className="font-bold mb-4">🤖 Hiệu quả Prompt AI</h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={promptData}
                cx="50%"
                cy="50%"
                labelLine={false}
                // FIX: Cast `effectiveness` to number to resolve TypeScript error due to generic recharts types.
                label={({ name, effectiveness }) => `${name.split(' ')[0]}: ${(effectiveness as number).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="effectiveness"
              >
                {promptData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={['#8884d8', '#82ca9d', '#ffc658'][index % 3]} />
                ))}
              </Pie>
              <Tooltip
                 contentStyle={{
                    backgroundColor: darkMode ? '#1f2937' : '#ffffff',
                    borderColor: darkMode ? '#374151' : '#e5e7eb'
                  }}
                  labelStyle={{ color: darkMode ? '#f9fafb' : '#1f2937' }}
              />
               <Legend wrapperStyle={{fontSize: "12px"}} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Statistics */}
      <div>
        <h4 className="font-bold mb-4 text-lg">Chi tiết</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <h5 className="font-bold mb-2">Thuật toán học</h5>
            {algorithmData.length > 0 ? algorithmData.map((algo, index) => (
                <div key={index} className="flex justify-between items-center mb-2 text-sm">
                <span>{algo.name}</span>
                <div className="flex gap-4 font-mono">
                    <span>📊{algo.dataPoints}</span>
                    <span>🎯{algo.retentionRate.toFixed(1)}%</span>
                </div>
                </div>
            )) : <p className="text-sm text-gray-500">Chưa có dữ liệu.</p>}
            </div>

            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <h5 className="font-bold mb-2">Prompt AI</h5>
            {promptData.length > 0 ? promptData.map((prompt, index) => (
                <div key={index} className="flex justify-between items-center mb-2 text-sm">
                <span>{prompt.name}</span>
                <div className="flex gap-2 font-mono">
                    <span className="text-green-500">👍{prompt.positive}</span>
                    <span className="text-red-500">👎{prompt.negative}</span>
                    <span>⭐{prompt.quality.toFixed(1)}%</span>
                </div>
                </div>
            )) : <p className="text-sm text-gray-500">Chưa có dữ liệu.</p>}
            </div>
        </div>
      </div>
    </div>
  );
};

export default ABTestingDashboard;