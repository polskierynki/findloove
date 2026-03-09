'use client';

import { useEffect } from 'react';

/**
 * FloatingParticles - Animowane tło z delikatnymi "bombelkami"
 * Tworzy 35 cząsteczek w losowych kolorach (magenta, cyan, gold)
 * które powoli płyną w górę z efektem glow
 */
export default function FloatingParticles() {
  useEffect(() => {
    const container = document.getElementById('particles-container');
    if (!container) return;

    const colors = [
      'rgba(255, 0, 255, 0.4)',   // Magenta
      'rgba(0, 255, 255, 0.4)',   // Cyan
      'rgba(255, 215, 0, 0.2)',   // Gold
    ];

    // Tworzymy 35 cząsteczek
    for (let i = 0; i < 35; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      
      // Losowe parametry dla każdej cząsteczki
      const size = Math.random() * 3 + 1; // 1-4px
      const color = colors[Math.floor(Math.random() * colors.length)];
      const left = Math.random() * 100; // 0-100vw
      const duration = Math.random() * 15 + 10; // 10-25s
      const delay = Math.random() * 10; // 0-10s
      const glowSize = Math.random() * 10 + 2; // 2-12px
      
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.left = `${left}vw`;
      particle.style.animationDuration = `${duration}s`;
      particle.style.animationDelay = `${delay}s`;
      particle.style.backgroundColor = color;
      particle.style.boxShadow = `0 0 ${glowSize}px ${color}`;
      
      container.appendChild(particle);
    }

    // Cleanup przy unmount
    return () => {
      if (container) {
        container.innerHTML = '';
      }
    };
  }, []);

  return (
    <div 
      id="particles-container" 
      className="particles-container"
      aria-hidden="true"
    />
  );
}
