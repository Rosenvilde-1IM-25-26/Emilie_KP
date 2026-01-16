/* Pastel Gadgets JS: drawing pad, snake, cursor effects, theme switcher */

// Theme + cursor selectors
const themeSelect = document.getElementById('theme-select');
const cursorSelect = document.getElementById('cursor-select');
const body = document.body;

// persist theme setting
themeSelect.addEventListener('change', e => {
  const t = e.target.value;
  body.dataset.theme = t;
  try{ localStorage.setItem('theme', t); }catch(e){}
});
// apply saved theme (if any) or keep default
const savedTheme = (function(){ try{ return localStorage.getItem('theme'); }catch(e){ return null } })();
if (savedTheme) { body.dataset.theme = savedTheme; themeSelect.value = savedTheme; } else { themeSelect.value = body.dataset.theme || 'pink'; }

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
  // if not moving, do nothing
  if (dir.x === 0 && dir.y === 0) return;

  const head = {x: snake[0].x + dir.x, y: snake[0].y + dir.y};
  // wrap around
  head.x = (head.x + cols) % cols; head.y = (head.y + rows) % rows;

  // determine whether we'll eat this step (tail stays) so collision logic matches
  const willEat = (food && head.x === food.x && head.y === food.y);
  const hitSelf = snake.some((s, idx) => {
    // if we're not eating, the last segment will move away this turn, so it's safe to move into it
    if (!willEat && idx === snake.length - 1) return false;
    return s.x === head.x && s.y === head.y;
  });

  if (hitSelf) { running = false; clearInterval(timer); setTimeout(()=>alert('Game over!'), 20); return; }

  snake.unshift(head);
  if (willEat) { placeFood(); } else { snake.pop(); }
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
  if (running) return;
  // ensure we have a direction so the game starts moving
  if (dir.x === 0 && dir.y === 0) dir = {x:1,y:0};
  running = true; clearInterval(timer);
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

// --- Simple local 2-player Chess (basic rules, turn taking) ---
const chessBoardEl = document.getElementById('chess-board');
const chessResetBtn = document.getElementById('chess-reset');
const chessTurnEl = document.getElementById('chess-turn');
const chessStatusEl = document.getElementById('chess-status');
let chessState = null; let chessSelected = null; let chessMoves = []; let chessTurn = 'w'; let chessGameOver = false;

const UNICODE = {
  wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
  bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟'
};

function initChess(){
  chessGameOver = false; chessTurn = 'w';
  chessState = [
    ['bR','bN','bB','bQ','bK','bB','bN','bR'],
    ['bP','bP','bP','bP','bP','bP','bP','bP'],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    ['wP','wP','wP','wP','wP','wP','wP','wP'],
    ['wR','wN','wB','wQ','wK','wB','wN','wR']
  ];
  // meta & history
  chessMoveHistory = [];
  chessMeta = { kingMoved: {w:false,b:false}, rookMoved: {'a1':false,'h1':false,'a8':false,'h8':false}, lastDouble: null };
  chessSelected = null; chessMoves = []; chessGameOver = false; chessPromoting = null;
  // wire UI
  undoBtn = document.getElementById('chess-undo');
  vsAiCheckbox = document.getElementById('chess-vs-ai');
  if (undoBtn) undoBtn.addEventListener('click', undoLastMove);
  if (vsAiCheckbox) vsAiCheckbox.addEventListener('change', ()=>{ if (vsAiCheckbox.checked && chessTurn === 'b' && !chessGameOver) setTimeout(aiMakeMove, 300); });
  renderChess();
  updateChessUI();
}

function posToRC(pos){ // pos like 'a1' -> {r,c}
  const file = pos.charCodeAt(0) - 97; // a->0
  const rank = Number(pos[1]);
  const r = 8 - rank; const c = file; return {r,c};
}
function rcToPos(r,c){ return String.fromCharCode(97 + c) + (8 - r); }
function inBounds(r,c){ return r>=0 && r<8 && c>=0 && c<8; }
function pieceAt(pos){ const {r,c}=posToRC(pos); return chessState[r][c]; }
function setPiece(pos, piece){ const {r,c}=posToRC(pos); chessState[r][c]=piece; }
function isEmptyRC(r,c){ return chessState[r][c] === null; }
function isOpponentPiece(r,c,color){ const p = chessState[r][c]; return p && p[0] !== color; }

function getMovesFrom(pos){
  const {r,c} = posToRC(pos);
  const p = chessState[r][c]; if (!p) return [];
  const color = p[0]; const type = p[1]; const dir = color === 'w' ? -1 : 1;
  const moves = [];
  const addIf=function(nr,nc){ if (!inBounds(nr,nc)) return; const target = chessState[nr][nc]; if (!target) moves.push(rcToPos(nr,nc)); else if (target[0] !== color) moves.push(rcToPos(nr,nc)); };

  if (type === 'P'){
    // forward
    if (inBounds(r+dir,c) && chessState[r+dir][c] === null) moves.push(rcToPos(r+dir,c));
    // double from start
    const startRow = color === 'w' ? 6 : 1;
    if (r === startRow && chessState[r+dir][c] === null && chessState[r+2*dir][c] === null) moves.push(rcToPos(r+2*dir,c));
    // captures
    if (inBounds(r+dir,c-1) && isOpponentPiece(r+dir,c-1,color)) moves.push(rcToPos(r+dir,c-1));
    if (inBounds(r+dir,c+1) && isOpponentPiece(r+dir,c+1,color)) moves.push(rcToPos(r+dir,c+1));
    // en-passant (if opponent just moved a pawn two squares beside us)
    try{
      const last = chessMeta && chessMeta.lastDouble;
      if (last && last.color !== color){ const {r:lr,c:lc} = posToRC(last.to); if (lr === r && Math.abs(lc - c) === 1){ const trgR = r + dir, trgC = lc; if (inBounds(trgR,trgC) && chessState[trgR][trgC] === null) moves.push(rcToPos(trgR,trgC)); } }
    }catch(e){}
  }
  else if (type === 'N'){
    const deltas = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    deltas.forEach(d=>addIf(r+d[0],c+d[1]));
  }
  else if (type === 'B' || type === 'R' || type === 'Q'){
    const dirs = [];
    if (type === 'B' || type === 'Q') dirs.push([-1,-1],[-1,1],[1,-1],[1,1]);
    if (type === 'R' || type === 'Q') dirs.push([-1,0],[1,0],[0,-1],[0,1]);
    dirs.forEach(d=>{
      let nr = r + d[0], nc = c + d[1];
      while(inBounds(nr,nc)){
        if (chessState[nr][nc] === null){ moves.push(rcToPos(nr,nc)); }
        else { if (chessState[nr][nc][0] !== color) moves.push(rcToPos(nr,nc)); break; }
        nr += d[0]; nc += d[1];
      }
    });
  }
  else if (type === 'K'){
    for (let dr=-1;dr<=1;dr++) for (let dc=-1;dc<=1;dc++){ if (dr===0 && dc===0) continue; addIf(r+dr,c+dc); }
  }
  return moves;
}

function renderChess(){
  chessBoardEl.innerHTML = '';
  for (let row=0;row<8;row++){
    for (let col=0;col<8;col++){
      const sq = document.createElement('div');
      const light = ((row+col)%2===0);
      sq.className = 'square ' + (light ? 'light' : 'dark');
      const pos = rcToPos(row,col);
      sq.dataset.pos = pos;
      const piece = chessState[row][col];
      if (piece) {
        const colorClass = piece[0] === 'w' ? 'w' : 'b';
        sq.innerHTML = '<span class="piece ' + colorClass + '">' + (UNICODE[piece] || '') + '</span>';
      } else {
        sq.innerHTML = '';
      }
      if (chessSelected === pos) sq.classList.add('selected');
      if (chessMoves.includes(pos)) sq.classList.add('highlight');
      sq.addEventListener('click', ()=>onChessClick(pos));
      chessBoardEl.appendChild(sq);
    }
  }
}

function onChessClick(pos){
  if (chessGameOver) return;
  const p = pieceAt(pos);
  if (chessSelected){
    // move or deselect
    if (chessMoves.includes(pos)){
      const from = chessSelected; const to = pos; const piece = pieceAt(from);
      // handle promotion via UI
      if (piece && piece[1]==='P'){
        const {r:tr} = posToRC(to);
        if (tr===0 || tr===7){ chessPromoting = {from,to,color:piece[0]}; showPromotionUI(piece[0], to); return; }
      }
      makeMove(from,to);
      chessSelected = null; chessMoves = [];
      renderChess(); updateChessUI();
      return;
    }
    // clicking on another own piece switches selection
    if (p && p[0] === chessTurn){ chessSelected = pos; chessMoves = getLegalMovesFrom(pos); renderChess(); return; }
    // otherwise clear selection
    chessSelected = null; chessMoves = []; renderChess();
    return;
  }
  // no selection yet: if clicking own piece, select it
  if (p && p[0] === chessTurn){ chessSelected = pos; chessMoves = getLegalMovesFrom(pos); renderChess(); }
}

function updateChessUI(){
  chessTurnEl.textContent = 'Turn: ' + (chessTurn === 'w' ? 'White' : 'Black');
  chessStatusEl.textContent = chessGameOver ? 'Game over.' : '';
}

// --- helpers: history, legal move checks, promotion UI, AI ---
let chessMoveHistory = []; let undoBtn = null; let vsAiCheckbox = null; let chessPromoting = null;
let chessMeta = { kingMoved: {w:false,b:false}, rookMoved: {'a1':false,'h1':false,'a8':false,'h8':false}, lastDouble: null };

function cloneState(s){ return s.map(r=>r.slice()); }
function isSquareAttackedByState(state,color,tr,tc){
  for (let r=0;r<8;r++){
    for (let c=0;c<8;c++){
      const p = state[r][c]; if (!p || p[0]!==color) continue; const type = p[1];
      if (type === 'P'){
        const dir = (color === 'w') ? -1 : 1; if (r+dir === tr && (c-1 === tc || c+1 === tc)) return true;
      } else if (type === 'N'){
        const deltas = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
        for (const d of deltas) if (r+d[0] === tr && c+d[1] === tc) return true;
      } else if (type === 'B' || type === 'R' || type === 'Q'){
        const dirs = [];
        if (type === 'B' || type === 'Q') dirs.push([-1,-1],[-1,1],[1,-1],[1,1]);
        if (type === 'R' || type === 'Q') dirs.push([-1,0],[1,0],[0,-1],[0,1]);
        for (const d of dirs){ let nr=r+d[0], nc=c+d[1]; while(inBounds(nr,nc)){ if (nr===tr && nc===tc) return true; if (state[nr][nc] !== null) break; nr+=d[0]; nc+=d[1]; } }
      } else if (type === 'K'){
        if (Math.abs(r-tr)<=1 && Math.abs(c-tc)<=1) return true;
      }
    }
  }
  return false;
}
function kingPositionForState(state,color){ for (let r=0;r<8;r++) for (let c=0;c<8;c++){ const p = state[r][c]; if (p && p[0]===color && p[1]==='K') return {r,c}; } return null; }
function isInCheckState(state,color){ const k = kingPositionForState(state,color); if (!k) return false; return isSquareAttackedByState(state, color === 'w' ? 'b' : 'w', k.r, k.c); }

function getLegalMovesFrom(pos){
  const moves = getMovesFrom(pos).slice();
  const p = pieceAt(pos); if (!p) return [];
  const color = p[0]; const type = p[1];
  // castling
  if (type === 'K'){
    if ((color==='w' && !chessMeta.kingMoved.w) || (color==='b' && !chessMeta.kingMoved.b)){
      const rank = color === 'w' ? '1' : '8';
      const rookPos = 'h' + rank; if (!chessMeta.rookMoved[rookPos]){ const steps = color==='w' ? ['f1','g1'] : ['f8','g8']; const clear = steps.every(s=>!pieceAt(s)); const safe = !isInCheckState(chessState,color) && steps.every(s=>{ const {r,c}=posToRC(s); return !isSquareAttackedByState(chessState, color==='w'?'b':'w', r,c); }); if (clear && safe) moves.push(color==='w'?'g1':'g8'); }
      const rookPos2 = 'a' + rank; if (!chessMeta.rookMoved[rookPos2]){ const steps = color==='w' ? ['d1','c1','b1'] : ['d8','c8','b8']; const clear = steps.slice(0,2).every(s=>!pieceAt(s)); const safe = !isInCheckState(chessState,color) && ['d'+rank,'c'+rank].every(s=>{ const {r,c}=posToRC(s); return !isSquareAttackedByState(chessState, color==='w'?'b':'w', r,c); }); if (clear && safe) moves.push(color==='w'?'c1':'c8'); }
    }
  }
  // filter out moves that leave king in check
  const legal = [];
  for (const to of moves){ const snapshot = cloneState(chessState); const from = pos; const {r:fr,c:fc} = posToRC(from); const {r:tr,c:tc} = posToRC(to); const pce = snapshot[fr][fc];
    // en-passant capture simulation
    if (pce[1]==='P' && fc !== tc && snapshot[tr][tc] === null){ const capR = pce[0] === 'w' ? tr+1 : tr-1; snapshot[capR][tc] = null; }
    // castling simulation
    if (pce[1]==='K' && Math.abs(fc-tc) > 1){ if (tc === 6){ snapshot[fr][5] = snapshot[fr][7]; snapshot[fr][7] = null; } else if (tc === 2){ snapshot[fr][3] = snapshot[fr][0]; snapshot[fr][0] = null; } }
    snapshot[tr][tc] = pce; snapshot[fr][fc] = null; if (pce[1]==='P' && (tr===0 || tr===7)) snapshot[tr][tc] = pce[0] + 'Q';
    if (!isInCheckState(snapshot, color)) legal.push(to);
  }
  return legal;
}

function renderHistory(){ const h = document.getElementById('chess-history'); if (!h) return; h.innerHTML = ''; chessMoveHistory.forEach((m,i)=>{ const el = document.createElement('span'); el.className='move'; el.textContent = (i+1) + '. ' + m.san; h.appendChild(el); }); }

function makeMove(from,to,opts={}){
  if (chessGameOver) return;
  const snapshot = {state: cloneState(chessState), meta: JSON.parse(JSON.stringify(chessMeta)), turn: chessTurn};
  const p = pieceAt(from); if (!p) return;
  const {r:fr,c:fc} = posToRC(from); const {r:tr,c:tc} = posToRC(to);
  const moveObj = {from,to,piece:p,captured:pieceAt(to),san:from+'→'+to, special:{}};
  if (p[1]==='P' && fc !== tc && pieceAt(to) === null){ const capR = p[0] === 'w' ? tr+1 : tr-1; moveObj.captured = chessState[capR][tc]; chessState[capR][tc] = null; moveObj.special.enPassant = true; }
  if (p[1]==='K' && Math.abs(fc-tc) > 1){ moveObj.special.castle = true; if (tc===6){ const rookFrom = rcToPos(fr,7); const rookTo = rcToPos(fr,5); setPiece(rookTo, pieceAt(rookFrom)); setPiece(rookFrom, null); moveObj.special.rookFrom=rookFrom; moveObj.special.rookTo=rookTo; chessMeta.rookMoved[rookFrom] = true; } else if (tc===2){ const rookFrom = rcToPos(fr,0); const rookTo = rcToPos(fr,3); setPiece(rookTo, pieceAt(rookFrom)); setPiece(rookFrom, null); moveObj.special.rookFrom=rookFrom; moveObj.special.rookTo=rookTo; chessMeta.rookMoved[rookFrom] = true; } }
  setPiece(to, pieceAt(from)); setPiece(from, null);
  if (p[1]==='P' && Math.abs(tr-fr) === 2){ chessMeta.lastDouble = {to: to, color: p[0]}; moveObj.special.doublePawn = true; } else { chessMeta.lastDouble = null; }
  if (p[1] === 'K'){ chessMeta.kingMoved[p[0]] = true; }
  if (p[1] === 'R'){ chessMeta.rookMoved[from] = true; }
  if (p[1]==='P' && (tr===0 || tr===7)){
    if (opts.promotion){ setPiece(to, p[0] + opts.promotion); moveObj.special.promotion = opts.promotion; }
    else { chessPromoting = {from,to,color:p[0], snapshot}; showPromotionUI(p[0],to); return; }
  }
  chessMoveHistory.push(Object.assign({snapshot}, moveObj)); renderHistory();
  chessTurn = chessTurn === 'w' ? 'b' : 'w';
  renderChess(); updateChessUI();
  const opponent = chessTurn; const anyMoves = anyLegalMoves(opponent);
  if (isInCheckState(chessState, opponent) && !anyMoves){ chessStatusEl.textContent = (opponent==='w'?'White':'Black') + ' is checkmated.'; chessGameOver = true; }
  else if (isInCheckState(chessState, opponent)){ chessStatusEl.textContent = (opponent==='w'?'White':'Black') + ' is in check.'; }
  else { chessStatusEl.textContent = ''; }
  if (vsAiCheckbox && vsAiCheckbox.checked && chessTurn === 'b' && !chessGameOver){ setTimeout(aiMakeMove, 300); }
}

function undoLastMove(){ if (chessMoveHistory.length === 0) return; const last = chessMoveHistory.pop(); chessState = cloneState(last.snapshot.state); chessMeta = JSON.parse(JSON.stringify(last.snapshot.meta)); chessTurn = last.snapshot.turn; chessSelected = null; chessMoves = []; chessGameOver = false; renderChess(); updateChessUI(); renderHistory(); }

function anyLegalMoves(color){ for (let r=0;r<8;r++) for (let c=0;c<8;c++){ const p = chessState[r][c]; if (p && p[0] === color){ const pos = rcToPos(r,c); if (getLegalMovesFrom(pos).length > 0) return true; } } return false; }

function showPromotionUI(color,to){ const promo = document.getElementById('chess-promo'); if (!promo) return; promo.innerHTML = '';
  const title = document.createElement('div'); title.textContent = 'Choose promotion for ' + (color==='w'?'White':'Black'); title.style.marginBottom='8px'; promo.appendChild(title);
  const pieces = ['Q','R','B','N']; pieces.forEach(p=>{ const btn = document.createElement('button'); btn.className='btn'; btn.textContent = p === 'Q' ? 'Queen' : p === 'R' ? 'Rook' : p === 'B' ? 'Bishop' : 'Knight'; btn.addEventListener('click', ()=>{ const choice = p; // finalize promotion by applying snapshot then promotion
      const data = chessPromoting; if (!data) return; // restore snapshot state first
      chessState = cloneState(data.snapshot.state); chessMeta = JSON.parse(JSON.stringify(data.snapshot.meta)); chessTurn = data.snapshot.turn;
      // now make the move with promotion
      makeMove(data.from, data.to, {promotion: choice});
      promo.hidden = true; promo.setAttribute('aria-hidden','true'); chessPromoting = null; }); promo.style.marginRight='6px'; promo.appendChild(btn); });
  promo.hidden = false; promo.setAttribute('aria-hidden','false'); }

function aiMakeMove(){ // simple random AI, prefers captures
  const color = 'b'; const moves=[]; for (let r=0;r<8;r++){ for (let c=0;c<8;c++){ const p = chessState[r][c]; if (!p || p[0]!==color) continue; const pos = rcToPos(r,c); const opts = getLegalMovesFrom(pos); opts.forEach(to=>moves.push({from:pos,to:to,cap: !!pieceAt(to)})); } }
  if (moves.length===0) return; // pass
  const captures = moves.filter(m=>m.cap);
  const chosen = (captures.length>0 ? captures : moves)[Math.floor(Math.random()* (captures.length>0?captures.length:moves.length))];
  const p = pieceAt(chosen.from);
  const {r:tr} = posToRC(chosen.to);
  if (p && p[1]==='P' && (tr===0 || tr===7)) makeMove(chosen.from, chosen.to, {promotion:'Q'});
  else makeMove(chosen.from, chosen.to);
}

chessResetBtn.addEventListener('click', ()=>{ initChess(); });

// init on load
initChess();

// --- Virtual Pet: Cat ---
(function(){
  const el = document.getElementById('cat');
  if (!el) return;
  const sH = document.getElementById('stat-hunger');
  const sT = document.getElementById('stat-thirst');
  const sA = document.getElementById('stat-affection');
  const sB = document.getElementById('stat-boredom');
  const sR = document.getElementById('stat-tiredness');
  const status = document.getElementById('pet-status');
  const feedBtn = document.getElementById('feed-btn');
  const waterBtn = document.getElementById('water-btn');
  const playBtn = document.getElementById('play-btn');
  const sleepBtn = document.getElementById('sleep-btn');

  const clamp = v => Math.max(0, Math.min(100, Math.round(v)));
  const colorFor = (v, invert=false) => {
    // invert: high = bad (boredom/tiredness)
    const val = invert ? 100 - v : v;
    if (val < 30) return '#ff6b6b';
    if (val < 60) return '#ffd166';
    return 'linear-gradient(90deg,var(--accent),var(--accent-strong))';
  };

  const state = {hunger:80,thirst:80,affection:85,boredom:10,tiredness:12,alive:true, sleeping:false};

  function updateUI(){
    sH.style.width = state.hunger + '%'; sH.style.background = colorFor(state.hunger);
    sT.style.width = state.thirst + '%'; sT.style.background = colorFor(state.thirst);
    sA.style.width = state.affection + '%'; sA.style.background = colorFor(state.affection);
    sB.style.width = state.boredom + '%'; sB.style.background = colorFor(state.boredom, true);
    sR.style.width = state.tiredness + '%'; sR.style.background = colorFor(state.tiredness, true);
    if (!state.alive){ status.textContent = 'Status: Passed away ☠️'; el.classList.add('dead'); el.classList.remove('breath'); [feedBtn,waterBtn,playBtn,sleepBtn].forEach(b=>b.disabled=true); return; }
    // ensure any dead styling is cleared when alive
    el.classList.remove('dead');
    if (state.sleeping) { status.textContent = 'Status: Sleeping 💤'; el.classList.add('breath'); }
    else { status.textContent = 'Status: Healthy'; el.classList.add('breath'); }
  }



  // natural decay/growth per second
  setInterval(()=>{
    if (!state.alive || state.sleeping) return;
    state.hunger = clamp(state.hunger - 0.25);
    state.thirst = clamp(state.thirst - 0.3);
    state.affection = clamp(state.affection - 0.08);
    state.boredom = clamp(state.boredom + 0.18);
    state.tiredness = clamp(state.tiredness + 0.12);
    checkDeath(); updateUI();
  }, 1000);

  // petting removed per request: hover/heart behavior disabled
  // (previously spawned hearts and increased affection while hovering)

  // controls
  const resetBtn = document.getElementById('reset-btn');

  let survived = 0; const survivedEl = document.getElementById('survived-time');

  function formatTime(s){ const m = Math.floor(s/60); const sec = s%60; return (m>0? m+'m ':'') + sec + 's'; }
  function updateSurvival(){ survivedEl.textContent = formatTime(survived); }

  const surviveTimer = setInterval(()=>{ if (!state.alive) return; survived++; updateSurvival(); }, 1000);

  function showSkull(){ if (el.querySelector('.skull')) return; const sk = document.createElement('div'); sk.className='skull'; sk.textContent='💀'; el.appendChild(sk); setTimeout(()=>sk.classList.add('visible'),20); }
  function removeSkull(){ const sk = el.querySelector('.skull'); if (sk) sk.remove(); }

  function resetPet(){ state.hunger=80; state.thirst=80; state.affection=85; state.boredom=10; state.tiredness=12; state.alive=true; state.sleeping=false; survived=0; updateSurvival(); removeSkull(); [feedBtn,waterBtn,playBtn,sleepBtn].forEach(b=>b.disabled=false); el.classList.remove('dead'); updateUI(); }



  resetBtn.addEventListener('click', ()=>{ resetPet(); });

  // button handlers
  if (feedBtn) feedBtn.addEventListener('click', ()=>{ if (!state.alive) return; state.hunger = clamp(state.hunger + 28); state.boredom = clamp(state.boredom - 6); updateUI(); });
  if (waterBtn) waterBtn.addEventListener('click', ()=>{ if (!state.alive) return; state.thirst = clamp(state.thirst + 30); updateUI(); });
  if (playBtn) playBtn.addEventListener('click', ()=>{ if (!state.alive) return; state.boredom = clamp(state.boredom - 40); state.tiredness = clamp(state.tiredness + 18); state.hunger = clamp(state.hunger - 8); state.thirst = clamp(state.thirst - 6); state.affection = clamp(state.affection + 6); updateUI(); });


  // override death behavior to show skull and suggest reset
  function checkDeath(){
    if (!state.alive) return;
    if (state.hunger <= 0 || state.thirst <= 0 || state.affection <= 0 || state.boredom >= 100 || state.tiredness >= 100){
      state.alive = false; updateUI(); showSkull(); // gentle alert
      setTimeout(()=>alert('Your cat has died. Use Reset to restart.'),80);
    }
  }

  // sleep behavior
  sleepBtn.addEventListener('click', ()=>{
    if (!state.alive || state.sleeping) return; state.sleeping = true; updateUI();
    // spend 6 seconds sleeping
    let ticks = 0; const sl = setInterval(()=>{ ticks++; state.tiredness = clamp(state.tiredness - 10); state.hunger = clamp(state.hunger - 4); state.thirst = clamp(state.thirst - 3); updateUI(); if (ticks>=6){ clearInterval(sl); state.sleeping=false; updateUI(); } }, 1000);
  });

  // initial UI
  updateSurvival(); updateUI();
})();

// end of file
