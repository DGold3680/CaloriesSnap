import React, { useState, useEffect, useRef } from 'react';
import { Camera, History, BarChart3, Plus, X, Loader2, Calendar as CalendarIcon, ArrowLeft, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, isSameDay, isSameWeek, isSameMonth, parseISO } from 'date-fns';
import { FoodEntry, CalorieEstimation } from './types';
import { estimateCalories } from './services/geminiService';
import { ReportView } from './components/ReportView';
import { cn } from './lib/utils';
import { compressImage, blobToBase64 } from './services/imageService';
import { getAllEntries, saveEntry as dbSaveEntry, deleteEntry as dbDeleteEntry, requestPersistentStorage } from './services/dbService';

import { InstallPrompt } from './components/InstallPrompt';

export default function App() {
  console.log('CalorieSnap: App Rendering');
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [view, setView] = useState<'snap' | 'history' | 'reports'>('snap');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string, blob: Blob } | null>(null);
  const [estimation, setEstimation] = useState<CalorieEstimation | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize and load entries
  useEffect(() => {
    async function init() {
      await requestPersistentStorage();
      const saved = await getAllEntries();
      
      // Update easy access count for PWA prompt
      localStorage.setItem('calorie_entries_count', saved.length.toString());

      // Convert blobs to local URLs for rendering
      const entriesWithUrls = saved.map(entry => ({
        ...entry,
        imageUrl: entry.imageBlob ? URL.createObjectURL(entry.imageBlob) : undefined
      }));
      
      setEntries(entriesWithUrls);
    }
    init();

    // Cleanup URLs on unmount
    return () => {
      entries.forEach(e => {
        if (e.imageUrl) URL.revokeObjectURL(e.imageUrl);
      });
    };
  }, []);

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    try {
      // 1. Compress image immediately
      const compressedBlob = await compressImage(file);
      const url = URL.createObjectURL(compressedBlob);
      setPreviewImage({ url, blob: compressedBlob });
      
      // 2. Prepare for API
      const base64 = await blobToBase64(compressedBlob);
      
      // 3. Estimate calories
      const result = await estimateCalories(base64);
      setEstimation(result);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : 'Analysis failed');
      resetCapture();
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveEntry = async () => {
    if (!estimation || !previewImage) return;
    
    const newEntry: FoodEntry = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      foodName: estimation.foodName,
      calories: estimation.calories,
      protein: estimation.protein,
      description: estimation.description,
      imageBlob: previewImage.blob,
      imageUrl: previewImage.url // Already an object URL
    };

    try {
      await dbSaveEntry(newEntry);
      const updatedEntries = [newEntry, ...entries];
      setEntries(updatedEntries);
      localStorage.setItem('calorie_entries_count', updatedEntries.length.toString());
      
      setPreviewImage(null); // Keep the URL valid since it's in history now
      setEstimation(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setView('history');
    } catch (err) {
      console.error(err);
      alert('Failed to save entry');
    }
  };

  const deleteEntry = async (id: string) => {
    if (confirm('Are you sure you want to delete this entry?')) {
      try {
        await dbDeleteEntry(id);
        const entryToDelete = entries.find(e => e.id === id);
        if (entryToDelete?.imageUrl) URL.revokeObjectURL(entryToDelete.imageUrl);
        const updatedEntries = entries.filter(e => e.id !== id);
        setEntries(updatedEntries);
        localStorage.setItem('calorie_entries_count', updatedEntries.length.toString());
      } catch (err) {
        console.error(err);
        alert('Failed to delete entry');
      }
    }
  };

  const resetCapture = () => {
    if (previewImage?.url) {
      // Only revoke if it's NOT in our list (unsaved)
      const isSaved = entries.some(e => e.imageUrl === previewImage.url);
      if (!isSaved) URL.revokeObjectURL(previewImage.url);
    }
    setPreviewImage(null);
    setEstimation(null);
    setIsAnalyzing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const todayEntries = entries.filter(e => isSameDay(parseISO(e.date), new Date()));
  const todayTotal = todayEntries.reduce((sum, e) => sum + e.calories, 0);
  const todayProtein = todayEntries.reduce((sum, e) => sum + (e.protein || 0), 0);

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#1a1a1a] font-sans selection:bg-green-100">
      {/* Navbar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 z-50 flex justify-around items-center md:top-0 md:bottom-auto">
        <button 
          onClick={() => setView('snap')}
          className={cn("flex flex-col items-center gap-1 transition-colors", view === 'snap' ? "text-green-600" : "text-gray-400")}
        >
          <Camera size={24} />
          <span className="text-[10px] font-medium uppercase tracking-wider">Snap</span>
        </button>
        <button 
          onClick={() => setView('history')}
          className={cn("flex flex-col items-center gap-1 transition-colors", view === 'history' ? "text-green-600" : "text-gray-400")}
        >
          <History size={24} />
          <span className="text-[10px] font-medium uppercase tracking-wider">History</span>
        </button>
        <button 
          onClick={() => setView('reports')}
          className={cn("flex flex-col items-center gap-1 transition-colors", view === 'reports' ? "text-green-600" : "text-gray-400")}
        >
          <BarChart3 size={24} />
          <span className="text-[10px] font-medium uppercase tracking-wider">Reports</span>
        </button>
      </nav>

      <main className="pb-24 pt-6 px-4 max-w-2xl mx-auto md:pt-24 lg:max-w-4xl">
        <AnimatePresence mode="wait">
          {view === 'snap' && (
            <motion.div
              key="snap"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <header className="space-y-2">
                <h1 className="text-4xl font-bold tracking-tight text-gray-900 leading-tight">
                  What's on your <br />
                  <span className="text-green-600 italic">plate today?</span>
                </h1>
                <p className="text-gray-500 font-medium">Snap a photo to estimate your calories.</p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Hero Card / Current Day */}
                <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 flex flex-col justify-between h-64 overflow-hidden relative group">
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Total Today</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-6xl font-light tracking-tighter text-gray-900 leading-none">{todayTotal}</span>
                      <span className="text-xl font-medium text-gray-400 tracking-tight">kcal</span>
                    </div>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-xl font-bold text-blue-600">{todayProtein}</span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase">g Protein</span>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-gray-400">
                    {todayEntries.length} meals tracked
                  </div>
                  <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <BarChart3 size={160} />
                  </div>
                </div>

                {/* Capture Button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-green-600 hover:bg-green-700 active:scale-95 transition-all text-white rounded-[32px] p-8 flex flex-col items-center justify-center gap-4 h-64 shadow-lg shadow-green-200"
                >
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                    <Plus size={40} />
                  </div>
                  <span className="text-xl font-bold tracking-tight">Snap New Meal</span>
                </button>
              </div>

              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={fileInputRef}
                onChange={handleImageCapture}
                className="hidden"
              />

              {/* Analysis Modal/Overlay */}
              <AnimatePresence>
                {previewImage && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-white z-[60] overflow-y-auto"
                  >
                    <div className="max-w-2xl mx-auto p-6 space-y-8 min-h-screen">
                      <div className="flex justify-between items-center">
                        <button onClick={resetCapture} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                          <ArrowLeft size={24} />
                        </button>
                        <span className="text-sm font-bold uppercase tracking-widest text-gray-400">Analysis</span>
                        <div className="w-10"></div>
                      </div>

                      <div className="aspect-square rounded-[32px] overflow-hidden bg-gray-100 shadow-inner relative">
                        <img src={previewImage.url} alt="Food preview" className="w-full h-full object-cover" />
                        {isAnalyzing && (
                          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-4">
                            <Loader2 className="animate-spin" size={48} />
                            <p className="font-bold tracking-tight text-xl">Scanning Meal...</p>
                          </div>
                        )}
                      </div>

                      {estimation && (
                        <motion.div 
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          className="space-y-6"
                        >
                          <div className="flex justify-center gap-8 text-center">
                            <div className="space-y-1">
                              <div className="flex items-baseline justify-center gap-1">
                                <span className="text-5xl font-light text-green-600 tracking-tighter">{estimation.calories}</span>
                                <span className="text-lg font-medium text-gray-400">kcal</span>
                              </div>
                              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Calories</span>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-baseline justify-center gap-1">
                                <span className="text-5xl font-light text-blue-600 tracking-tighter">{estimation.protein}</span>
                                <span className="text-lg font-medium text-gray-400">g</span>
                              </div>
                              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Protein</span>
                            </div>
                          </div>
                          
                          <div className="bg-gray-50 rounded-2xl p-6">
                            <p className="text-gray-600 leading-relaxed italic text-lg text-center">
                              "{estimation.description}"
                            </p>
                          </div>

                          <button
                            onClick={saveEntry}
                            className="w-full bg-black text-white rounded-2xl py-4 font-bold text-lg hover:bg-gray-900 transition-colors"
                          >
                            Save to Log
                          </button>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {view === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <header className="flex justify-between items-end pb-4 border-b border-gray-100">
                <h1 className="text-4xl font-bold tracking-tight">Timeline</h1>
                <span className="text-sm font-bold uppercase tracking-widest text-gray-400">{entries.length} Entries</span>
              </header>

              <div className="space-y-4">
                {entries.length === 0 ? (
                  <div className="py-20 text-center space-y-4">
                    <p className="text-gray-400 font-medium">No entries yet. Start snapping!</p>
                    <button onClick={() => setView('snap')} className="text-green-600 font-bold hover:underline">Take your first photo</button>
                  </div>
                ) : (
                  entries.map((entry) => (
                    <motion.div 
                      layout
                      key={entry.id}
                      className="bg-white rounded-2xl p-4 flex gap-4 shadow-sm border border-gray-50 group hover:border-green-100 transition-all"
                    >
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-50 shrink-0">
                        {entry.imageUrl ? (
                          <img src={entry.imageUrl} alt={entry.foodName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <Camera size={24} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 flex flex-col justify-between py-1">
                        <div>
                          <div className="flex justify-between items-start">
                            <h3 className="font-bold text-lg leading-tight uppercase tracking-tight">{entry.foodName}</h3>
                            <button 
                              onClick={() => deleteEntry(entry.id)}
                              className="text-gray-300 hover:text-red-500 transition-colors p-1"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          <p className="text-xs text-gray-400 font-medium mt-1">{format(parseISO(entry.date), 'MMM d, h:mm a')}</p>
                        </div>
                        <div className="flex items-center gap-4 mt-auto">
                          <div className="flex items-baseline gap-1">
                            <span className="text-xl font-bold text-green-600">{entry.calories}</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">kcal</span>
                          </div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-xl font-bold text-blue-600">{entry.protein || 0}</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">g</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {view === 'reports' && (
            <motion.div
              key="reports"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ReportView entries={entries} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <InstallPrompt />
    </div>
  );
}
