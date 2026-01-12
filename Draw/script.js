// Script

const canvas = document.getElementById("paintCanvas");
const ctx = canvas.getContext("2d");

// Tools and controls
const brushSizeInput = document.getElementById("brushSize");
const brushSizeLabel = document.getElementById("brushSizeLabel");
const colorPicker = document.getElementById("colorPicker");


const brushToolBtn = document.getElementById("brushToolBtn");
const eraserToolBtn = document.getElementById("eraserToolBtn");

const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const clearCanvasBtn = document.getElementById("clearCanvasBtn");
const saveBtn = document.getElementById("saveBtn");

// State
let isDrawing = false;
let currentTool = "brush"; // 'brush' or 'eraser'
let lastX = 0;
let lastY = 0;

// Undo/redo stacks
const undoStack = [];
const redoStack = [];
const MAX_HISTORY = 30;

// Initialize
function initCanvas() {
  // Ensure canvas starts with a solid white background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  saveState();
}

function saveState() {
  // Push current state to undo stack
  if (undoStack.length >= MAX_HISTORY) {
    undoStack.shift();
  }
  undoStack.push(canvas.toDataURL());
  // Clear redo stack when new action is taken
  redoStack.length = 0;
}

function restoreFromDataURL(dataURL) {
  const img = new Image();
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  };
  img.src = dataURL;
}

// Drawing helpers
function getCanvasCoords(event) {
  const rect = canvas.getBoundingClientRect();
  let clientX, clientY;

  if (event.touches && event.touches[0]) {
    clientX = event.touches[0].clientX;
    clientY = event.touches[0].clientY;
  } else {
    clientX = event.clientX;
    clientY = event.clientY;
  }

  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

function startDrawing(event) {
  event.preventDefault();
  isDrawing = true;
  const { x, y } = getCanvasCoords(event);
  lastX = x;
  lastY = y;
}

function draw(event) {
  if (!isDrawing) return;
  event.preventDefault();

  const { x, y } = getCanvasCoords(event);

  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.lineWidth = brushSizeInput.value;

  if (currentTool === "eraser") {
    ctx.strokeStyle = "#ffffff"; // eraser always uses white
  } else {
    ctx.strokeStyle = colorPicker.value;
  }

  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(x, y);
  ctx.stroke();

  lastX = x;
  lastY = y;
}

function stopDrawing(event) {
  if (!isDrawing) return;
  isDrawing = false;
  saveState();
}

// Tool switching
function setTool(tool) {
  currentTool = tool;
  if (tool === "brush") {
    brushToolBtn.classList.add("active");
    eraserToolBtn.classList.remove("active");
  } else if (tool === "eraser") {
    eraserToolBtn.classList.add("active");
    brushToolBtn.classList.remove("active");
  }
}



// Undo / Redo
function undo() {
  if (undoStack.length > 1) {
    const current = undoStack.pop();
    redoStack.push(current);
    const previous = undoStack[undoStack.length - 1];
    restoreFromDataURL(previous);
  }
}

function redo() {
  if (redoStack.length > 0) {
    const dataURL = redoStack.pop();
    undoStack.push(dataURL);
    restoreFromDataURL(dataURL);
  }
}

// Clear canvas
function clearCanvas() {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  saveState();
}

// Save PNG
function saveImage() {
  const link = document.createElement("a");
  link.download = "drawing.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}

// Brush size UI
brushSizeInput.addEventListener("input", () => {
  brushSizeLabel.textContent = brushSizeInput.value;
});

// Tool buttons
brushToolBtn.addEventListener("click", () => setTool("brush"));
eraserToolBtn.addEventListener("click", () => setTool("eraser"));


// Undo/redo/clear/save
undoBtn.addEventListener("click", undo);
redoBtn.addEventListener("click", redo);
clearCanvasBtn.addEventListener("click", clearCanvas);
saveBtn.addEventListener("click", saveImage);

// Mouse events
canvas.addEventListener("mousedown", startDrawing);
canvas.addEventListener("mousemove", draw);
canvas.addEventListener("mouseup", stopDrawing);
canvas.addEventListener("mouseleave", stopDrawing);

// Touch events
canvas.addEventListener("touchstart", startDrawing, { passive: false });
canvas.addEventListener("touchmove", draw, { passive: false });
canvas.addEventListener("touchend", stopDrawing, { passive: false });
canvas.addEventListener("touchcancel", stopDrawing, { passive: false });

// Init on load
initCanvas();
setTool("brush");
brushSizeLabel.textContent = brushSizeInput.value;
