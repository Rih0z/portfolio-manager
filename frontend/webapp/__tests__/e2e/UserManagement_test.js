import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { handlers } from '../mocks/handlers';
import App from '@/App';

jest.mock('@react-oauth/google', () => ({
  GoogleOAuthProvider: ({ children }) => <div>{children}</div>,
  GoogleLogin: ({ onSuccess }) => (
    <button onClick={() => onSuccess({ code: 'abc' })}>GoogleLogin</button>
  )
}));

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('user can login and logout', async () => {
  render(<App />);

  await userEvent.click(screen.getByText('GoogleLogin'));
  expect(await screen.findByText('テストユーザー')).toBeInTheDocument();

  await userEvent.click(screen.getByText('ログアウト'));
  expect(await screen.findByText('GoogleLogin')).toBeInTheDocument();
});
