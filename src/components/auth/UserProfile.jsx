import React from 'react';
import { useAuth } from '../../hooks/useAuth';

const UserProfile = () => {
  const { user, handleLogout } = useAuth();

  if (!user) return null;

  return (
    <div className="flex items-center space-x-2">
      {user.picture && (
        <img 
          src={user.picture} 
          alt={user.name} 
          className="w-8 h-8 rounded-full" 
        />
      )}
      <div className="text-sm">
        <p className="font-medium">{user.name}</p>
        <button 
          onClick={handleLogout}
          className="text-xs text-blue-200 hover:text-white"
        >
          ログアウト
        </button>
      </div>
    </div>
  );
};

export default UserProfile;