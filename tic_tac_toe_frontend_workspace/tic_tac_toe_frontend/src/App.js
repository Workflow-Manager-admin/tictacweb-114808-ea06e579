import React, { useState, useEffect } from 'react';
import './App.css';

// Color palette from project config
const COLORS = {
  x: '#1976D2', // primary
  o: '#FFC107', // accent
  win: '#31C48D', // green for win highlight
  draw: '#FFA500', // orange for draw
  board_bg: '#FFFFFF',
  border: '#1976D2',
  status: '#282c34',
  restart: '#1976D2',
};

/**
 * AI bot logic (random, or simple minimax for unbeatable) 
 * Returns [row, col] for next move
 * @param {Array} squares - 2D array of current board
 * @param {string} player - 'X' or 'O'
 * @returns {Array|null}
 */
function aiMove(squares, player) {
  // Simple AI: take winning move, block opponent, else random
  const opponent = player === 'X' ? 'O' : 'X';

  // Check win/block logic
  const empty = [];
  for(let i=0;i<3;i++) for(let j=0;j<3;j++)
    if(!squares[i][j]) empty.push([i,j]);
  
  // Try win
  for(const [i,j] of empty) {
    const clone = squares.map(r => r.slice());
    clone[i][j] = player;
    if (calculateWinner(clone)) return [i,j];
  }
  // Try block
  for(const [i,j] of empty) {
    const clone = squares.map(r => r.slice());
    clone[i][j] = opponent;
    if (calculateWinner(clone)) return [i,j];
  }
  // Take center
  if (!squares[1][1]) return [1,1];
  // Or random
  if (empty.length) {
    const idx = Math.floor(Math.random()*empty.length);
    return empty[idx];
  }
  return null;
}

/**
 * Calculate the winner of the board
 * Returns {winner, line} or null
 */
function calculateWinner(squares) {
  const lines = [
    // rows
    [[0,0],[0,1],[0,2]],
    [[1,0],[1,1],[1,2]],
    [[2,0],[2,1],[2,2]],
    // cols
    [[0,0],[1,0],[2,0]],
    [[0,1],[1,1],[2,1]],
    [[0,2],[1,2],[2,2]],
    // diags
    [[0,0],[1,1],[2,2]],
    [[0,2],[1,1],[2,0]]
  ];
  for (let line of lines) {
    const [a,b,c] = line;
    if (
      squares[a[0]][a[1]] &&
      squares[a[0]][a[1]] === squares[b[0]][b[1]] &&
      squares[a[0]][a[1]] === squares[c[0]][c[1]]
    ) {
      return { winner: squares[a[0]][a[1]], line };
    }
  }
  return null;
}

// Square animation states: 'idle', 'placed', 'winning', 'draw'
function Square({ value, onClick, animState, disabled, 'aria-label': ariaLabel }) {
  return (
    <button
      className={
        'ttt-square' +
        (value ? ' ttt-square-filled' : '') +
        (animState === 'placed' ? ' ttt-anim-placed' : '') +
        (animState === 'winning' ? ' ttt-anim-winning' : '') +
        (animState === 'draw' ? ' ttt-anim-draw' : '')
      }
      style={{
        color: value === 'X' ? COLORS.x : COLORS.o,
        borderColor: COLORS.border,
        backgroundColor: value ? COLORS.board_bg : 'transparent',
      }}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      tabIndex={0}
    >
      <span>
        {value === 'X' &&
          <span className="ttt-x" aria-label="X" style={{ color: COLORS.x }}>X</span>
        }
        {value === 'O' &&
          <span className="ttt-o" aria-label="O" style={{ color: COLORS.o }}>O</span>
        }
      </span>
    </button>
  );
}

// Board: 3x3 grid
function Board({ squares, onSquareClick, animStates, disabled }) {
  return (
    <div className="ttt-board" role="grid" aria-label="Tic Tac Toe Board">
      {squares.map((row, i) =>
        <div className="ttt-row" key={i} role="row">
          {row.map((val, j) =>
            <Square
              key={j}
              value={val}
              onClick={() => onSquareClick(i, j)}
              animState={animStates && animStates[i][j]}
              disabled={disabled || !!val}
              aria-label={`Row ${i+1} Column ${j+1} ${val ? val : ''}`}
            />
          )}
        </div>
      )}
    </div>
  );
}

// Status/output
function Status({ winner, draw, xIsNext, aiMode, onToggleMode, canToggle, onRestart, statusAnim }) {
  let msg;
  if (winner) msg = `Winner: ${winner}`;
  else if (draw) msg = "It's a draw!";
  else msg = `Next player: ${xIsNext ? 'X' : 'O'}`;
  return (
    <div className="ttt-status-container">
      <div
        className={
          "ttt-status" + 
          (winner ? " ttt-status-win" : "") +
          (draw ? " ttt-status-draw" : "") +
          (statusAnim ? " ttt-anim-status" : "")
        }
        aria-live="polite"
      >
        {msg}
      </div>
      {typeof onToggleMode === 'function' &&
        <button className="ttt-mode-btn"
          onClick={onToggleMode}
          disabled={!canToggle}
          aria-pressed={aiMode}
        >
          {aiMode ? "AI 🧠 Mode" : "2P 👬 Mode"}
        </button>
      }
      <button className="ttt-restart-btn" onClick={onRestart} aria-label="Restart Game">
        ↻ Restart
      </button>
    </div>
  );
}

// PUBLIC_INTERFACE
function App() {
  // State
  const [squares, setSquares] = useState([
    [null, null, null],
    [null, null, null],
    [null, null, null],
  ]);
  const [xIsNext, setXIsNext] = useState(true);
  const [winnerObj, setWinnerObj] = useState(null);
  const [draw, setDraw] = useState(false);
  const [animStates, setAnimStates] = useState([
    ['idle','idle','idle'],
    ['idle','idle','idle'],
    ['idle','idle','idle'],
  ]);
  const [aiMode, setAiMode] = useState(true); // true: play vs AI, false: two player
  const [statusAnim, setStatusAnim] = useState(false);
  const [boardDisabled, setBoardDisabled] = useState(false);

  // Theme
  const [theme, setTheme] = useState('light');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Handle winner or draw when board updates
  useEffect(() => {
    const calc = calculateWinner(squares);
    if (calc) {
      setWinnerObj(calc);
      setBoardDisabled(true);
      animateWinningLine(calc.line);
    } else if (squares.flat().every(Boolean)) {
      setDraw(true);
      animateDraw();
      setBoardDisabled(true);
    } else {
      setWinnerObj(null);
      setDraw(false);
    }
  // eslint-disable-next-line
  }, [squares]);

  // Animate single move
  function animateMove(row, col) {
    setAnimStates(prev =>
      prev.map((r, i) => r.map((s, j) =>
        i === row && j === col ? 'placed' : s
      ))
    );
    setTimeout(() => {
      setAnimStates(prev =>
        prev.map((r, i) => r.map((s, j) =>
          (i === row && j === col && s === 'placed') ? 'idle' : s
        ))
      );
    }, 320);
  }

  // Animate winning line
  function animateWinningLine(line) {
    setTimeout(() => {
      setAnimStates(prev =>
        prev.map((r, i) => r.map((s, j) =>
          line.some(([li, lj]) => li === i && lj === j) ? 'winning' : s
        ))
      );
      setStatusAnim(true);
      setTimeout(() => setStatusAnim(false), 1200);
    }, 250);
  }

  // Animate draw
  function animateDraw() {
    setTimeout(() => {
      setAnimStates(prev =>
        prev.map(r => r.map(() => 'draw'))
      );
      setStatusAnim(true);
      setTimeout(() => setStatusAnim(false), 1200);
    }, 150);
  }

  // PUBLIC_INTERFACE
  function handleSquareClick(i, j) {
    if (squares[i][j] || winnerObj || draw || boardDisabled) return;
    const nextSquares = squares.map(r => r.slice());
    nextSquares[i][j] = xIsNext ? 'X' : 'O';
    setSquares(nextSquares);
    animateMove(i,j);
    setXIsNext(x => !x);
  }

  // AI-move after human move, only if game ongoing and AI active
  useEffect(() => {
    if (
      aiMode &&
      !winnerObj &&
      !draw &&
      !xIsNext // O is AI
    ) {
      setBoardDisabled(true);
      setTimeout(() => {
        const move = aiMove(squares, 'O');
        if (move && !squares[move[0]][move[1]]) {
          handleSquareClick(move[0], move[1]);
        }
        setBoardDisabled(false);
      }, 560);
    }
    // eslint-disable-next-line
  }, [xIsNext, aiMode, squares, winnerObj, draw]);

  // PUBLIC_INTERFACE
  function handleRestart() {
    setSquares([
      [null, null, null],
      [null, null, null],
      [null, null, null],
    ]);
    setAnimStates([
      ['idle','idle','idle'],
      ['idle','idle','idle'],
      ['idle','idle','idle'],
    ]);
    setWinnerObj(null);
    setDraw(false);
    setXIsNext(true);
    setBoardDisabled(false);
    setStatusAnim(true);
    setTimeout(() => setStatusAnim(false), 900);
  }

  // PUBLIC_INTERFACE
  function toggleTheme() {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }

  // PUBLIC_INTERFACE
  function handleToggleMode() {
    if (!winnerObj && !draw && squares.flat().some(Boolean)) return; // don't toggle during game
    setAiMode(prev => !prev);
    handleRestart();
  }

  return (
    <div className="App">
      <header className="App-header">
        <button 
          className="theme-toggle" 
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
        <h1 className="ttt-title" style={{ marginBottom: '0.2em' }}>Tic Tac Toe</h1>
        <div className="ttt-container">
          <Board
            squares={squares}
            onSquareClick={handleSquareClick}
            animStates={animStates}
            disabled={boardDisabled || !!winnerObj || draw}
          />
        </div>
        <Status
          winner={winnerObj && winnerObj.winner}
          draw={draw}
          xIsNext={xIsNext}
          aiMode={aiMode}
          onToggleMode={handleToggleMode}
          canToggle={!squares.flat().some(Boolean)}
          onRestart={handleRestart}
          statusAnim={statusAnim}
        />
        <div className="ttt-desc" style={{marginTop:'1.5em', color:'#888', fontSize:'1em'}}>
          <span>Modern React UI, Accessibility, Animations, {aiMode ? "AI Bot" : "2-Player"}, Responsive Design</span>
        </div>
      </header>
    </div>
  );
}

export default App;
