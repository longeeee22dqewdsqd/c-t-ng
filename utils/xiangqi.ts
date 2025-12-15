import { BoardState, Color, Move, Piece, PieceType, Position } from '../types';

export const INITIAL_FEN = "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1";

// Helper to check if pos is within board
const isValidPos = (r: number, c: number) => r >= 0 && r < 10 && c >= 0 && c < 9;

export const createInitialBoard = (): BoardState => {
  return parseFen(INITIAL_FEN);
};

// Parse a FEN string to a BoardState
export const parseFen = (fen: string): BoardState => {
  const rows = fen.split(' ')[0].split('/');
  const board: BoardState = [];

  for (let r = 0; r < 10; r++) {
    const rowData: (Piece | null)[] = [];
    const rowString = rows[r];
    let colIndex = 0;
    
    for (let i = 0; i < rowString.length; i++) {
      const char = rowString[i];
      if (/\d/.test(char)) {
        const spaces = parseInt(char);
        for (let j = 0; j < spaces; j++) {
          rowData.push(null);
          colIndex++;
        }
      } else {
        const color = char === char.toUpperCase() ? Color.RED : Color.BLACK;
        const typeChar = char.toLowerCase();
        
        let type = PieceType.SOLDIER;
        switch(typeChar) {
          case 'k': type = PieceType.GENERAL; break;
          case 'a': type = PieceType.ADVISOR; break;
          case 'b': case 'e': type = PieceType.ELEPHANT; break; // FEN uses 'b' (bishop) for elephant usually, or 'e'
          case 'n': case 'h': type = PieceType.HORSE; break;    // FEN uses 'n' (knight) for horse
          case 'r': type = PieceType.CHARIOT; break;
          case 'c': type = PieceType.CANNON; break;
          case 'p': type = PieceType.SOLDIER; break;
        }

        // Correct common FEN mapping for Elephant: 'b' in standard chess FEN is Bishop, maps to Elephant here
        if (typeChar === 'b') type = PieceType.ELEPHANT; 
        if (typeChar === 'n') type = PieceType.HORSE;

        rowData.push({ type, color });
        colIndex++;
      }
    }
    board.push(rowData);
  }
  return board;
};

// Convert board to simplified FEN (just board state) for AI context
export const boardToFen = (board: BoardState, turn: Color): string => {
  let fen = "";
  for(let r = 0; r < 10; r++) {
    let emptyCount = 0;
    for(let c = 0; c < 9; c++) {
      const piece = board[r][c];
      if (!piece) {
        emptyCount++;
      } else {
        if (emptyCount > 0) {
          fen += emptyCount;
          emptyCount = 0;
        }
        let char = '';
        switch(piece.type) {
          case PieceType.GENERAL: char = 'k'; break;
          case PieceType.ADVISOR: char = 'a'; break;
          case PieceType.ELEPHANT: char = 'b'; break; // Use standard FEN 'b'
          case PieceType.HORSE: char = 'n'; break;    // Use standard FEN 'n'
          case PieceType.CHARIOT: char = 'r'; break;
          case PieceType.CANNON: char = 'c'; break;
          case PieceType.SOLDIER: char = 'p'; break;
        }
        if (piece.color === Color.RED) char = char.toUpperCase();
        fen += char;
      }
    }
    if (emptyCount > 0) fen += emptyCount;
    if (r < 9) fen += "/";
  }
  fen += ` ${turn === Color.RED ? 'w' : 'b'} - - 0 1`; // Basic tail
  return fen;
};

// --- Move Validation Logic ---

export const getLegalMoves = (board: BoardState, turn: Color): Move[] => {
  const moves: Move[] = [];
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const piece = board[r][c];
      if (piece && piece.color === turn) {
        const from = { row: r, col: c };
        const potentialMoves = getPseudoLegalMoves(board, from, piece);
        // Filter out moves that leave General in check (Simplified: we trust Gemini for complex checkmate, 
        // but basic "don't suicide" is good for UI). 
        // For this demo, we will use pseudo-legal for highlighting to keep it performant, 
        // strictly enforcing simple movement rules.
        moves.push(...potentialMoves);
      }
    }
  }
  return moves;
};

const getPseudoLegalMoves = (board: BoardState, from: Position, piece: Piece): Move[] => {
  const moves: Move[] = [];
  const { row, col } = from;
  const isRed = piece.color === Color.RED;

  const addIfValid = (r: number, c: number) => {
    if (isValidPos(r, c)) {
      const target = board[r][c];
      if (!target || target.color !== piece.color) {
        moves.push({ from, to: { row: r, col: c } });
      }
    }
  };

  switch (piece.type) {
    case PieceType.GENERAL: // 1 step orthogonal, confined to palace
      const movesG = [[0, 1], [0, -1], [1, 0], [-1, 0]];
      movesG.forEach(([dr, dc]) => {
        const nr = row + dr, nc = col + dc;
        if (isValidPos(nr, nc)) {
           // Palace bounds
           const inPalace = isRed 
             ? (nr >= 7 && nr <= 9 && nc >= 3 && nc <= 5)
             : (nr >= 0 && nr <= 2 && nc >= 3 && nc <= 5);
           if (inPalace) addIfValid(nr, nc);
        }
      });
      // Flying general rule is complex, often ignored in simple UI helpers, but Gemini knows it.
      break;

    case PieceType.ADVISOR: // 1 step diagonal, confined to palace
      const movesA = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
      movesA.forEach(([dr, dc]) => {
        const nr = row + dr, nc = col + dc;
        if (isValidPos(nr, nc)) {
           const inPalace = isRed 
             ? (nr >= 7 && nr <= 9 && nc >= 3 && nc <= 5)
             : (nr >= 0 && nr <= 2 && nc >= 3 && nc <= 5);
           if (inPalace) addIfValid(nr, nc);
        }
      });
      break;

    case PieceType.ELEPHANT: // 2 step diagonal, cannot cross river, blocked by eye
      const movesE = [[2, 2], [2, -2], [-2, 2], [-2, -2]];
      movesE.forEach(([dr, dc]) => {
        const nr = row + dr, nc = col + dc;
        if (isValidPos(nr, nc)) {
          // River boundary
          const canCross = isRed ? nr >= 5 : nr <= 4; 
          if (!canCross) return; // Cannot cross to other side

          // Eye block
          const eyeR = row + dr / 2, eyeC = col + dc / 2;
          if (!board[eyeR][eyeC]) { // If eye is empty
            addIfValid(nr, nc);
          }
        }
      });
      break;

    case PieceType.HORSE: // Sun jump, blocked by leg
      const movesH = [
        [2, 1, 1, 0], [2, -1, 1, 0], 
        [-2, 1, -1, 0], [-2, -1, -1, 0],
        [1, 2, 0, 1], [1, -2, 0, -1],
        [-1, 2, 0, 1], [-1, -2, 0, -1]
      ]; // dr, dc, legDr, legDc
      movesH.forEach(([dr, dc, ldr, ldc]) => {
        const nr = row + dr, nc = col + dc;
        const lr = row + ldr, lc = col + ldc;
        if (isValidPos(nr, nc) && !board[lr][lc]) {
          addIfValid(nr, nc);
        }
      });
      break;

    case PieceType.CHARIOT: // Orthogonal unlimited
      [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dr, dc]) => {
        let nr = row + dr, nc = col + dc;
        while (isValidPos(nr, nc)) {
          const target = board[nr][nc];
          if (!target) {
            moves.push({ from, to: { row: nr, col: nc } });
          } else {
            if (target.color !== piece.color) moves.push({ from, to: { row: nr, col: nc } });
            break; 
          }
          nr += dr; nc += dc;
        }
      });
      break;

    case PieceType.CANNON: // Move like rook, capture like jump
      [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dr, dc]) => {
        let nr = row + dr, nc = col + dc;
        let screenFound = false;
        while (isValidPos(nr, nc)) {
          const target = board[nr][nc];
          if (!screenFound) {
            if (!target) {
              moves.push({ from, to: { row: nr, col: nc } });
            } else {
              screenFound = true;
            }
          } else {
            if (target) {
              if (target.color !== piece.color) moves.push({ from, to: { row: nr, col: nc } });
              break; // Can only jump one
            }
          }
          nr += dr; nc += dc;
        }
      });
      break;

    case PieceType.SOLDIER: // Forward 1. Side 1 after river.
      const forward = isRed ? -1 : 1;
      // Forward
      if (isValidPos(row + forward, col)) addIfValid(row + forward, col);
      
      // Horizontal if crossed river
      const crossedRiver = isRed ? row <= 4 : row >= 5;
      if (crossedRiver) {
        if (isValidPos(row, col + 1)) addIfValid(row, col + 1);
        if (isValidPos(row, col - 1)) addIfValid(row, col - 1);
      }
      break;
  }

  return moves;
};