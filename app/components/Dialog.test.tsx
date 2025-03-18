import { useRef } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Dialog, makeDialogRef } from './Dialog';

const TestDialog = () => {
  const dialogRef = makeDialogRef();
  return (
    <>
      <button onClick={() => dialogRef.current?.setIsOpen(true)}>Open Dialog</button>
      <Dialog ref={dialogRef}>
        <h3>Test Dialog</h3>
        <button onClick={() => dialogRef.current?.setIsOpen(false)}>Close</button>
      </Dialog>
    </>
  );
};

test('it opens and closes the dialog', () => {
  render(<TestDialog />);
  // Initially, the dialog should not be visible
  expect(screen.queryByText(/Test Dialog/i)).toBe(null);

  // Open the dialog
  fireEvent.click(screen.getByText(/Open Dialog/i)); // You may need to add a button to open the dialog in your TestDialog component
  // Now the dialog should be visible
  expect(screen.getByText(/Test Dialog/i)).toBeTruthy();

  // Close the dialog
  fireEvent.click(screen.getByText(/Close/i));
  // The dialog should no longer be visible
  expect(screen.queryByText(/Test Dialog/i)).toBe(null);
}); 