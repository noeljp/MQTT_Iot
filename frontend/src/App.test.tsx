import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders APRU40 application', () => {
  render(<App />);
  // App should render without crashing
  expect(screen.getByText(/APRU40/i)).toBeInTheDocument();
});
