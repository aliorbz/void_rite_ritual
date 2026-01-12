
import React from 'react';
import { GameState, Settings, ControlMode } from '../types';

interface GameUIProps {
  gameState: GameState;
  hud: { score: number; bestScore: number; lives: number; shield: number };
  settings: Settings;
  onAction: (action: string) => void;
  onJoystickMove: (x: number, y: number) => void;
  onJoystickEnd: () => void;
  onShootToggle: (active: boolean) => void;
}

const SIGIL_IMG = 'https://i.ibb.co.com/XkCCS678/Picsart-26-01-12-16-48-17-683.png';

const GameUI: React.FC<GameUIProps> = ({ 
  gameState, 
  hud, 
  settings, 
  onAction, 
  onJoystickMove, 
  onJoystickEnd,
  onShootToggle 
}) => {
  const handleJoystickTouch = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = touch.clientX - centerX;
    const dy = touch.clientY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = rect.width / 2;
    
    const nx = dx / maxDist;
    const ny = dy / maxDist;
    
    const finalX = dist > maxDist ? nx * (maxDist / dist) : nx;
    const finalY = dist > maxDist ? ny * (maxDist / dist) : ny;
    
    onJoystickMove(finalX, finalY);
  };

  return (
    <div className="fixed inset-0 pointer-events-none select-none flex flex-col justify-between p-6">
      {/* Top HUD */}
      <div className="flex justify-between items-start pt-safe">
        <div>
          <div className="text-white text-3xl font-bold font-occult drop-shadow-md">SCORE: {hud.score}</div>
          <div className="text-neutral-500 text-xs tracking-[0.2em] mt-1 font-bold">BEST: {hud.bestScore}</div>
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

      {/* Pause Button */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 pointer-events-auto">
        <button 
          onClick={() => onAction('pause')}
          className="w-12 h-12 bg-black/40 border border-[#39FF14]/50 text-[#39FF14] flex items-center justify-center rounded-full backdrop-blur-md active:scale-90 transition-transform"
        >
          <span className="text-xs font-bold">II</span>
        </button>
      </div>

      {/* Controls */}
      {gameState === GameState.PLAYING && (
        <div className="flex justify-between items-end pb-safe pointer-events-none">
          {/* Virtual Joystick */}
          <div 
            className="w-36 h-36 rounded-full border-2 border-[#39FF14]/20 pointer-events-auto relative bg-black/20 backdrop-blur-[2px] flex items-center justify-center"
            onTouchMove={handleJoystickTouch}
            onTouchEnd={onJoystickEnd}
          >
            <div className="w-14 h-14 rounded-full border-2 border-[#39FF14] shadow-[0_0_15px_#39FF14]" />
          </div>

          {/* Shoot Button */}
          {settings.controlMode === ControlMode.JOYSTICK && (
            <div 
              className="w-28 h-28 rounded-full border-4 border-[#39FF14] pointer-events-auto flex items-center justify-center bg-black/40 backdrop-blur-sm active:bg-[#39FF14]/30 active:scale-95 transition-all shadow-lg"
              onTouchStart={() => onShootToggle(true)}
              onTouchEnd={() => onShootToggle(false)}
            >
              <div className="text-[#39FF14] text-5xl font-occult drop-shadow-[0_0_10px_#39FF14]">❂</div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {(gameState === GameState.PAUSED || gameState === GameState.GAMEOVER) && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-6 pointer-events-auto backdrop-blur-sm">
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
