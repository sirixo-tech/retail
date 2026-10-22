"use client";

import React from "react";

interface GrokAgentAvatarProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  glowColor?: string;
  eyeColor?: string;
}

/**
 * Super futuristic Grok-style Agent Avatar
 * Rounded circular obsidian orb with glowing animated digital eyes (blinking & scanning).
 * Pure SVG with embedded 60fps CSS keyframes. Zero sparkles, zero dependencies.
 */
export function GrokAgentAvatar({
  size = "md",
  className = "",
  glowColor = "#38bdf8",
  eyeColor = "#38bdf8",
}: GrokAgentAvatarProps) {
  const dim = size === "sm" ? 36 : size === "lg" ? 56 : 44;

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ width: dim, height: dim }}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-md overflow-visible"
      >
        <style>{`
          @keyframes grokBlink {
            0%, 86%, 94%, 100% {
              transform: scaleY(1);
            }
            90% {
              transform: scaleY(0.08);
            }
          }
          @keyframes grokScan {
            0%, 100% {
              transform: translateX(0);
            }
            22% {
              transform: translateX(-3.2px);
            }
            44% {
              transform: translateX(0);
            }
            68% {
              transform: translateX(3.2px);
            }
            88% {
              transform: translateX(0);
            }
          }
          @keyframes grokBreathing {
            0%, 100% {
              opacity: 0.35;
              transform: scale(0.97);
            }
            50% {
              opacity: 0.75;
              transform: scale(1.03);
            }
          }
          .grok-anim-face {
            animation: grokScan 5.8s ease-in-out infinite;
            transform-origin: 50px 50px;
          }
          .grok-anim-eye {
            animation: grokBlink 3.8s ease-in-out infinite;
            transform-box: fill-box;
            transform-origin: center;
          }
          .grok-anim-ring {
            animation: grokBreathing 3.2s ease-in-out infinite;
            transform-origin: 50px 50px;
          }
        `}</style>

        <defs>
          {/* Spherical Head Gradient */}
          <radialGradient id="grokHeadGrad" cx="45%" cy="32%" r="68%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="55%" stopColor="#0b0f19" />
            <stop offset="100%" stopColor="#020617" />
          </radialGradient>

          {/* Outer Ambient Glow */}
          <radialGradient id="grokAmbientGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={glowColor} stopOpacity="0.45" />
            <stop offset="100%" stopColor={glowColor} stopOpacity="0" />
          </radialGradient>

          {/* Eye Gradient */}
          <linearGradient id="grokEyeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="40%" stopColor="#f0f9ff" />
            <stop offset="100%" stopColor={eyeColor} />
          </linearGradient>

          {/* Glow Filter */}
          <filter id="grokEyeFilter" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ambient Halo Pulse */}
        <circle cx="50" cy="50" r="49" fill="url(#grokAmbientGlow)" className="grok-anim-ring" />

        {/* Outer Ring */}
        <circle
          cx="50"
          cy="50"
          r="47"
          fill="none"
          stroke={glowColor}
          strokeWidth="1.2"
          strokeOpacity="0.35"
          className="grok-anim-ring"
        />

        {/* Rounded Obsidian Head */}
        <circle cx="50" cy="50" r="44" fill="url(#grokHeadGrad)" stroke="#334155" strokeWidth="1.5" />

        {/* Top Specular Arc */}
        <path
          d="M20 28 C 30 14, 70 14, 80 28 C 68 20, 32 20, 20 28 Z"
          fill="#ffffff"
          fillOpacity="0.14"
        />

        {/* Animated Eyes Group with Scanning Motion */}
        <g className="grok-anim-face">
          {/* Left Eye */}
          <rect
            x="32"
            y="37"
            width="12"
            height="26"
            rx="6"
            fill="url(#grokEyeGrad)"
            filter="url(#grokEyeFilter)"
            className="grok-anim-eye"
          />
          {/* Left Eye Pupil Highlight */}
          <circle cx="38" cy="43" r="2.2" fill="#ffffff" fillOpacity="0.85" />

          {/* Right Eye */}
          <rect
            x="56"
            y="37"
            width="12"
            height="26"
            rx="6"
            fill="url(#grokEyeGrad)"
            filter="url(#grokEyeFilter)"
            className="grok-anim-eye"
          />
          {/* Right Eye Pupil Highlight */}
          <circle cx="62" cy="43" r="2.2" fill="#ffffff" fillOpacity="0.85" />
        </g>
      </svg>
    </div>
  );
}
