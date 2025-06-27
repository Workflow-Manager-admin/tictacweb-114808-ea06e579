import { render, screen, fireEvent, within, waitFor, act } from '@testing-library/react';
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

function getModeButton() {
  // Use the label "AI 🧠 Mode" or "2P 👬 Mode" for mode button; these are always unique
  // Use exact:true to make less ambiguous
  const btn = screen.queryByRole('button', { name: /AI 🧠 Mode|2P 👬 Mode/ });
  if (btn) return btn;
  // fallback: query by class and label if necessary
  return document.querySelector('.ttt-mode-btn');
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
    // Mode button present, uniquely
    expect(getModeButton()).toBeInTheDocument();
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
    const modeBtn = getModeButton();
    // Only click if we're in AI mode
    if (modeBtn && /AI/i.test(modeBtn.textContent)) {
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
    const modeBtn = getModeButton();
    if (modeBtn && /AI/i.test(modeBtn.textContent)) {
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

  it('shows correct winner and disables board after win', async () => {
    render(<App />);
    const modeBtn = getModeButton();
    if (modeBtn && /AI/i.test(modeBtn.textContent)) fireEvent.click(modeBtn);
    // X in 1,2,3 for win
    fireEvent.click(getSquare(screen, 1));
    fireEvent.click(getSquare(screen, 4));
    fireEvent.click(getSquare(screen, 2));
    fireEvent.click(getSquare(screen, 5));
    fireEvent.click(getSquare(screen, 3));
    // Wait for finish (there might be status animation delay)
    await waitFor(() => expect(screen.getByText(/Winner:\s*X/i)).toBeInTheDocument(), { timeout: 1200 });
    // Further clicks on empty square do nothing
    fireEvent.click(getSquare(screen, 6));
    expect(getSquare(screen, 6)).toHaveTextContent('');
  });

  it('shows draw state if board fills with no winner', async () => {
    render(<App />);
    const modeBtn = getModeButton();
    if (modeBtn && /AI/i.test(modeBtn.textContent)) fireEvent.click(modeBtn);

    // Moves: X O X | X O O | O X X (draw)
    // 1:X 2:O 3:X 5:X 4:O 8:X 6:O 9:X 7:O
    const order = [1,2,3,5,4,8,6,9,7];
    order.forEach((sq) => {
      fireEvent.click(getSquare(screen, sq));
    });
    // Status may animate into view
    await waitFor(() => expect(screen.getByText(/draw/i)).toBeInTheDocument(), { timeout: 1200 });
    // All squares filled
    for (let i = 1; i <= 9; i++) {
      expect(getSquare(screen, i)).not.toHaveTextContent('');
    }
  });

  it('can reset the game and clears board/status', async () => {
    render(<App />);
    const modeBtn = getModeButton();
    if (modeBtn && /AI/i.test(modeBtn.textContent)) fireEvent.click(modeBtn);

    // Win a game
    fireEvent.click(getSquare(screen, 1));
    fireEvent.click(getSquare(screen, 4));
    fireEvent.click(getSquare(screen, 2));
    fireEvent.click(getSquare(screen, 5));
    fireEvent.click(getSquare(screen, 3));
    await waitFor(() => expect(screen.getByText(/Winner:/i)).toBeInTheDocument());

    // Now reset
    fireEvent.click(screen.getByRole('button', { name: /Restart/i }));
    // All squares empty
    await waitFor(() => {
      for (let i = 1; i <= 9; i++) {
        expect(getSquare(screen, i)).toHaveTextContent('');
      }
      // Status reset
      expect(screen.getByText(/Next player:\s*X/i)).toBeInTheDocument();
    });
  });

  it("displays and toggles between 'AI' and '2P' modes only at appropriate times", () => {
    render(<App />);
    const modeBtn = getModeButton();
    // Start of empty game: mode toggle enabled
    expect(modeBtn).not.toBeDisabled();

    // After X moves, cannot toggle mode (during ongoing game)
    fireEvent.click(getSquare(screen, 1)); // e.g. X mark
    expect(modeBtn).toBeDisabled();

    // Reset enables mode toggle again
    fireEvent.click(screen.getByRole('button', { name: /Restart/i }));
    expect(modeBtn).not.toBeDisabled();
  });

  it('shows O moves automatically in AI mode', async () => {
    jest.useFakeTimers();
    render(<App />);

    // Human plays X
    fireEvent.click(getSquare(screen, 1));

    // X is at (1), O should play within ~560ms (aiMove)
    // Use act to advance timers
    await act(async () => {
      jest.advanceTimersByTime(600);
      // wait for next tick to allow React updates
      await Promise.resolve();
    });

    // X and O now present somewhere
    // X will be present (guaranteed), O should be present as well after the AI move
    await waitFor(() => {
      const xCount = screen.getAllByText('X').length;
      const oCount = screen.getAllByText('O').length;
      expect(xCount).toBeGreaterThanOrEqual(1);
      expect(oCount).toBeGreaterThanOrEqual(1);
    });
    jest.useRealTimers();
  });
});
