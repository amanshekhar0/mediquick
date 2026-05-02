import { io } from 'socket.io-client';
import { getSocketOrigin } from './config';

let socket;

export const getSocket = () => {
  if (!socket) {
    socket = io(getSocketOrigin(), {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
