// JOISTIK.tsx
import React from 'react';
import { Joystick } from 'react-joystick-component';
import type { IJoystickUpdateEvent } from 'react-joystick-component/build/lib/Joystick';

// Описываем типы для пропсов, чтобы передавать данные в родительский компонент
interface JoistikProps {
  onMove: (event: IJoystickUpdateEvent) => void;
  onStop: () => void;
}

export const JoistikComponent: React.FC<JoistikProps> = ({ onMove, onStop }) => {
  return (
    <Joystick 
      size={120} 
      baseColor="#333333" 
      stickColor="#007aff" 
      move={onMove} 
      stop={onStop} 
    />
  );
};
