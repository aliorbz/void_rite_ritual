
export enum GameState {
  START = 'START',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAMEOVER = 'GAMEOVER'
}

export enum ControlMode {
  JOYSTICK = 'JOYSTICK',
  DRAG = 'DRAG'
}

export enum Difficulty {
  EASY = 'EASY',
  MID = 'MID',
  HARD = 'HARD'
}

export interface Settings {
  controlMode: ControlMode;
  sound: boolean;
  sfx: boolean;
  screenShake: boolean;
  reducedEffects: boolean;
  difficulty: Difficulty;
  buttonSize: 'small' | 'medium' | 'large';
}

export interface Point {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  active: boolean;
  health: number;
  maxHealth: number;
}

export interface Bullet extends Entity {
  owner: 'player' | 'enemy';
  damage: number;
  homing?: boolean;
}

export interface Enemy extends Entity {
  type: 'drone' | 'skimmer' | 'guardian' | 'boss';
  scoreValue: number;
  lastShot: number;
  fireRate: number;
  phase?: number;
}

export interface PowerUp extends Entity {
  type: 'double' | 'triple' | 'shield' | 'rate' | 'repair';
}

export interface Particle extends Entity {
  life: number;
  maxLife: number;
  color: string;
  size: number;
}
