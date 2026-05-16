import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Share, PlusSquare, Download, Info } from 'lucide-react';
import { cn } from '../lib/utils';

export function InstallPrompt() {
  const [isVisible, setIsVisible] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // 1. Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone 
      || document.referrer.includes('android-app://');

    if (isStandalone) return;

    // 2. Check if dismissed before
    const isDismissed = localStorage.getItem('install_prompt_dismissed');
    if (isDismissed) return;

    // 3. Detect iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIos(ios);

    // 4. Handle Android/Chrome install prompt
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      checkUsageAndShow();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // 5. If no usage yet, we wait. But we already checks entries in parent.
    // We trigger after a small delay to ensure it doesn't pop immediately on the first history view
    const checkUsageAndShow = () => {
       const hasEntries = localStorage.getItem('calorie_entries_count') || '0';
       if (parseInt(hasEntries) >= 1) {
         setTimeout(() => setIsVisible(true), 1500);
       }
    };

    checkUsageAndShow();

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const dismiss = () => {
    setIsVisible(false);
    localStorage.setItem('install_prompt_dismissed', 'true');
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      dismiss();
    }
    setDeferredPrompt(null);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={dismiss}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70]"
          />
          
          {/* Drawer */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] p-8 pb-12 z-[80] shadow-2xl border-t border-gray-100"
          >
            <div className="max-w-md mx-auto space-y-6">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-green-100">
                    <PlusSquare size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold tracking-tight">Install CalorieSnap</h3>
                    <p className="text-sm text-gray-500 font-medium">Use it anytime, even offline.</p>
                  </div>
                </div>
                <button onClick={dismiss} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
                  <X size={20} />
                </button>
              </div>

              <div className="bg-gray-50 rounded-2xl p-5 space-y-4">
                {isIos ? (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600 leading-relaxed font-medium">
                      To install on your iPhone, follow these steps:
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm text-blue-600">
                          <Share size={16} />
                        </div>
                        <span className="text-gray-700">1. Tap the <span className="font-bold">Share</span> button at the bottom.</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm text-gray-700">
                          <PlusSquare size={16} />
                        </div>
                        <span className="text-gray-700">2. Scroll down and tap <span className="font-bold">Add to Home Screen</span>.</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600 leading-relaxed font-medium">
                      Get the full app experience on your home screen for faster tracking.
                    </p>
                    {deferredPrompt ? (
                      <button 
                        onClick={handleInstallClick}
                        className="w-full bg-green-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-green-700 transition-colors"
                      >
                        <Download size={18} />
                        Install Application
                      </button>
                    ) : (
                      <div className="flex items-start gap-3 bg-blue-50 p-3 rounded-xl text-blue-800 text-xs leading-tight">
                        <Info size={16} className="shrink-0" />
                        <span>Tap your browser menu and select <span className="font-bold">"Add to Home screen"</span> to install.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button 
                onClick={dismiss}
                className="w-full text-center text-gray-400 text-sm font-bold py-2 hover:text-gray-600"
              >
                Maybe Later
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
