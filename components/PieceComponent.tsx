import React from 'react';
import { Color, Piece, PieceType } from '../types';

interface PieceProps {
  piece: Piece;
  size?: number;
}

const PieceComponent: React.FC<PieceProps> = ({ piece, size = 40 }) => {
  const isRed = piece.color === Color.RED;
  
  // Mapping characters based on Color (Red/Black have different chars for same roles usually)
  const getChar = (p: Piece) => {
    switch (p.type) {
      case PieceType.GENERAL: return isRed ? '帅' : '将';
      case PieceType.ADVISOR: return isRed ? '仕' : '士';
      case PieceType.ELEPHANT: return isRed ? '相' : '象';
      case PieceType.HORSE: return isRed ? '马' : '马'; // Traditional can differ 傌/馬 but simplified often same
      case PieceType.CHARIOT: return isRed ? '车' : '车'; // 俥/車
      case PieceType.CANNON: return isRed ? '炮' : '炮'; // 炮/砲
      case PieceType.SOLDIER: return isRed ? '兵' : '卒';
      default: return '';
    }
  };

  const char = getChar(piece);

  return (
    <div 
      className={`
        rounded-full border-2 shadow-md flex items-center justify-center select-none
        ${isRed ? 'bg-[#fdf0d5] border-[#b91c1c] text-[#b91c1c]' : 'bg-[#fdf0d5] border-black text-black'}
      `}
      style={{ 
        width: `${size}px`, 
        height: `${size}px`,
        boxShadow: '2px 2px 4px rgba(0,0,0,0.3), inset 0 0 8px rgba(0,0,0,0.1)'
      }}
    >
      <span className="font-chinese font-bold" style={{ fontSize: `${size * 0.6}px`, lineHeight: 1 }}>
        {char}
      </span>
      {/* Inner ring for aesthetic */}
      <div 
        className="absolute rounded-full border opacity-30 pointer-events-none"
        style={{
          width: `${size * 0.8}px`,
          height: `${size * 0.8}px`,
          borderColor: isRed ? '#b91c1c' : 'black'
        }}
      />
    </div>
  );
};

export default PieceComponent;