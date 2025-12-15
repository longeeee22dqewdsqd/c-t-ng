import React from 'react';
import { BoardState, Color, Move, Position } from '../types';
import PieceComponent from './PieceComponent';

interface BoardProps {
  board: BoardState;
  onSquareClick: (pos: Position) => void;
  selectedPos: Position | null;
  validMoves: Move[];
  lastMove: Move | null;
  flipped?: boolean; // If playing as black, might want to flip board visually
}

const Board: React.FC<BoardProps> = ({ 
  board, 
  onSquareClick, 
  selectedPos, 
  validMoves,
  lastMove,
  flipped = false 
}) => {
  // Xiangqi board is 9x10 intersections.
  // We render lines using SVG for precision.
  const cols = 9;
  const rows = 10;
  const squareSize = 50; // Base unit
  const width = (cols - 1) * squareSize;
  const height = (rows - 1) * squareSize;
  const padding = 30; // Padding around the grid for piece overflow

  const renderGridLines = () => {
    const lines = [];
    
    // Horizontal Lines
    for (let r = 0; r < rows; r++) {
       lines.push(
         <line 
            key={`h-${r}`} 
            x1={0} y1={r * squareSize} 
            x2={width} y2={r * squareSize} 
            stroke="#5c4033" strokeWidth="1.5" 
         />
       );
    }

    // Vertical Lines (split by river)
    for (let c = 0; c < cols; c++) {
      if (c === 0 || c === cols - 1) {
        // Outer borders go all the way
        lines.push(
          <line 
            key={`v-outer-${c}`}
            x1={c * squareSize} y1={0}
            x2={c * squareSize} y2={height}
            stroke="#5c4033" strokeWidth="1.5"
          />
        );
      } else {
        // Inner lines stop at river (between row 4 and 5)
        lines.push(
            <line 
                key={`v-top-${c}`}
                x1={c * squareSize} y1={0}
                x2={c * squareSize} y2={4 * squareSize}
                stroke="#5c4033" strokeWidth="1.5"
            />
        );
        lines.push(
            <line 
                key={`v-bot-${c}`}
                x1={c * squareSize} y1={5 * squareSize}
                x2={c * squareSize} y2={9 * squareSize}
                stroke="#5c4033" strokeWidth="1.5"
            />
        );
      }
    }

    // Palace Diagonals (Top)
    lines.push(<line key="d-t-1" x1={3*squareSize} y1={0} x2={5*squareSize} y2={2*squareSize} stroke="#5c4033" strokeWidth="1.5" />);
    lines.push(<line key="d-t-2" x1={5*squareSize} y1={0} x2={3*squareSize} y2={2*squareSize} stroke="#5c4033" strokeWidth="1.5" />);

    // Palace Diagonals (Bottom)
    lines.push(<line key="d-b-1" x1={3*squareSize} y1={7*squareSize} x2={5*squareSize} y2={9*squareSize} stroke="#5c4033" strokeWidth="1.5" />);
    lines.push(<line key="d-b-2" x1={5*squareSize} y1={7*squareSize} x2={3*squareSize} y2={9*squareSize} stroke="#5c4033" strokeWidth="1.5" />);

    // Cross markers (initial soldier/cannon positions)
    // Helper for "L" markers
    const addMarker = (r: number, c: number) => {
        const gap = 4;
        const len = 10;
        const x = c * squareSize;
        const y = r * squareSize;
        const markers = [];
        // Top Left
        if (c > 0) markers.push(<polyline key={`m-${r}-${c}-tl`} points={`${x-gap-len},${y-gap} ${x-gap},${y-gap} ${x-gap},${y-gap-len}`} fill="none" stroke="#5c4033" strokeWidth="1.5" />);
        // Top Right
        if (c < 8) markers.push(<polyline key={`m-${r}-${c}-tr`} points={`${x+gap+len},${y-gap} ${x+gap},${y-gap} ${x+gap},${y-gap-len}`} fill="none" stroke="#5c4033" strokeWidth="1.5" />);
        // Bottom Left
        if (c > 0) markers.push(<polyline key={`m-${r}-${c}-bl`} points={`${x-gap-len},${y+gap} ${x-gap},${y+gap} ${x-gap},${y+gap+len}`} fill="none" stroke="#5c4033" strokeWidth="1.5" />);
        // Bottom Right
        if (c < 8) markers.push(<polyline key={`m-${r}-${c}-br`} points={`${x+gap+len},${y+gap} ${x+gap},${y+gap} ${x+gap},${y+gap+len}`} fill="none" stroke="#5c4033" strokeWidth="1.5" />);
        return markers;
    };

    // Cannon markers
    lines.push(...addMarker(2, 1));
    lines.push(...addMarker(2, 7));
    lines.push(...addMarker(7, 1));
    lines.push(...addMarker(7, 7));
    
    // Soldier markers
    for (let i = 0; i <= 8; i+=2) {
        lines.push(...addMarker(3, i));
        lines.push(...addMarker(6, i));
    }

    return lines;
  };

  return (
    <div className="relative wood-texture rounded-lg shadow-2xl select-none" style={{ padding: padding }}>
      {/* River Label */}
      <div 
        className="absolute w-full flex justify-between px-16 text-[#5c4033] opacity-60 font-chinese text-xl font-bold pointer-events-none"
        style={{ top: '50%', transform: 'translateY(-50%)', left: 0 }}
      >
        <span>楚 河</span>
        <span>汉 界</span>
      </div>

      <svg width={width} height={height} className="absolute z-0 pointer-events-none">
         {renderGridLines()}
      </svg>

      {/* Pieces Grid */}
      <div 
        className="relative z-10 grid"
        style={{
            gridTemplateColumns: `repeat(${cols}, ${squareSize}px)`,
            gridTemplateRows: `repeat(${rows}, ${squareSize}px)`,
            width: width + squareSize, // Correction for grid width vs line width
            height: height + squareSize,
            transform: `translate(-${squareSize/2}px, -${squareSize/2}px)` // Center pieces on intersections
        }}
      >
        {board.map((row, r) => (
            row.map((piece, c) => {
                const isSelected = selectedPos?.row === r && selectedPos?.col === c;
                const isValidMove = validMoves.some(m => m.to.row === r && m.to.col === c);
                const isLastMoveSrc = lastMove?.from.row === r && lastMove?.from.col === c;
                const isLastMoveDst = lastMove?.to.row === r && lastMove?.to.col === c;

                return (
                    <div 
                        key={`${r}-${c}`}
                        className="flex items-center justify-center relative cursor-pointer"
                        onClick={() => onSquareClick({ row: r, col: c })}
                    >
                        {/* Highlights */}
                        {isSelected && (
                             <div className="absolute w-[46px] h-[46px] bg-green-500/40 rounded-full animate-pulse z-0" />
                        )}
                        {(isLastMoveSrc || isLastMoveDst) && (
                             <div className="absolute w-[46px] h-[46px] bg-yellow-500/30 rounded-full z-0" />
                        )}
                        
                        {/* Move Indicator (Dot) */}
                        {isValidMove && !piece && (
                            <div className="absolute w-3 h-3 bg-green-600 rounded-full opacity-60 z-20" />
                        )}
                        {/* Capture Indicator (Ring) */}
                        {isValidMove && piece && (
                            <div className="absolute w-[50px] h-[50px] border-4 border-red-500/50 rounded-full z-20" />
                        )}

                        {piece && <div className="z-10"><PieceComponent piece={piece} size={44} /></div>}
                    </div>
                );
            })
        ))}
      </div>
    </div>
  );
};

export default Board;