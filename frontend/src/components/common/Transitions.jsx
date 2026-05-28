import React, { useState, useEffect, useRef } from 'react';

/**
 * Unified Transition System
 * Replaces skeleton loaders with smooth fade-in transitions
 * Respects prefers-reduced-motion for accessibility
 */

// ============================================
// PAGE TRANSITION - For full page loading states
// ============================================

/**
 * PageTransition - Wraps page content with a smooth fade-in effect
 * Shows a minimal spinner during initial load, then fades in content
 * 
 * @param {boolean} loading - Whether content is still loading
 * @param {React.ReactNode} children - Content to display after loading
 * @param {string} className - Additional CSS classes
 * @param {number} minLoadTime - Minimum time to show loading state (prevents flash)
 * @param {string} loadingMessage - Optional message to show during loading
 */
export function PageTransition({ 
  loading = false, 
  children, 
  className = '',
  minLoadTime = 200,
  loadingMessage = ''
}) {
  const [showContent, setShowContent] = useState(!loading);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const loadStartRef = useRef(Date.now());

  useEffect(() => {
    if (loading) {
      loadStartRef.current = Date.now();
      setShowContent(false);
      setIsTransitioning(false);
    } else {
      // Ensure minimum load time to prevent flash
      const elapsed = Date.now() - loadStartRef.current;
      const remaining = Math.max(0, minLoadTime - elapsed);
      
      const timer = setTimeout(() => {
        setIsTransitioning(true);
        // Small delay before showing content for smooth transition
        requestAnimationFrame(() => {
          setShowContent(true);
        });
      }, remaining);

      return () => clearTimeout(timer);
    }
  }, [loading, minLoadTime]);

  if (loading || !showContent) {
    return (
      <div 
        className={`flex items-center justify-center min-h-[200px] ${className}`}
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="spinner spinner-lg" aria-hidden="true" />
          {loadingMessage && (
            <p className="text-sm text-gray-500 font-medium">{loadingMessage}</p>
          )}
          <span className="sr-only">Loading content...</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`transition-content ${isTransitioning ? 'content-visible' : ''} ${className}`}
      aria-busy="false"
    >
      {children}
    </div>
  );
}

// ============================================
// CONTENT TRANSITION - For sections/cards/lists
// ============================================

/**
 * ContentTransition - Fades in content smoothly
 * Use for individual sections, cards, or list items
 * 
 * @param {boolean} show - Whether to show the content
 * @param {React.ReactNode} children - Content to display
 * @param {string} className - Additional CSS classes
 * @param {number} delay - Delay before starting transition (for staggered effects)
 * @param {'fade'|'slide-up'|'scale'} variant - Animation variant
 */
export function ContentTransition({ 
  show = true, 
  children, 
  className = '',
  delay = 0,
  variant = 'fade'
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, delay);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [show, delay]);

  const variantClasses = {
    fade: 'transition-fade',
    'slide-up': 'transition-slide-up',
    scale: 'transition-scale',
  };

  return (
    <div 
      className={`${variantClasses[variant] || 'transition-fade'} ${isVisible ? 'visible' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

// ============================================
// STAGGERED LIST - For lists with staggered fade-in
// ============================================

/**
 * StaggeredList - Renders list items with staggered fade-in animation
 * 
 * @param {Array} items - Array of items to render
 * @param {Function} renderItem - Function to render each item (item, index) => ReactNode
 * @param {boolean} loading - Whether list is still loading
 * @param {number} staggerDelay - Delay between each item's animation (ms)
 * @param {string} className - Container class
 * @param {string} itemClassName - Class for each item wrapper
 * @param {React.ReactNode} emptyState - What to show when items is empty
 * @param {React.ReactNode} loadingState - What to show while loading (optional spinner)
 */
export function StaggeredList({
  items = [],
  renderItem,
  loading = false,
  staggerDelay = 50,
  className = '',
  itemClassName = '',
  emptyState = null,
  loadingState = null,
}) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (loading) {
      setVisibleCount(0);
      return;
    }

    if (items.length === 0) {
      setVisibleCount(0);
      return;
    }

    // Stagger the visibility of items
    let count = 0;
    const interval = setInterval(() => {
      count++;
      setVisibleCount(count);
      if (count >= items.length) {
        clearInterval(interval);
      }
    }, staggerDelay);

    return () => clearInterval(interval);
  }, [items, loading, staggerDelay]);

  if (loading) {
    return loadingState || (
      <div className="flex items-center justify-center py-8" role="status">
        <div className="spinner spinner-md" aria-hidden="true" />
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return emptyState;
  }

  return (
    <div className={className}>
      {items.map((item, index) => (
        <div
          key={item.id || index}
          className={`transition-fade ${index < visibleCount ? 'visible' : ''} ${itemClassName}`}
        >
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
}

// ============================================
// LOADING OVERLAY - For overlay on existing content
// ============================================

/**
 * LoadingOverlay - Shows a subtle overlay while refreshing content
 * Content remains visible but dimmed
 * 
 * @param {boolean} loading - Whether to show the overlay
 * @param {React.ReactNode} children - Content underneath
 * @param {string} className - Additional classes
 */
export function LoadingOverlay({ 
  loading = false, 
  children, 
  className = '' 
}) {
  return (
    <div className={`relative ${className}`}>
      {children}
      {loading && (
        <div 
          className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10 transition-opacity duration-200"
          role="status"
          aria-live="polite"
        >
          <div className="spinner spinner-md" aria-hidden="true" />
          <span className="sr-only">Refreshing...</span>
        </div>
      )}
    </div>
  );
}

// ============================================
// SHIMMER PLACEHOLDER - Minimal shimmer for images/avatars only
// ============================================

/**
 * ShimmerPlaceholder - A subtle shimmer effect for image placeholders
 * Use sparingly - only for images/avatars where shape matters
 */
export function ShimmerPlaceholder({ 
  className = '', 
  variant = 'rect' // 'rect' | 'circle'
}) {
  const baseClasses = 'bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:200%_100%] animate-shimmer';
  const shapeClasses = variant === 'circle' ? 'rounded-full' : 'rounded-lg';

  return (
    <div 
      className={`${baseClasses} ${shapeClasses} ${className}`}
      aria-hidden="true"
    />
  );
}

// ============================================
// TRANSITION WRAPPER - Generic wrapper with enter/exit animations
// ============================================

/**
 * TransitionWrapper - Generic component for enter/exit transitions
 * 
 * @param {boolean} show - Whether content should be visible
 * @param {React.ReactNode} children - Content to animate
 * @param {string} enterClass - Classes to apply when entering
 * @param {string} exitClass - Classes to apply when exiting
 * @param {number} duration - Animation duration in ms
 */
export function TransitionWrapper({
  show = true,
  children,
  enterClass = 'opacity-100 translate-y-0',
  exitClass = 'opacity-0 translate-y-2',
  duration = 200,
  className = '',
}) {
  const [shouldRender, setShouldRender] = useState(show);
  const [animationClass, setAnimationClass] = useState(show ? enterClass : exitClass);

  useEffect(() => {
    if (show) {
      setShouldRender(true);
      // Small delay to ensure DOM is ready
      requestAnimationFrame(() => {
        setAnimationClass(enterClass);
      });
    } else {
      setAnimationClass(exitClass);
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, enterClass, exitClass, duration]);

  if (!shouldRender) return null;

  return (
    <div 
      className={`transition-all ease-out ${className}`}
      style={{ transitionDuration: `${duration}ms` }}
    >
      <div className={`transition-all ease-out ${animationClass}`} style={{ transitionDuration: `${duration}ms` }}>
        {children}
      </div>
    </div>
  );
}

export default {
  PageTransition,
  ContentTransition,
  StaggeredList,
  LoadingOverlay,
  ShimmerPlaceholder,
  TransitionWrapper,
};
