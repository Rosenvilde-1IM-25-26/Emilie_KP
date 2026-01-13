/* Pastel Gadgets JS: drawing pad, snake, cursor effects, theme switcher */

// Theme + cursor selectors
const themeSelect = document.getElementById('theme-select');
const cursorSelect = document.getElementById('cursor-select');
const body = document.body;

themeSelect.addEventListener('change', e => body.dataset.theme = e.target.value);

// Cursor effects
const layer = document.getElementById('cursor-layer');
let cursorMode = 'none';
let haloEl = null;
let cometEl = null;
const cursorColorInput = document.getElementById('cursor-color');
let cursorColor = cursorColorInput ? cursorColorInput.value : getComputedStyle(document.documentElement).getPropertyValue('--cursor-color') || '#ffb6c1';
if (cursorColorInput) {
  cursorColorInput.addEventListener('input', e => {
    cursorColor = e.target.value;
    document.documentElement.style.setProperty('--cursor-color', cursorColor);
    if (haloEl) haloEl.style.borderColor = cursorColor;
  });
}

cursorSelect.addEventListener('change', e => {
  cursorMode = e.target.value;
  // cleanup
  if (haloEl) { haloEl.remove(); haloEl = null; }
  if (cometEl) { cometEl.remove(); cometEl = null; }
  // create elements as needed
  if (cursorMode === 'halo') {
    haloEl = document.createElement('div');
    haloEl.className = 'cursor-halo';
    haloEl.style.borderColor = cursorColor;
    document.body.appendChild(haloEl);
  }
  if (cursorMode === 'comet') {
    cometEl = document.createElement('div');
    cometEl.className = 'cursor-comet';
    cometEl.style.background = `linear-gradient(90deg, rgba(255,255,255,0.3), ${cursorColor})`;
    layer.appendChild(cometEl);
  }
});

window.addEventListener('mousemove', e => {
  const x = e.clientX, y = e.clientY;
  if (cursorMode === 'sparkle') {
    const s = document.createElement('div');
    s.className = 'cursor-sparkle';
    s.style.left = x + 'px'; s.style.top = y + 'px';
    // color options: vary brightness of cursorColor
    s.style.background = cursorColor;
    layer.appendChild(s);
    setTimeout(()=>s.remove(),700);
  } else if (cursorMode === 'halo' && haloEl) {
    haloEl.style.left = x + 'px'; haloEl.style.top = y + 'px';
    haloEl.style.opacity = '0.98';
  } else if (cursorMode === 'trail') {
    const t = document.createElement('div');
    t.className = 'cursor-trail';
    t.style.left = x + 'px'; t.style.top = y + 'px';
    t.style.background = cursorColor;
    layer.appendChild(t);
    setTimeout(()=>t.remove(),900);
  } else if (cursorMode === 'comet' && cometEl) {
    cometEl.style.left = (x+8) + 'px';
    cometEl.style.top = y + 'px';
    // create small trailing bits too
    const tail = document.createElement('div');
    tail.className = 'cursor-trail';
    tail.style.left = x + 'px'; tail.style.top = y + 'px';
    tail.style.background = cursorColor;
    layer.appendChild(tail);
    setTimeout(()=>tail.remove(),600);
  } else if (cursorMode === 'confetti') {
    for (let i=0;i<3;i++){
      const c = document.createElement('div');
      c.className = 'confetti-piece';
      c.style.left = (x + (Math.random()*30-15)) + 'px';
      c.style.top = (y + (Math.random()*10-10)) + 'px';
      const cols = [cursorColor, '#ffd6e0','#fff0f5','#ffe9ff','#fff3b0'];
      c.style.background = cols[(Math.random()*cols.length)|0];
      c.style.transform = `rotate(${(Math.random()*360)|0}deg)`;
      layer.appendChild(c);
      setTimeout(()=>c.remove(),1200);
    }
  }
});

// Drawing pad
const dCanvas = document.getElementById('draw-canvas');
const dCtx = dCanvas.getContext('2d');
const colorPicker = document.getElementById('draw-color');
const sizeRange = document.getElementById('draw-size');
const clearBtn = document.getElementById('clear-draw');
const saveBtn = document.getElementById('save-draw');
let drawing = false, last = null;

function resizeDraw() {
  const rect = dCanvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  dCanvas.width = Math.floor(rect.width * scale);
  dCanvas.height = Math.floor(rect.height * scale);
  dCtx.scale(scale, scale);
  dCtx.lineCap = 'round';
}
window.addEventListener('resize', resizeDraw);
resizeDraw();

dCanvas.addEventListener('pointerdown', e => { drawing = true; last = {x:e.offsetX, y:e.offsetY}; });
dCanvas.addEventListener('pointerup', () => { drawing=false; last=null; });
dCanvas.addEventListener('pointerout', () => { drawing=false; last=null; });
dCanvas.addEventListener('pointermove', e => {
  if (!drawing) return;
  const x = e.offsetX, y = e.offsetY;
  dCtx.strokeStyle = colorPicker.value;
  dCtx.lineWidth = sizeRange.value;
  if (last) {
    dCtx.beginPath(); dCtx.moveTo(last.x,last.y); dCtx.lineTo(x,y); dCtx.stroke();
  }
  last = {x,y};
});

clearBtn.addEventListener('click', ()=>{
  dCtx.clearRect(0,0,dCanvas.width,dCanvas.height);
});

saveBtn.addEventListener('click', ()=>{
  const link = document.createElement('a');
  link.download = 'drawing.png';
  link.href = dCanvas.toDataURL('image/png');
  link.click();
});

// Simple Snake
const sCanvas = document.getElementById('snake-canvas');
const sCtx = sCanvas.getContext('2d');
const startBtn = document.getElementById('start-snake');
const pauseBtn = document.getElementById('pause-snake');
const resetBtn = document.getElementById('reset-snake');
const speedRange = document.getElementById('snake-speed');

let snake = [{x:8,y:8}];
let dir = {x:0,y:0};
let food = null;
let running = false; let timer = null;
const tile = 16, cols = 20, rows = 20;

function placeFood(){
  food = {x: (Math.random()*cols)|0, y: (Math.random()*rows)|0};
}
function resetSnake(){ snake = [{x:8,y:8}]; dir={x:0,y:0}; placeFood(); drawSnake(); }

function step(){
  const head = {x: snake[0].x + dir.x, y: snake[0].y + dir.y};
  // wrap around
  head.x = (head.x + cols) % cols; head.y = (head.y + rows) % rows;
  // hit self?
  if (snake.some(s=>s.x===head.x && s.y===head.y)) { running=false; clearInterval(timer); alert('Game over!'); return; }
  snake.unshift(head);
  if (food && head.x===food.x && head.y===food.y) { placeFood(); } else { snake.pop(); }
  drawSnake();
}

function drawSnake(){
  sCtx.clearRect(0,0,sCanvas.width,sCanvas.height);
  sCtx.fillStyle = '#fff';
  // draw food
  if (food){ sCtx.fillStyle = getComputedStyle(document.body).getPropertyValue('--accent-strong').trim()||'#ff7a9a'; sCtx.fillRect(food.x*tile+2,food.y*tile+2,tile-4,tile-4); }
  // draw snake
  sCtx.fillStyle = '#323232';
  snake.forEach((s,i)=>{
    sCtx.fillStyle = i===0 ? (getComputedStyle(document.body).getPropertyValue('--accent-strong').trim()||'#ff7a9a') : '#333';
    sCtx.fillRect(s.x*tile+1, s.y*tile+1, tile-2, tile-2);
  });
}

startBtn.addEventListener('click', ()=>{
  if (running) return; running = true; clearInterval(timer);
  timer = setInterval(step, 200 - speedRange.value*12);
});
pauseBtn.addEventListener('click', ()=>{ running=false; clearInterval(timer); });
resetBtn.addEventListener('click', ()=>{ running=false; clearInterval(timer); resetSnake(); });
speedRange.addEventListener('input', ()=>{ if (running){ clearInterval(timer); timer = setInterval(step, 200 - speedRange.value*12); } });

window.addEventListener('keydown', e=>{
  const k = e.key;
  if (k === 'ArrowUp' || k === 'w') dir = {x:0,y:-1};
  if (k === 'ArrowDown' || k === 's') dir = {x:0,y:1};
  if (k === 'ArrowLeft' || k === 'a') dir = {x:-1,y:0};
  if (k === 'ArrowRight' || k === 'd') dir = {x:1,y:0};
});

// initialize
resetSnake();

// Emoji Combiner
const emojiGen = document.getElementById('emoji-gen');
const emojiDisplay = document.getElementById('emoji-display');
const emojiCopy = document.getElementById('emoji-copy');
const emojiCount = document.getElementById('emoji-count');

const EMOJIS = ['😊','😂','😍','😎','🤖','🌸','✨','🍰','🍓','🍕','🐱','🦊','🐼','🌈','☁️','💫','🔥','🌟','🍩','🥑','🎈','🎮','🎵','⚡','💖','🧋','🍪','🍒','🐶','🦄','🍋','☕','📷','🎧'];

function randomEmojis(n){
  const out=[];
  const copy = EMOJIS.slice();
  for(let i=0;i<n;i++){
    if (copy.length===0) break;
    out.push(copy.splice((Math.random()*copy.length)|0,1)[0]);
  }
  return out;
}

function generateEmojis(){
  const n = Math.max(1, Math.min(5, Number(emojiCount?.value)||3));
  const combo = randomEmojis(n).join(' ');
  emojiDisplay.textContent = combo;
}

if (emojiGen) emojiGen.addEventListener('click', generateEmojis);
if (emojiCopy) emojiCopy.addEventListener('click', ()=>{ navigator.clipboard?.writeText(emojiDisplay.textContent || '').then(()=>{ emojiCopy.textContent='Copied!'; setTimeout(()=>emojiCopy.textContent='Copy',900); });});
generateEmojis();

// small accessibility: ensure canvas gets focus for keyboard
sCanvas.tabIndex = 0; sCanvas.addEventListener('click', ()=>sCanvas.focus());

// make canvases crisp for device pixel ratio
function scaleCanvas(c){ const r = window.devicePixelRatio||1; const w = c.width, h=c.height; c.width = w*r; c.height = h*r; c.style.width = w + 'px'; c.style.height = h + 'px'; c.getContext('2d').scale(r,r); }
scaleCanvas(sCanvas);

// end of file

