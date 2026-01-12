
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  GameState, 
  Settings, 
  ControlMode, 
  Difficulty 
} from './types';
import { STORAGE_KEYS, CANVAS_VIRTUAL_WIDTH, CANVAS_VIRTUAL_HEIGHT } from './constants';
import { GameEngine } from './services/engine';
import GameUI from './components/GameUI';

const SIGIL_IMG = 'https://i.ibb.co.com/XkCCS678/Picsart-26-01-12-16-48-17-683.png';
const PROFILE_IMG = 'https://pbs.twimg.com/profile_images/1801955577763094529/5qtIvl5X_400x400.jpg';

const SigilBackground: React.FC = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const grid = Array.from({ length: 100 }); // Adjust based on screen density

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden bg-[#050505] opacity-40">
      <div className="flex flex-wrap gap-12 p-8 justify-center items-center w-[120%] h-[120%] -translate-x-[10%] -translate-y-[10%]">
        {grid.map((_, i) => (
          <SigilIcon key={i} mouseX={mousePos.x} mouseY={mousePos.y} />
        ))}
      </div>
    </div>
  );
};

const SigilIcon: React.FC<{ mouseX: number; mouseY: number }> = ({ mouseX, mouseY }) => {
  const iconRef = useRef<HTMLImageElement>(null);
  const [transform, setTransform] = useState({ scale: 1, opacity: 0.1, glow: 0 });

  useEffect(() => {
    if (!iconRef.current) return;
    const rect = iconRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const dist = Math.sqrt(Math.pow(mouseX - centerX, 2) + Math.pow(mouseY - centerY, 2));
    const maxDist = 300;
    
    if (dist < maxDist) {
      const factor = 1 - dist / maxDist;
      setTransform({
        scale: 1 + factor * 0.4,
        opacity: 0.1 + factor * 0.6,
        glow: factor * 20
      });
    } else {
      setTransform({ scale: 1, opacity: 0.1, glow: 0 });
    }
  }, [mouseX, mouseY]);

  return (
    <img
      ref={iconRef}
      src={SIGIL_IMG}
      className="w-12 h-12 grayscale transition-transform duration-300 ease-out"
      style={{
        transform: `scale(${transform.scale})`,
        opacity: transform.opacity,
        filter: transform.glow > 0 ? `drop-shadow(0 0 ${transform.glow}px #39FF14)` : 'none',
      }}
    />
  );
};

const App: React.FC = () => {
  const [view, setView] = useState<'landing' | 'play' | 'settings'>('landing');
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const bestScoreRef = useRef(Number(localStorage.getItem(STORAGE_KEYS.BEST_SCORE)) || 0);
  const [displayBestScore, setDisplayBestScore] = useState(Math.floor(bestScoreRef.current / 10));
  
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return saved ? JSON.parse(saved) : {
      controlMode: ControlMode.JOYSTICK,
      sound: true,
      sfx: true,
      screenShake: true,
      reducedEffects: false,
      difficulty: Difficulty.MID,
      buttonSize: 'large'
    };
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const requestRef = useRef<number>(0);
  const [hudData, setHudData] = useState({ score: 0, bestScore: 0, lives: 3, shield: 0 });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [settings]);

  const animate = useCallback((time: number) => {
    if (engineRef.current && engineRef.current.gameState !== GameState.PAUSED) {
      engineRef.current.update(time);
      const data = engineRef.current.getHUDData();
      setHudData(prev => (prev.score !== data.score || prev.lives !== data.lives || prev.shield !== data.shield) ? data : prev);
      
      if (engineRef.current.gameState === GameState.GAMEOVER && gameState !== GameState.GAMEOVER) {
        setGameState(GameState.GAMEOVER);
      }

      const rawScore = engineRef.current.score;
      if (rawScore > bestScoreRef.current) {
        bestScoreRef.current = rawScore;
        localStorage.setItem(STORAGE_KEYS.BEST_SCORE, rawScore.toString());
        setDisplayBestScore(Math.floor(rawScore / 10));
      }
    }
    requestRef.current = requestAnimationFrame(animate);
  }, [gameState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!engineRef.current) return;
      const key = e.key.toLowerCase();
      if (key === 'arrowup' || key === 'w') engineRef.current.keyboard.up = true;
      if (key === 'arrowdown' || key === 's') engineRef.current.keyboard.down = true;
      if (key === 'arrowleft' || key === 'a') engineRef.current.keyboard.left = true;
      if (key === 'arrowright' || key === 'd') engineRef.current.keyboard.right = true;
      if (key === ' ') engineRef.current.keyboard.space = true;
      if (key === 'p' || key === 'escape') handleAction('pause');
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!engineRef.current) return;
      const key = e.key.toLowerCase();
      if (key === 'arrowup' || key === 'w') engineRef.current.keyboard.up = false;
      if (key === 'arrowdown' || key === 's') engineRef.current.keyboard.down = false;
      if (key === 'arrowleft' || key === 'a') engineRef.current.keyboard.left = false;
      if (key === 'arrowright' || key === 'd') engineRef.current.keyboard.right = false;
      if (key === ' ') engineRef.current.keyboard.space = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [view]);

  useEffect(() => {
    if (view === 'play' && canvasRef.current) {
      const updateSize = () => {
        const dpr = window.devicePixelRatio || 1;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const ratio = CANVAS_VIRTUAL_WIDTH / CANVAS_VIRTUAL_HEIGHT;
        let targetWidth = windowWidth;
        let targetHeight = windowWidth / ratio;
        if (targetHeight > windowHeight) {
          targetHeight = windowHeight;
          targetWidth = windowHeight * ratio;
        }
        canvasRef.current!.width = targetWidth * dpr;
        canvasRef.current!.height = targetHeight * dpr;
        canvasRef.current!.style.width = `${targetWidth}px`;
        canvasRef.current!.style.height = `${targetHeight}px`;
      };
      updateSize();
      window.addEventListener('resize', updateSize);
      engineRef.current = new GameEngine(canvasRef.current, settings, bestScoreRef.current);
      engineRef.current.gameState = GameState.PLAYING;
      setGameState(GameState.PLAYING);
      requestRef.current = requestAnimationFrame(animate);
      return () => {
        window.removeEventListener('resize', updateSize);
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        engineRef.current = null;
      };
    }
  }, [view, settings]);

  const handleAction = (action: string) => {
    if (!engineRef.current) return;
    if (action === 'pause') {
      const newState = engineRef.current.gameState === GameState.PAUSED ? GameState.PLAYING : GameState.PAUSED;
      engineRef.current.gameState = newState;
      setGameState(newState);
    } else if (action === 'resume') {
      engineRef.current.gameState = GameState.PLAYING;
      setGameState(GameState.PLAYING);
    } else if (action === 'restart') {
      engineRef.current.restart();
      setGameState(GameState.PLAYING);
    } else if (action === 'home') {
      setView('landing');
      setGameState(GameState.START);
    }
  };

  if (view === 'landing') {
    return (
      <div className="relative h-screen w-full bg-black overflow-hidden flex flex-col items-center justify-between p-8">
        <SigilBackground />

        {/* Header/Score Space */}
        <div className="z-10 mt-12">
          <p className="text-neutral-600 text-[10px] tracking-widest uppercase font-bold text-center">Best Ritual: {displayBestScore}</p>
        </div>

        {/* Main Menu */}
        <div className="z-10 text-center">
          <h1 className="text-6xl md:text-8xl font-occult font-black text-white mb-2 drop-shadow-[0_0_25px_rgba(57,255,20,0.6)] tracking-tighter">VOID RITE</h1>
          <p className="text-[#39FF14] tracking-[0.4em] uppercase text-xs mb-16 font-black">Sacrifice the Core</p>
          <div className="space-y-4 max-w-xs mx-auto">
            <button onClick={() => setView('play')} className="w-full py-6 bg-[#39FF14] text-black font-black text-2xl hover:scale-105 active:scale-95 transition-all font-occult shadow-[0_0_20px_rgba(57,255,20,0.4)]">BEGIN RITE</button>
            <button onClick={() => setView('settings')} className="w-full py-4 border border-white text-white font-bold tracking-widest hover:bg-white hover:text-black transition-all">SETTINGS</button>
          </div>
        </div>

        {/* Footer */}
        <div className="z-10 mb-6 flex flex-col items-center gap-4">
          <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-6 py-3 border border-[#39FF14]/20 rounded-full group transition-all hover:border-[#39FF14]/50 hover:shadow-[0_0_15px_rgba(57,255,20,0.15)]">
            <img 
              src={PROFILE_IMG} 
              className="w-8 h-8 rounded-full border border-[#39FF14]/30 grayscale group-hover:grayscale-0 transition-all" 
              alt="ali" 
            />
            <span className="text-neutral-500 text-[10px] tracking-[0.2em] font-bold uppercase">
              EVOKED FROM THE VOID BY{' '}
              <a 
                href="https://x.com/aliorbz" 
                target="_blank" 
                rel="noopener noreferrer"
                className="pointer-events-auto text-[#39FF14] hover:brightness-125 hover:drop-shadow-[0_0_8px_#39FF14] transition-all relative after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[1px] after:bg-[#39FF14] hover:after:w-full after:transition-all"
              >
                aliorbz
              </a>
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'settings') {
    return (
      <div className="h-screen w-full bg-black p-8 flex flex-col text-white">
        <h1 className="font-occult text-4xl mb-12 text-[#39FF14] text-center tracking-widest">MODS & RITES</h1>
        <div className="flex-1 space-y-12 overflow-y-auto max-w-md mx-auto w-full px-4 scrollbar-hide">
          <section>
            <h3 className="text-[#39FF14] text-xs font-black tracking-[0.3em] mb-6 border-l-2 border-[#39FF14] pl-3">DIFFICULTY MODS</h3>
            <div className="grid grid-cols-3 gap-3">
              {[Difficulty.EASY, Difficulty.MID, Difficulty.HARD].map(d => (
                <button 
                  key={d}
                  onClick={() => setSettings(s => ({...s, difficulty: d}))}
                  className={`py-4 text-[11px] font-black tracking-widest border-2 transition-all ${settings.difficulty === d ? 'border-[#39FF14] text-[#39FF14] bg-[#39FF14]/5' : 'border-neutral-900 text-neutral-600'}`}
                >
                  {d}
                </button>
              ))}
            </div>
            <div className="mt-4 p-3 bg-neutral-950 border border-neutral-900">
               <p className="text-[10px] text-neutral-400 uppercase tracking-tighter leading-relaxed">
                {settings.difficulty === Difficulty.EASY && "Vessels shatter easily. The Grimoire is generous."}
                {settings.difficulty === Difficulty.MID && "A balanced path through the drifting void. 1.3x Intensity."}
                {settings.difficulty === Difficulty.HARD && "The Archons demand perfection. Maximum ritual intensity."}
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-[#39FF14] text-xs font-black tracking-[0.3em] mb-6 border-l-2 border-[#39FF14] pl-3">CONTROL INTERFACE</h3>
            <div className="flex gap-3">
              <button onClick={() => setSettings(s => ({...s, controlMode: ControlMode.JOYSTICK}))} className={`flex-1 py-4 text-xs font-bold border-2 transition-all ${settings.controlMode === ControlMode.JOYSTICK ? 'border-[#39FF14] text-[#39FF14]' : 'border-neutral-900 text-neutral-600'}`}>JOYSTICK</button>
              <button onClick={() => setSettings(s => ({...s, controlMode: ControlMode.DRAG}))} className={`flex-1 py-4 text-xs font-bold border-2 transition-all ${settings.controlMode === ControlMode.DRAG ? 'border-[#39FF14] text-[#39FF14]' : 'border-neutral-900 text-neutral-600'}`}>DRAG</button>
            </div>
          </section>

          <section>
            <h3 className="text-[#39FF14] text-xs font-black tracking-[0.3em] mb-6 border-l-2 border-[#39FF14] pl-3">VISUAL ARTIFACTS</h3>
            <div className="flex items-center justify-between py-4">
              <span className="text-xs font-black tracking-[0.2em] uppercase">SCREEN SHAKE</span>
              <button onClick={() => setSettings(s => ({...s, screenShake: !s.screenShake}))} className={`w-14 h-7 rounded-full relative transition-all duration-300 ${settings.screenShake ? 'bg-[#39FF14]' : 'bg-neutral-800'}`}>
                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-lg transition-all duration-300 ${settings.screenShake ? 'left-8' : 'left-1'}`} />
              </button>
            </div>
          </section>
        </div>
        <button onClick={() => setView('landing')} className="mt-12 max-w-md mx-auto w-full py-6 bg-white text-black font-black font-occult text-xl active:scale-95 transition-all shadow-xl tracking-widest">SAVE RITE</button>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full bg-[#050505] touch-none overflow-hidden flex items-center justify-center">
      <div className="relative bg-black overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)]" style={{ width: 'min(100vw, calc(100vh * 0.5625))', height: 'min(100vh, calc(100vw * 1.777))' }}>
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
        <GameUI 
          gameState={gameState} 
          hud={{ ...hudData, bestScore: displayBestScore }} 
          settings={settings}
          onAction={handleAction}
          onJoystickMove={(x, y) => { if (engineRef.current) engineRef.current.joystick = { active: true, x, y }; }}
          onJoystickEnd={() => { if (engineRef.current) { engineRef.current.joystick.active = false; engineRef.current.joystick.x = 0; engineRef.current.joystick.y = 0; } }}
          onShootToggle={(active) => { if (engineRef.current) engineRef.current.shooting = active; }}
        />
      </div>
    </div>
  );
};

export default App;
