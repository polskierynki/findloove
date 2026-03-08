'use client';

import { useState, useEffect } from 'react';

interface GuestState {
  clickCount: number;
  startTime: number;
  hasSeenModal: boolean;
}

const MAX_CLICKS = 3;
const MAX_TIME_SECONDS = 40; // Changed from 5 minutes to 40 seconds
const STORAGE_KEY = 'guestState';
const DEFAULT_START_TIME = Date.now();

export function useGuestRestrictions(isLoggedIn: boolean) {
  const [state, setState] = useState<GuestState>(() => {
    const defaults: GuestState = { clickCount: 0, startTime: DEFAULT_START_TIME, hasSeenModal: false };
    if (typeof window === 'undefined') return defaults;

    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaults;

    try {
      const parsed = JSON.parse(saved) as Partial<GuestState>;
      return {
        clickCount: typeof parsed.clickCount === 'number' ? parsed.clickCount : 0,
        startTime: typeof parsed.startTime === 'number' ? parsed.startTime : DEFAULT_START_TIME,
        hasSeenModal: Boolean(parsed.hasSeenModal),
      };
    } catch (e) {
      console.error('Failed to parse guest state', e);
      return defaults;
    }
  });
  const [elapsedMs, setElapsedMs] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [featureName, setFeatureName] = useState('Ta funkcja');

  // Save state to localStorage
  useEffect(() => {
    if (isLoggedIn) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, isLoggedIn]);

  // Track elapsed guest session time and trigger timeout modal
  useEffect(() => {
    if (isLoggedIn) return;
    if (!state.startTime) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - state.startTime;
      setElapsedMs(elapsed);

      if (elapsed >= MAX_TIME_SECONDS * 1000) {
        setShowTimeoutModal(true);
      }
    }, 1000); // Check every second for more accurate timing

    return () => clearInterval(interval);
  }, [state.startTime, isLoggedIn]);

  const trackClick = () => {
    if (isLoggedIn) return;

    setState((prev) => {
      const startedAt = prev.startTime || DEFAULT_START_TIME;

      const newCount = prev.clickCount + 1;
      
      if (newCount >= MAX_CLICKS && !prev.hasSeenModal) {
        setShowModal(true);
        return { ...prev, startTime: startedAt, clickCount: newCount, hasSeenModal: true };
      }
      
      return { ...prev, startTime: startedAt, clickCount: newCount };
    });
  };

  const closeModal = () => {
    setShowModal(false);
    setShowFeatureModal(false);
    setFeatureName('Ta funkcja');
  };

  const closeTimeoutModal = () => {
    setShowTimeoutModal(false);
    // Reset timer - start counting 40 seconds from now
    const newStartTime = Date.now();
    setState(prev => ({
      ...prev,
      startTime: newStartTime
    }));
    setElapsedMs(0);
  };

  const resetState = () => {
    const startedAt = Date.now();
    setElapsedMs(0);
    setState({
      clickCount: 0,
      startTime: startedAt,
      hasSeenModal: false,
    });
    localStorage.removeItem(STORAGE_KEY);
  };

  const shouldBlurPhoto = (index: number, total: number): boolean => {
    if (isLoggedIn) return false;
    
    // Show first 2 photos sharp, rest blurred (70% blur rate)
    return total > 2 && index >= 2;
  };

  const canViewFullProfile = (): boolean => {
    return isLoggedIn;
  };

  const canSendMessage = (): boolean => {
    return isLoggedIn;
  };

  const canLikeProfile = (): boolean => {
    return isLoggedIn;
  };

  const getVisibleProfilesLimit = (): number => {
    return isLoggedIn ? 999 : 6;
  };

  const getRemainingTime = (): number => {
    if (!state.startTime) return MAX_TIME_SECONDS;
    const elapsed = elapsedMs;
    const remaining = (MAX_TIME_SECONDS * 1000) - elapsed;
    return Math.max(0, Math.floor(remaining / 1000)); // Return seconds instead of minutes
  };

  const triggerFeatureModal = (blockedFeatureName: string = 'Ta funkcja') => {
    setFeatureName(blockedFeatureName);
    setShowFeatureModal(true);
  };

  return {
    // State
    isRestricted: !isLoggedIn,
    clickCount: state.clickCount,
    maxClicks: MAX_CLICKS,
    remainingTime: getRemainingTime(),
    featureName,
    
    // Modals
    showModal,
    closeModal,
    showTimeoutModal,
    closeTimeoutModal,
    showFeatureModal,
    triggerFeatureModal,
    
    // Actions
    trackClick,
    resetState,
    
    // Permissions
    shouldBlurPhoto,
    canViewFullProfile,
    canSendMessage,
    canLikeProfile,
    getVisibleProfilesLimit,
  };
}
