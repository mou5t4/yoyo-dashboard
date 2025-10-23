import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AudioModeContextType {
  audioMode: 'browser' | 'device';
  setAudioMode: (mode: 'browser' | 'device') => void;
}

const AudioModeContext = createContext<AudioModeContextType | undefined>(undefined);

export function AudioModeProvider({ children }: { children: ReactNode }) {
  const [audioMode, setAudioModeState] = useState<'browser' | 'device'>('browser');

  // Load audio mode from localStorage on mount
  useEffect(() => {
    const savedMode = localStorage.getItem('audioMode') as 'browser' | 'device';
    if (savedMode && ['browser', 'device'].includes(savedMode)) {
      setAudioModeState(savedMode);
    }
  }, []);

  const setAudioMode = (mode: 'browser' | 'device') => {
    setAudioModeState(mode);
    localStorage.setItem('audioMode', mode);
  };

  return (
    <AudioModeContext.Provider value={{ audioMode, setAudioMode }}>
      {children}
    </AudioModeContext.Provider>
  );
}

export function useAudioMode() {
  const context = useContext(AudioModeContext);
  if (context === undefined) {
    throw new Error('useAudioMode must be used within an AudioModeProvider');
  }
  return context;
}
