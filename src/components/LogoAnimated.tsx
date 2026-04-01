'use client'

import { useEffect, useRef } from 'react'

/**
 * Animated G0DM0DƎ logo — faithfully ported from index.html
 *
 * The original has:
 *  - Green glow text-shadow on the full name
 *  - A slow "pulse-glow" breathing effect
 *  - Flicker micro-animation that fires randomly
 *  - The final "Ǝ" (backwards E) achieved via scaleX(-1)
 *  - A lightning bolt icon that bounces
 */
export function LogoAnimated({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const textRef = useRef<HTMLSpanElement>(null)

  // Random flicker effect — fires every 4-8 seconds
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>

    function scheduleFlicker() {
      const delay = 4000 + Math.random() * 4000
      timeout = setTimeout(() => {
        const el = textRef.current
        if (!el) { scheduleFlicker(); return }

        // Glitch: briefly drop shadow and shift
        el.style.transition = 'none'
        el.style.textShadow = 'none'
        el.style.transform = `translateX(${(Math.random() - 0.5) * 3}px)`
        el.style.opacity = '0.6'

        setTimeout(() => {
          if (!el) return
          el.style.transition = 'all 0.05s'
          el.style.textShadow = 'var(--logo-glow)'
          el.style.transform = 'translateX(0)'
          el.style.opacity = '0.9'

          setTimeout(() => {
            if (!el) return
            el.style.opacity = '1'
            scheduleFlicker()
          }, 80)
        }, 60)
      }, delay)
    }

    scheduleFlicker()
    return () => clearTimeout(timeout)
  }, [])

  const fontSize = size === 'sm' ? '15px' : size === 'lg' ? '26px' : '20px'

  return (
    <div
      className="logo"
      style={{ marginBottom: 0, gap: '8px' }}
    >
      {/* Bouncing lightning bolt */}
      <span
        className="logo-icon"
        style={{
          animation: 'logoIconBounce 2s ease-in-out infinite',
          display: 'inline-block',
        }}
      >
        ⚡
      </span>

      {/* Main logo text with glow */}
      <span
        ref={textRef}
        className="logo-text"
        style={{
          fontSize,
          fontWeight: 700,
          letterSpacing: '1px',
          animation: 'logoPulse 3s ease-in-out infinite',
          display: 'inline-flex',
          alignItems: 'center',
          // CSS var so it updates with theme
          color: 'var(--primary)',
          textShadow: 'var(--logo-glow)',
        }}
      >
        {/* G0DM0 */}
        {'G0DM0'}
        {/* D — flipped */}
        <span style={{ display: 'inline-block', transform: 'scaleX(-1)' }}>D</span>
        {/* Ǝ — soft flipped */}
        <span style={{ display: 'inline-block', transform: 'scaleX(-1)' }}>E</span>
      </span>
    </div>
  )
}
