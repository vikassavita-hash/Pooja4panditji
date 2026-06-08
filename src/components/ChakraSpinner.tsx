import React from 'react';

export default function ChakraSpinner({ size = 64 }: { size?: number }) {
  const s = size;
  return (
    <div style={{ width: s, height: s }} className="chakra-spin chakra-ring">
      <svg viewBox="0 0 100 100" width={s} height={s} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g1" x1="0%" x2="100%">
            <stop offset="0%" stopColor="#ffd27a" />
            <stop offset="100%" stopColor="#ff7a59" />
          </linearGradient>
        </defs>
        <g fill="none" strokeWidth="3" stroke="url(#g1)" strokeLinecap="round">
          <circle cx="50" cy="50" r="34" strokeOpacity="0.12" />
          <path d="M50 16 A34 34 0 0 1 84 50" strokeOpacity="0.95" />
          <path d="M84 50 A34 34 0 0 1 50 84" strokeOpacity="0.6" />
          <path d="M50 84 A34 34 0 0 1 16 50" strokeOpacity="0.4" />
          <path d="M16 50 A34 34 0 0 1 50 16" strokeOpacity="0.25" />
        </g>
      </svg>
    </div>
  );
}
