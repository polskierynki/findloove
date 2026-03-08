'use client';

import { useState, useEffect } from 'react';

interface GuestState {
  clickCount: number;
  startTime: number;
  hasSeenModal: boolean;
}

const MAX_CLICKS = 3;
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
  const [showModal, setShowModal] = useState(false);
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [featureName, setFeatureName] = useState('Ta funkcja');

  // Save state to localStorage
  useEffect(() => {
    if (isLoggedIn) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, isLoggedIn]);

  // Timeout modal intentionally disabled - only click/feature prompts remain.

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
  };

  const resetState = () => {
    const startedAt = Date.now();
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
    return 0;
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
