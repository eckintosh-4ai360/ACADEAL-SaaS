"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';

interface EnrollmentChartProps {
  classes: Array<{
    id: number;
    name: string;
    students: Array<{ id: string }>;
  }>;
}

const vibrantColors = [
  '#4f46e5', // Indigo 600
  '#ec4899', // Pink 500
  '#06b6d4', // Cyan 500
  '#f59e0b', // Amber 500
  '#10b981', // Emerald 500
  '#8b5cf6', // Violet 500
  '#ef4444', // Red 500
  '#0ea5e9', // Sky 500
  '#f97316', // Orange 500
  '#d946ef', // Fuchsia 500
  '#6366f1', // Indigo 500
  '#14b8a6', // Teal 500
  '#f43f5e', // Rose 500
  '#a855f7', // Purple 500
];

export default function EnrollmentChart({ classes }: EnrollmentChartProps) {
  const chartData = classes.map((cls) => ({
    name: cls.name,
    value: cls.students.length,
  }));

  return (
    <div className="w-full h-full min-h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 20, left: -20, bottom: 60 }}
        >
          <defs>
            {vibrantColors.map((color, index) => (
              <linearGradient key={`gradient-${index}`} id={`colorGradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={color} stopOpacity={0.4}/>
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis 
            dataKey="name" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fontWeight: 500, fill: '#6b7280' }}
            interval={0}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#9ca3af' }}
          />
          <Tooltip 
            cursor={{ fill: 'rgba(0, 0, 0, 0.04)' }}
            contentStyle={{ 
              backgroundColor: '#ffffff', 
              border: 'none',
              borderRadius: '12px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              padding: '12px'
            }}
            itemStyle={{ fontWeight: 600, color: '#1f2937' }}
            labelStyle={{ color: '#6b7280', marginBottom: '4px', fontSize: '12px' }}
            formatter={(value) => [`${value} Students`, 'Enrollment']}
          />
          <Bar 
            dataKey="value" 
            radius={[6, 6, 0, 0]} 
            maxBarSize={80}
            barSize={60}
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={`url(#colorGradient-${index % vibrantColors.length})`}
                stroke={vibrantColors[index % vibrantColors.length]}
                strokeWidth={1}
              />
            ))}
            <LabelList 
              dataKey="value" 
              position="top" 
              style={{ fontSize: '11px', fontWeight: 600, fill: '#4b5563' }} 
              offset={10}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
