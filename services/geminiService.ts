import { GoogleGenAI, Type } from "@google/genai";
import { boardToFen } from "../utils/xiangqi";
import { BoardState, Color, Move } from "../types";

// Note: In a real environment, never expose keys in client-side code if not behind a proxy or secured env.
// For this demo, we assume the environment variable is injected by the runner.
const apiKey = process.env.API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

const MODEL_NAME = "gemini-2.5-flash"; // Fast and capable for this

export const getAiMove = async (
  board: BoardState,
  turn: Color,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): Promise<Move | null> => {
  const fen = boardToFen(board, turn);
  
  const systemInstruction = `
    You are a Xiangqi (Chinese Chess) engine. 
    Your goal is to play a move for the color: ${turn === Color.RED ? 'RED (uppercase pieces)' : 'BLACK (lowercase pieces)'}.
    The board is provided in FEN format.
    
    Difficulty Level: ${difficulty}. 
    - If easy, make decent but non-optimal moves.
    - If medium, play standard solid moves.
    - If hard, play the best possible move you can find.

    Output STRICT JSON format: { "from": { "row": number, "col": number }, "to": { "row": number, "col": number } }.
    Row indices are 0-9 (0 is top, 9 is bottom). Col indices are 0-8 (0 is left).
    ENSURE THE MOVE IS LEGAL.
  `;

  const prompt = `Current FEN: ${fen}\nIt is ${turn}'s turn. What is your move?`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            from: {
              type: Type.OBJECT,
              properties: {
                row: { type: Type.INTEGER },
                col: { type: Type.INTEGER }
              }
            },
            to: {
              type: Type.OBJECT,
              properties: {
                row: { type: Type.INTEGER },
                col: { type: Type.INTEGER }
              }
            }
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) return null;

    const moveData = JSON.parse(jsonText) as Move;
    return moveData;

  } catch (error) {
    console.error("Gemini AI Error:", error);
    return null;
  }
};
