import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BoardState, Color, GameState, Move, PieceType, Position } from './types';
import { createInitialBoard, getLegalMoves } from './utils/xiangqi';
import { getAiMove } from './services/geminiService';
import Board from './components/Board';
import { RotateCcw, BrainCircuit, Users, Play, AlertTriangle } from 'lucide-react';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    board: createInitialBoard(),
    turn: Color.RED,
    selectedPos: null,
    lastMove: null,
    history: [],
    gameOver: false,
    winner: null,
    isAiThinking: false,
  });

  const [gameMode, setGameMode] = useState<'PvP' | 'PvAI'>('PvAI');
  const [aiColor, setAiColor] = useState<Color>(Color.BLACK);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [validMoves, setValidMoves] = useState<Move[]>([]);

  // Check for Game Over (simplified: if no general or no legal moves)
  // Real Xiangqi has stalemate rules, but for now checkmate/no king is enough.
  const checkGameOver = useCallback((board: BoardState, turn: Color) => {
    // 1. Check if King is missing
    let redKing = false;
    let blackKing = false;
    board.forEach(row => row.forEach(p => {
        if (p?.type === PieceType.GENERAL) {
            if (p.color === Color.RED) redKing = true;
            else blackKing = true;
        }
    }));
    if (!redKing) return Color.BLACK;
    if (!blackKing) return Color.RED;

    // 2. Check no legal moves (Stalemate usually loss in Xiangqi unlike Chess)
    const moves = getLegalMoves(board, turn);
    if (moves.length === 0) {
        return turn === Color.RED ? Color.BLACK : Color.RED;
    }
    return null;
  }, []);

  // Update valid moves when selection changes or turn changes
  useEffect(() => {
    if (gameState.selectedPos) {
      const allMoves = getLegalMoves(gameState.board, gameState.turn);
      const movesForPiece = allMoves.filter(m => 
        m.from.row === gameState.selectedPos!.row && 
        m.from.col === gameState.selectedPos!.col
      );
      setValidMoves(movesForPiece);
    } else {
      setValidMoves([]);
    }
  }, [gameState.selectedPos, gameState.board, gameState.turn]);

  // AI Turn Handler
  useEffect(() => {
    if (
      gameMode === 'PvAI' && 
      gameState.turn === aiColor && 
      !gameState.gameOver &&
      !gameState.isAiThinking
    ) {
      const playAiTurn = async () => {
        setGameState(prev => ({ ...prev, isAiThinking: true }));
        
        // Small delay for realism
        await new Promise(r => setTimeout(r, 500));

        const move = await getAiMove(gameState.board, gameState.turn, difficulty);
        
        if (move) {
           // Validate AI Move logic locally to be safe
           const legalMoves = getLegalMoves(gameState.board, gameState.turn);
           const isLegal = legalMoves.some(m => 
             m.from.row === move.from.row && m.from.col === move.from.col &&
             m.to.row === move.to.row && m.to.col === move.to.col
           );

           if (isLegal) {
             executeMove(move);
           } else {
             console.error("AI tried illegal move", move);
             // Fallback: Random legal move
             if (legalMoves.length > 0) {
                const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
                executeMove(randomMove);
             } else {
                 // Resign logic?
                 setGameState(prev => ({...prev, gameOver: true, winner: prev.turn === Color.RED ? Color.BLACK : Color.RED}));
             }
           }
        }
        
        setGameState(prev => ({ ...prev, isAiThinking: false }));
      };
      playAiTurn();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.turn, gameMode, gameState.gameOver, aiColor, difficulty]);


  const executeMove = (move: Move) => {
    setGameState(prev => {
        const newBoard = prev.board.map(row => [...row]);
        const piece = newBoard[move.from.row][move.from.col];
        newBoard[move.to.row][move.to.col] = piece;
        newBoard[move.from.row][move.from.col] = null;

        const nextTurn = prev.turn === Color.RED ? Color.BLACK : Color.RED;
        const winner = checkGameOver(newBoard, nextTurn);

        return {
            ...prev,
            board: newBoard,
            turn: nextTurn,
            selectedPos: null,
            lastMove: move,
            history: [...prev.history, move],
            gameOver: !!winner,
            winner: winner,
        };
    });
  };

  const handleSquareClick = (pos: Position) => {
    if (gameState.gameOver || gameState.isAiThinking) return;
    if (gameMode === 'PvAI' && gameState.turn === aiColor) return;

    const piece = gameState.board[pos.row][pos.col];
    const isMyPiece = piece?.color === gameState.turn;

    // 1. Select my piece
    if (isMyPiece) {
      setGameState(prev => ({ ...prev, selectedPos: pos }));
      return;
    }

    // 2. Move to empty or capture enemy
    if (gameState.selectedPos) {
      // Check validity
      const move = validMoves.find(m => m.to.row === pos.row && m.to.col === pos.col);
      if (move) {
        executeMove(move);
      } else {
        // If clicked empty or invalid enemy, deselect
        setGameState(prev => ({ ...prev, selectedPos: null }));
      }
    }
  };

  const resetGame = () => {
    setGameState({
      board: createInitialBoard(),
      turn: Color.RED,
      selectedPos: null,
      lastMove: null,
      history: [],
      gameOver: false,
      winner: null,
      isAiThinking: false,
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-stone-100 text-stone-800">
      
      <header className="mb-6 text-center">
        <h1 className="text-4xl font-chinese font-bold text-red-900 mb-2 flex items-center justify-center gap-3">
             <span className="text-5xl">象棋</span> Xiangqi
        </h1>
        <p className="text-stone-500">Play against Gemini AI or a Friend</p>
      </header>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* Game Board Container */}
        <div className="relative">
             <Board 
                board={gameState.board}
                onSquareClick={handleSquareClick}
                selectedPos={gameState.selectedPos}
                validMoves={validMoves}
                lastMove={gameState.lastMove}
             />
             
             {/* Game Over Overlay */}
             {gameState.gameOver && (
                 <div className="absolute inset-0 bg-black/50 rounded-lg flex flex-col items-center justify-center text-white z-50 backdrop-blur-sm">
                     <h2 className="text-5xl font-bold mb-4">
                         {gameState.winner === Color.RED ? "Red Wins!" : "Black Wins!"}
                     </h2>
                     <button 
                        onClick={resetGame}
                        className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-full font-bold text-lg transition flex items-center gap-2"
                     >
                        <RotateCcw size={20} /> Play Again
                     </button>
                 </div>
             )}
        </div>

        {/* Controls Panel */}
        <div className="w-full lg:w-80 bg-white p-6 rounded-xl shadow-lg border border-stone-200">
            
            {/* Status Card */}
            <div className={`mb-6 p-4 rounded-lg border-l-4 ${gameState.turn === Color.RED ? 'border-red-600 bg-red-50' : 'border-black bg-stone-100'}`}>
                <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
                    {gameState.turn === Color.RED ? "Red's Turn" : "Black's Turn"}
                    {gameState.isAiThinking && <BrainCircuit className="animate-pulse text-purple-600" size={20} />}
                </h3>
                <p className="text-sm opacity-70">
                    {gameState.isAiThinking ? "Gemini is thinking..." : "Waiting for move..."}
                </p>
            </div>

            {/* Settings */}
            <div className="space-y-6">
                
                <div>
                    <label className="block text-sm font-semibold mb-2">Game Mode</label>
                    <div className="flex bg-stone-100 p-1 rounded-lg">
                        <button 
                            className={`flex-1 py-2 rounded-md text-sm font-medium transition ${gameMode === 'PvAI' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500 hover:text-stone-700'}`}
                            onClick={() => setGameMode('PvAI')}
                        >
                            <span className="flex items-center justify-center gap-2"><BrainCircuit size={16}/> vs AI</span>
                        </button>
                        <button 
                            className={`flex-1 py-2 rounded-md text-sm font-medium transition ${gameMode === 'PvP' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500 hover:text-stone-700'}`}
                            onClick={() => setGameMode('PvP')}
                        >
                            <span className="flex items-center justify-center gap-2"><Users size={16}/> PvP</span>
                        </button>
                    </div>
                </div>

                {gameMode === 'PvAI' && (
                    <div>
                        <label className="block text-sm font-semibold mb-2">Difficulty (Gemini)</label>
                        <div className="grid grid-cols-3 gap-2">
                            {(['easy', 'medium', 'hard'] as const).map(d => (
                                <button
                                    key={d}
                                    onClick={() => setDifficulty(d)}
                                    className={`py-1 px-2 text-xs uppercase font-bold rounded border ${difficulty === d ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'}`}
                                >
                                    {d}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                
                <hr />

                <div className="flex flex-col gap-3">
                    <button 
                        onClick={resetGame}
                        className="w-full py-3 bg-stone-800 hover:bg-stone-900 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition"
                    >
                        <RotateCcw size={18} /> New Game
                    </button>
                    
                    <div className="text-xs text-stone-400 text-center mt-2">
                        <p>AI powered by Google Gemini 2.5 Flash</p>
                    </div>
                </div>
            </div>
            
             {/* Rules Hint */}
            <div className="mt-8 p-4 bg-amber-50 rounded-lg border border-amber-100 text-amber-900 text-sm">
                <div className="flex items-center gap-2 font-bold mb-2">
                    <AlertTriangle size={16} /> Quick Tips
                </div>
                <ul className="list-disc list-inside space-y-1 opacity-80">
                    <li>Generals (King) can't face each other directly.</li>
                    <li>Elephants can't cross the river.</li>
                    <li>Cannons need a screen to capture.</li>
                </ul>
            </div>

        </div>
      </div>
    </div>
  );
};

export default App;