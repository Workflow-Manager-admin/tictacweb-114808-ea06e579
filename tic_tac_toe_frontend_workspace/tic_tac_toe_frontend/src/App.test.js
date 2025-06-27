import { render, screen, fireEvent, within } from '@testing-library/react';
import App from './App';

/**
 * Helper utility: returns the Nth square (1-9 left-to-right, top-to-bottom)
 * @param {RenderResult} utils - Result of render()
 * @param {number} n - 1-based index (1-9)
 */
function getSquare(utils, n) {
  // Grid: row1=[1,2,3], row2=[4,5,6], row3=[7,8,9]
  const row = Math.floor((n - 1) / 3) + 1;
  const col = ((n - 1) % 3) + 1;
  // Squares have aria-labels e.g. Row 1 Column 1
  return utils.getByRole('button', { name: new RegExp(`Row ${row} Column ${col}`) });
}

describe('Tic Tac Toe App', () => {
  it('renders the title and basic UI', () => {
    render(<App />);
    expect(screen.getByText(/Tic Tac Toe/i)).toBeInTheDocument();
    // There should be 9 squares
    expect(screen.getAllByRole('button', { name: /Row \d+ Column \d/ })).toHaveLength(9);
    // Status present
    expect(screen.getByText(/Next player:/)).toBeInTheDocument();
    // Restart button present
    expect(screen.getByRole('button', { name: /Restart/i })).toBeInTheDocument();
  });

  it('starts with an empty board and "Next player: X"', () => {
    render(<App />);
    for (let i = 1; i <= 9; i++) {
      expect(getSquare(screen, i)).toHaveTextContent('');
    }
    expect(screen.getByText(/Next player:\s*X/i)).toBeInTheDocument();
  });

  it('allows marking squares alternately with X and O (2P mode)', () => {
    render(<App />);
    // Switch to 2-player mode if possible (AI mode by default)
    const modeBtn = screen.getByRole('button', { name: /mode/i });
    if (/AI/i.test(modeBtn.textContent)) {
      fireEvent.click(modeBtn);
    }
    // Play 3 moves X->O->X
    fireEvent.click(getSquare(screen, 1)); // X
    expect(getSquare(screen, 1)).toHaveTextContent('X');
    expect(screen.getByText(/Next player:\s*O/i)).toBeInTheDocument();

    fireEvent.click(getSquare(screen, 2)); // O
    expect(getSquare(screen, 2)).toHaveTextContent('O');
    expect(screen.getByText(/Next player:\s*X/i)).toBeInTheDocument();

    fireEvent.click(getSquare(screen, 3)); // X
    expect(getSquare(screen, 3)).toHaveTextContent('X');
  });

  it('does not change a filled square', () => {
    render(<App />);
    // Switch to 2-player mode if currently in AI
    const modeBtn = screen.getByRole('button', { name: /mode/i });
    if (/AI/i.test(modeBtn.textContent)) {
      fireEvent.click(modeBtn);
    }
    fireEvent.click(getSquare(screen, 1)); // X
    expect(getSquare(screen, 1)).toHaveTextContent('X');
    // Try to click again
    fireEvent.click(getSquare(screen, 1));
    // Remains X
    expect(getSquare(screen, 1)).toHaveTextContent('X');
    // Next player should still be O
    expect(screen.getByText(/Next player:\s*O/i)).toBeInTheDocument();
  });

  it('shows correct winner and disables board after win', () => {
    render(<App />);
    const modeBtn = screen.getByRole('button', { name: /mode/i });
    if (/AI/i.test(modeBtn.textContent)) fireEvent.click(modeBtn);
    // X in 1,2,3 for win
    fireEvent.click(getSquare(screen, 1));
    fireEvent.click(getSquare(screen, 4));
    fireEvent.click(getSquare(screen, 2));
    fireEvent.click(getSquare(screen, 5));
    fireEvent.click(getSquare(screen, 3));
    expect(screen.getByText(/Winner:\s*X/i)).toBeInTheDocument();
    // Further clicks on empty square do nothing
    fireEvent.click(getSquare(screen, 6));
    expect(getSquare(screen, 6)).toHaveTextContent('');
  });

  it('shows draw state if board fills with no winner', () => {
    render(<App />);
    const modeBtn = screen.getByRole('button', { name: /mode/i });
    if (/AI/i.test(modeBtn.textContent)) fireEvent.click(modeBtn);
    // Moves: X O X | X O O | O X X (draw)
    // 1:X 2:O 3:X 4:X 5:O 6:O 7:O 8:X 9:X
    [1,2,3,5,4,8,6,9,7].forEach((sq, idx) => {
      fireEvent.click(getSquare(screen, sq));
    });
    expect(screen.getByText(/draw/i)).toBeInTheDocument();
    // All squares filled
    for (let i = 1; i <= 9; i++) {
      expect(getSquare(screen, i)).not.toHaveTextContent('');
    }
  });

  it('can reset the game and clears board/status', () => {
    render(<App />);
    const modeBtn = screen.getByRole('button', { name: /mode/i });
    if (/AI/i.test(modeBtn.textContent)) fireEvent.click(modeBtn);
    // Win a game
    fireEvent.click(getSquare(screen, 1));
    fireEvent.click(getSquare(screen, 4));
    fireEvent.click(getSquare(screen, 2));
    fireEvent.click(getSquare(screen, 5));
    fireEvent.click(getSquare(screen, 3));
    expect(screen.getByText(/Winner:/i)).toBeInTheDocument();
    // Now reset
    fireEvent.click(screen.getByRole('button', { name: /Restart/i }));
    // All squares empty
    for (let i = 1; i <= 9; i++) {
      expect(getSquare(screen, i)).toHaveTextContent('');
    }
    // Status reset
    expect(screen.getByText(/Next player:\s*X/i)).toBeInTheDocument();
  });

  it("displays and toggles between 'AI' and '2P' modes only at appropriate times", () => {
    render(<App />);
    const modeBtn = screen.getByRole('button', { name: /mode/i });
    // Start of empty game: mode toggle enabled
    expect(modeBtn).not.toBeDisabled();

    // After X moves, cannot toggle mode (during ongoing game)
    fireEvent.click(getSquare(screen, 1)); // e.g. X mark
    expect(modeBtn).toBeDisabled();

    // Reset enables mode toggle again
    fireEvent.click(screen.getByRole('button', { name: /Restart/i }));
    expect(modeBtn).not.toBeDisabled();
  });

  it('shows O moves automatically in AI mode', () => {
    jest.useFakeTimers();
    render(<App />);
    // Should start in AI mode
    // Human plays X
    fireEvent.click(getSquare(screen, 1));
    // X is at (1), O should play within ~560ms (aiMove)
    // Advance timers
    jest.advanceTimersByTime(600);
    // X and O now present somewhere
    const xCount = screen.getAllByText('X').length;
    const oCount = screen.getAllByText('O').length;
    expect(xCount).toBeGreaterThanOrEqual(1);
    expect(oCount).toBeGreaterThanOrEqual(1);
    jest.useRealTimers();
  });
});
