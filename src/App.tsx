import { useState, useEffect } from 'react';
import { SlidePresentation } from './components/SlidePresentation';
import { LockScreen } from './components/LockScreen';

function App() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Check if already logged in
  useEffect(() => {
    const unlocked = localStorage.getItem('slide_app_unlocked') === 'true';
    setIsUnlocked(unlocked);
    setIsLoaded(true);
  }, []);

  const handleUnlock = () => {
    setIsUnlocked(true);
  };

  // Show nothing while checking login state
  if (!isLoaded) {
    return null;
  }

  // Show lock screen if not unlocked
  if (!isUnlocked) {
    return <LockScreen onUnlock={handleUnlock} />;
  }

  return <SlidePresentation />;
}

export default App;
