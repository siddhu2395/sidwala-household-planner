import React, { useEffect, useState } from 'react';

const COLORS = ['#C3B1E1', '#A8E6CF', '#FFB7B2', '#FFDAC1', '#B5D8F7', '#FF9AA2', '#FFF3B0'];
const SHAPES = ['\u2605', '\u2665', '\u25CF', '\u25A0', '\u2736'];

export default function Confetti({ active }) {
  const [pieces, setPieces] = useState([]);

  useEffect(() => {
    if (active) {
      const newPieces = Array.from({ length: 40 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
        delay: Math.random() * 0.5,
        size: 10 + Math.random() * 16,
        duration: 2 + Math.random() * 2,
      }));
      setPieces(newPieces);

      const timer = setTimeout(() => setPieces([]), 4000);
      return () => clearTimeout(timer);
    }
  }, [active]);

  if (pieces.length === 0) return null;

  return (
    <div className="confetti-container">
      {pieces.map(p => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            color: p.color,
            fontSize: `${p.size}px`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        >
          {p.shape}
        </div>
      ))}
    </div>
  );
}
