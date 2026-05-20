import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

export const usePWAInstall = () => {
  const promptRef = useRef<any>(null);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (typeof window === 'undefined') return;

    // Already running as installed PWA — no need to show install banner
    if (window.matchMedia?.('(display-mode: standalone)').matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      promptRef.current = e;
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async (): Promise<boolean> => {
    if (!promptRef.current) return false;
    promptRef.current.prompt();
    const { outcome } = await promptRef.current.userChoice;
    promptRef.current = null;
    setCanInstall(false);
    return outcome === 'accepted';
  };

  const dismiss = () => {
    promptRef.current = null;
    setCanInstall(false);
  };

  return { canInstall, install, dismiss };
};
