import { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line 
} from 'recharts';
import { 
  format, startOfDay, endOfDay, startOfWeek, endOfWeek, 
  startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, 
  parseISO, subDays, eachWeekOfInterval, eachMonthOfInterval,
  isSameWeek, isSameMonth
} from 'date-fns';
import { FoodEntry, ReportPeriod } from '../types';
import { cn } from '../lib/utils';

interface ReportViewProps {
  entries: FoodEntry[];
}

export function ReportView({ entries }: ReportViewProps) {
  const [period, setPeriod] = useState<ReportPeriod>('daily');
  const [metric, setMetric] = useState<'calories' | 'protein'>('calories');

  const reportData = useMemo(() => {
    const now = new Date();
    
    if (period === 'daily') {
      // Last 7 days
      const days = eachDayOfInterval({
        start: subDays(now, 6),
        end: now
      });

      return days.map(day => {
        const filtered = entries.filter(e => isSameDay(parseISO(e.date), day));
        const dayCalories = filtered.reduce((sum, e) => sum + e.calories, 0);
        const dayProtein = filtered.reduce((sum, e) => sum + (e.protein || 0), 0);
        
        return {
          label: format(day, 'EEE'),
          fullLabel: format(day, 'MMM d'),
          calories: dayCalories,
          protein: dayProtein,
          value: metric === 'calories' ? dayCalories : dayProtein
        };
      });
    }

    if (period === 'weekly') {
      // Last 4 weeks
      const startOfReport = startOfWeek(subDays(now, 28));
      const weeks = eachWeekOfInterval({
        start: startOfReport,
        end: now
      });

      return weeks.map(week => {
        const filtered = entries.filter(e => isSameWeek(parseISO(e.date), week));
        const weekCalories = filtered.reduce((sum, e) => sum + e.calories, 0);
        const weekProtein = filtered.reduce((sum, e) => sum + (e.protein || 0), 0);
        
        return {
          label: `W${format(week, 'w')}`,
          fullLabel: `${format(week, 'MMM d')} - ${format(endOfWeek(week), 'MMM d')}`,
          calories: weekCalories,
          protein: weekProtein,
          value: metric === 'calories' ? weekCalories : weekProtein
        };
      });
    }

    if (period === 'monthly') {
      // Last 6 months
      const startOfReport = startOfMonth(subDays(now, 180));
      const months = eachMonthOfInterval({
        start: startOfReport,
        end: now
      });

      return months.map(month => {
        const filtered = entries.filter(e => isSameMonth(parseISO(e.date), month));
        const monthCalories = filtered.reduce((sum, e) => sum + e.calories, 0);
        const monthProtein = filtered.reduce((sum, e) => sum + (e.protein || 0), 0);
        
        return {
          label: format(month, 'MMM'),
          fullLabel: format(month, 'MMMM yyyy'),
          calories: monthCalories,
          protein: monthProtein,
          value: metric === 'calories' ? monthCalories : monthProtein
        };
      });
    }

    return [];
  }, [entries, period, metric]);

  const totalValue = useMemo(() => 
    reportData.reduce((sum, d) => sum + d.value, 0), 
  [reportData]);

  const averageValue = useMemo(() => 
    reportData.length > 0 ? Math.round(totalValue / reportData.length) : 0, 
  [reportData, totalValue]);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4">
        <h1 className="text-4xl font-bold tracking-tight">Insights</h1>
        
        <div className="flex flex-wrap gap-2">
          <div className="flex bg-gray-100 p-1 rounded-xl">
            {(['daily', 'weekly', 'monthly'] as ReportPeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-bold transition-all uppercase tracking-tight",
                  period === p 
                    ? "bg-white text-green-600 shadow-sm" 
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setMetric('calories')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-bold transition-all uppercase tracking-tight",
                metric === 'calories' 
                  ? "bg-white text-green-600 shadow-sm" 
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              Kcal
            </button>
            <button
              onClick={() => setMetric('protein')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-bold transition-all uppercase tracking-tight",
                metric === 'protein' 
                  ? "bg-white text-blue-600 shadow-sm" 
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              Protein
            </button>
          </div>
        </div>
      </header>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-50">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1">Total {metric}</span>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold">{totalValue}</span>
            <span className="text-xs font-bold text-gray-400 uppercase">{metric === 'calories' ? 'kcal' : 'g'}</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-50">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1">Average {metric}</span>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold">{averageValue}</span>
            <span className="text-xs font-bold text-gray-400 uppercase">{metric === 'calories' ? 'kcal' : 'g'}</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white p-6 pt-10 rounded-[32px] shadow-sm border border-gray-100 aspect-[4/3] md:aspect-[21/9]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={reportData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis 
              dataKey="label" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }}
            />
            <Tooltip 
              cursor={{ fill: '#f3f4f6' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-black text-white p-3 rounded-xl shadow-xl text-xs font-bold border border-white/10">
                      <p className="text-[10px] opacity-60 uppercase mb-1">{data.fullLabel}</p>
                      <p className="text-green-400">{data.calories} kcal</p>
                      <p className="text-blue-400">{data.protein}g protein</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar 
              dataKey="value" 
              fill={metric === 'calories' ? "#16a34a" : "#2563eb"} 
              radius={[6, 6, 0, 0]} 
              barSize={ period === 'daily' ? 32 : 48 }
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-green-50 p-6 rounded-[24px] border border-green-100">
        <p className="text-green-800 text-sm font-medium leading-relaxed">
          {period === 'daily' && "Consistency is key! Tracking every meal helps accuracy."}
          {period === 'weekly' && "Your weekly trend shows how your habits evolve over time."}
          {period === 'monthly' && "Monthly insights provide the best long-term view of your nutrition."}
        </p>
      </div>
    </div>
  );
}
