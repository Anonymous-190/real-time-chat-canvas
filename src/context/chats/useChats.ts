
import { useContext } from 'react';
import { ChatsContext } from './ChatsProvider';

export const useChats = () => {
  const context = useContext(ChatsContext);
  if (context === undefined) {
    throw new Error('useChats must be used within a ChatsProvider');
  }
  return context;
};
