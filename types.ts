export enum Color {
  RED = 'r',
  BLACK = 'b',
}

export enum PieceType {
  GENERAL = 'k', // King
  ADVISOR = 'a',
  ELEPHANT = 'e', // Elephant/Bishop
  HORSE = 'h',   // Knight
  CHARIOT = 'r', // Rook
  CANNON = 'c',
  SOLDIER = 'p', // Pawn
}

export interface Position {
  row: number;
  col: number;
}

export interface Piece {
  type: PieceType;
  color: Color;
}

export interface Move {
  from: Position;
  to: Position;
}

export type BoardState = (Piece | null)[][]; // 10 rows x 9 cols

export interface GameState {
  board: BoardState;
  turn: Color;
  selectedPos: Position | null;
  lastMove: Move | null;
  history: Move[];
  gameOver: boolean;
  winner: Color | null;
  isAiThinking: boolean;
}