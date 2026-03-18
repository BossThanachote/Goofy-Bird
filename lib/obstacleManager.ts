export type ObstacleType = 'pipe-top' | 'pipe-bottom' | 'cloud' | 'enemy-bird' | 'stalactite' | 'frog' | 'pendulum' | 'rocket';

export interface Obstacle {
  id: number;
  type: ObstacleType;
  x: number;
  y: number;
  width: number;
  height: number;
  speedModX: number;
  speedModY: number;
  baseY?: number;
  scale: number;
}


export const DIFFICULTY_CONFIG = {
  easy: { speed: 5, spawnMin: 80, spawnMax: 130 },
  normal: { speed: 7, spawnMin: 50, spawnMax: 90 },
  hard: { speed: 10, spawnMin: 30, spawnMax: 60 }
};

// นอกนั้นโค้ดฟังก์ชัน generateObstacle ปล่อยไว้เหมือนเดิมเป๊ะๆ เลยครับ

export const generateObstacle = (
  idCounter: number, 
  configTypes: string[], // ✅ รับ Array ที่ผ่านการกรองมาแล้ว
  windowWidth: number, 
  windowHeight: number, 
  scale: number, 
  playerY: number
): Obstacle => {
  const randomType = configTypes[Math.floor(Math.random() * configTypes.length)] as ObstacleType;
  
  let obs: Obstacle = { 
    id: idCounter, type: randomType, 
    x: windowWidth, y: 0, 
    width: 80 * scale, height: 0, 
    speedModX: 0, speedModY: 0, scale: scale 
  };

  if (randomType === 'pipe-top') {
    obs.height = Math.floor(Math.random() * (windowHeight / 2)) + (50 * scale);
    obs.y = 0;
  } else if (randomType === 'pipe-bottom') {
    obs.height = Math.floor(Math.random() * (windowHeight / 2)) + (50 * scale);
    obs.y = windowHeight - obs.height;
  } else if (randomType === 'cloud') {
    obs.width = 120 * scale; obs.height = 60 * scale;
    obs.y = Math.floor(Math.random() * (windowHeight - (200 * scale))) + (50 * scale);
    obs.speedModX = -2;
  } else if (randomType === 'enemy-bird') {
    obs.width = 60 * scale; obs.height = 50 * scale;
    obs.y = Math.floor(Math.random() * (windowHeight - (150 * scale))) + (50 * scale);
    obs.speedModX = 4;
  } else if (randomType === 'stalactite') {
    obs.width = 40 * scale; obs.height = 100 * scale;
    obs.y = -20;
    obs.speedModY = 3;
  } else if (randomType === 'frog') {
    obs.width = 50 * scale; obs.height = 50 * scale;
    obs.baseY = windowHeight - (80 * scale);
    obs.y = obs.baseY;
    obs.speedModX = -1;
 } else if (randomType === 'pendulum') {
    obs.width = 70 * scale; 
    obs.height = 70 * scale;
    // ✅ สุ่มจุดกึ่งกลาง (baseY) ให้อยู่ระหว่าง 20% ถึง 80% ของหน้าจอ
    // มันจะไม่เกิดกลางจอเป๊ะๆ อีกต่อไป จะมีห้อยมาจากข้างบนบ้าง โผล่มาจากข้างล่างบ้าง
    obs.baseY = (windowHeight * 0.2) + (Math.random() * (windowHeight * 0.6));
    
    obs.y = obs.baseY;
    obs.speedModX = 0;
  } else if (randomType === 'rocket') {
    obs.width = 90 * scale; obs.height = 40 * scale;
    obs.y = playerY;
    obs.speedModX = 8;
  }
  
  return obs;
}