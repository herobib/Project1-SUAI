import React, { useEffect, useRef } from 'react';

interface CameraStreamProps {
  frame: Blob | null;
  isLive: boolean;
}

export const CameraStream: React.FC<CameraStreamProps> = ({ frame, isLive }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // Если кадра нет — ничего не делаем
    if (!frame) return;

    const img = new Image();
    
    img.onload = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
      }
      URL.revokeObjectURL(img.src); // Очищаем память
    };

    img.src = URL.createObjectURL(frame);
  }, [frame]); // Эффект срабатывает КАЖДЫЙ РАЗ, когда прилетает новый кадр

  return (
    
    <div style={{ textAlign: 'center',
    width: '100%', 
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box'}}>
      <div>
        {isLive ? <span style={{ color: 'green' }}>● LIVE</span> : <span style={{ color: 'red' }}>● DISCONNECTED</span>}
      </div>
      <canvas 
        ref={canvasRef}      
        style={{ 
          width: '100%', 
          maxWidth: '450px', 
          backgroundColor: '#222', 
          borderRadius: '8px',
          height:'100%'
        }} 
      />
    </div>
  );
};