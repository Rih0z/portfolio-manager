import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../hooks/useAuth';

const LoginButton = () => {
  const { handleLogin } = useAuth();

  return (
    <div>
      <GoogleLogin
        onSuccess={handleLogin}
        onError={() => console.error('ログインに失敗しました')}
        useOneTap
        theme="filled_blue"
        text="signin_with"
        shape="pill"
        locale="ja"
      />
    </div>
  );
};

export default LoginButton;