
import React from 'react';
import { GameState, Settings } from '../types';

interface GameUIProps {
  gameState: GameState;
  hud: { score: number; bestScore: number; lives: number; shield: number };
  settings: Settings;
  onAction: (action: string) => void;
  onJoystickMove: (x: number, y: number, isTarget?: boolean) => void;
  onJoystickEnd: () => void;
  onShootToggle: (active: boolean) => void;
}

const SIGIL_IMG = 'https://i.ibb.co.com/XkCCS678/Picsart-26-01-12-16-48-17-683.png';

const GameUI: React.FC<GameUIProps> = ({ 
  gameState, 
  hud, 
  onAction, 
  onJoystickMove, 
  onJoystickEnd
}) => {
  const handleJoystickTouch = (e: React.TouchEvent) => {
    if (gameState !== GameState.PLAYING) return;
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    
    // Calculate percentage position within the active game area
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;
    
    const pctX = touchX / rect.width;
    const pctY = touchY / rect.height;
    
    // Pass as target coordinates (normalized 0-1)
    onJoystickMove(pctX, pctY, true);
  };

  return (
    <div className="fixed inset-0 pointer-events-none select-none flex flex-col justify-between p-6">
      {/* HUD - Must be on top of the touch layer to receive clicks */}
      <div className="relative z-20 flex justify-between items-start pt-safe">
        <div className="flex items-center gap-4 pointer-events-auto">
          {/* Pause Button */}
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAction('pause');
            }}
            className="w-12 h-12 bg-black/40 border border-[#39FF14]/50 text-[#39FF14] flex items-center justify-center rounded-full backdrop-blur-md active:scale-90 transition-transform"
          >
            <span className="text-xl font-bold tracking-tight">II</span>
          </button>
          
          {/* Numerical Score Only */}
          <div className="flex flex-col">
            <div className="text-white text-3xl font-bold font-occult drop-shadow-md leading-none">
              {hud.score}
            </div>
            <div className="text-neutral-500 text-[10px] tracking-[0.2em] mt-1 font-bold">
              BEST: {hud.bestScore}
            </div>
          </div>
        </div>

        <div className="text-right flex flex-col items-end">
          <div className="flex gap-2 justify-end mb-2">
            {[...Array(3)].map((_, i) => (
              <img 
                key={i} 
                src={SIGIL_IMG} 
                className={`w-8 h-8 object-contain transition-all duration-300 ${i < hud.lives ? 'opacity-100 scale-100 brightness-125' : 'opacity-20 scale-90 grayscale'}`}
                alt="Life"
              />
            ))}
          </div>
          {hud.shield > 0 && (
            <div className="w-24 h-2 bg-black border border-neutral-700 overflow-hidden rounded-full">
              <div className="h-full bg-[#39FF14] shadow-[0_0_10px_#39FF14]" style={{ width: `${hud.shield}%` }} />
            </div>
          )}
        </div>
      </div>

      {/* Touch Input Layer - Sits behind HUD (z-10) but covers the rest of the screen */}
      {gameState === GameState.PLAYING && (
        <div 
          className="absolute inset-0 pointer-events-auto z-10"
          onTouchMove={handleJoystickTouch}
          onTouchStart={handleJoystickTouch}
          onTouchEnd={onJoystickEnd}
          onTouchCancel={onJoystickEnd}
        />
      )}

      {/* Modals - z-50 to ensure they are on the very top */}
      {(gameState === GameState.PAUSED || gameState === GameState.GAMEOVER) && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-6 pointer-events-auto backdrop-blur-sm z-50">
          <div className="max-w-xs w-full border-2 border-[#39FF14] p-10 bg-black shadow-[0_0_50px_rgba(57,255,20,0.2)] flex flex-col items-center text-center">
            {gameState === GameState.PAUSED ? (
              <>
                <h2 className="font-occult text-4xl mb-10 text-[#39FF14] tracking-wider">RITE HALTED</h2>
                <button 
                  onClick={() => onAction('resume')}
                  className="w-full py-4 border-2 border-white text-white mb-4 font-bold tracking-widest hover:bg-white hover:text-black transition-all"
                >
                  RESUME
                </button>
                <button 
                  onClick={() => onAction('restart')}
                  className="w-full py-4 border-2 border-[#39FF14] text-[#39FF14] mb-4 font-bold tracking-widest"
                >
                  RESTART
                </button>
                <button 
                  onClick={() => onAction('home')}
                  className="w-full py-4 border border-neutral-700 text-neutral-500 font-bold tracking-widest"
                >
                  QUIT
                </button>
              </>
            ) : (
              <>
                <img src={SIGIL_IMG} className="w-20 h-20 mb-6 brightness-50 grayscale" alt="Rite Failed" />
                <h2 className="font-occult text-4xl mb-4 text-[#39FF14]">RITE FAILED</h2>
                <p className="text-white text-2xl mb-1 font-black">SCORE: {hud.score}</p>
                <p className="text-neutral-500 text-xs mb-10 tracking-[0.2em]">RECORD: {hud.bestScore}</p>
                <button 
                  onClick={() => onAction('restart')}
                  className="w-full py-5 bg-[#39FF14] text-black font-black tracking-widest mb-4 transform hover:scale-105 transition-transform"
                >
                  RETRY THE RITE
                </button>
                <button 
                  onClick={() => onAction('home')}
                  className="w-full py-4 border border-white text-white font-bold tracking-widest"
                >
                  HOME
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GameUI;
