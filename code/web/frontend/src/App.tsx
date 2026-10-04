import { useEffect, useState, useRef } from 'react'
import { Dropdown } from './Dropdown.tsx';
import { JoistikComponent } from './Joistik.tsx'
import { CameraStream } from './CameraStream.tsx';
import type { IJoystickUpdateEvent } from 'react-joystick-component/build/lib/Joystick';

import './App.css'
// interface DropdownProps {
//   options: string[];
//   onSelect: (option: string) => void;
// }


function App() {
  const modes = {'Пусто':'0','Ковш':'1', 'Камера':'2', 'Радар':'3', 'Манипулятор':'4'};

  const ModuleSelect1 = (selectedMode: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const command = JSON.stringify({ action: 'drop1', value: modes[selectedMode as keyof typeof modes] });
      wsRef.current.send(command);
      console.log('Отправлена команда:', command);
    }
    console.log('1, режим:', modes[selectedMode as keyof typeof modes]);
  };
  const ModuleSelect2 = (selectedMode: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const command = JSON.stringify({ action: 'drop2', value: modes[selectedMode as keyof typeof modes] });
      wsRef.current.send(command);
      console.log('Отправлена команда:', command);
    }
    console.log('2, режим:', modes[selectedMode as keyof typeof modes]);
  };

  const ModuleSelect3 = (selectedMode: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const command = JSON.stringify({ action: 'drop3', value: modes[selectedMode as keyof typeof modes] });
      wsRef.current.send(command);
      console.log('Отправлена команда:', command);
    }
    console.log('3, режим:', modes[selectedMode as keyof typeof modes]);
  };
  const ModuleSelect4 = (selectedMode: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const command = JSON.stringify({ action: 'drop4', value: modes[selectedMode as keyof typeof modes] });
      wsRef.current.send(command);
      console.log('Отправлена команда:', command);
    }
    console.log('4, режим:', modes[selectedMode as keyof typeof modes]);
  };
  const ModuleSelect5 = (selectedMode: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const command = JSON.stringify({ action: 'drop5', value: modes[selectedMode as keyof typeof modes] });
      wsRef.current.send(command);
      console.log('Отправлена команда:', command);
    }
    console.log('5, режим:', modes[selectedMode as keyof typeof modes]);
  };
  
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [latestFrame, setLatestFrame] = useState<Blob | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [coordinates, setCoordinates] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Инициализируем ОДИН сокет для всего приложения
    const ws = new WebSocket('ws://192.168.4.1/ws');
    wsRef.current = ws;
    ws.binaryType = 'blob'; // Важно для приема кадров

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);

    ws.onmessage = (event) => {
      // 1. РАСПРЕДЕЛЯЕМ ДАННЫЕ: Если пришел бинарник — это кадр камеры
      if (event.data instanceof Blob) {
        setLatestFrame(event.data);
      } 
      // 2. Если пришел текст — это данные с ESP32
      else {
        try {
          const data = JSON.parse(event.data);
          
        } catch (e) {
          console.log('Получен не JSON текст:', event.data);
        }
      }
    };

    return () => ws.close();
  }, []);

  const handleJoystickMove = (event: IJoystickUpdateEvent) => {
    if (event.x !== null && event.y !== null) {
      setCoordinates({
        x: event.x,
        y: event.y,
      });
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const command = JSON.stringify({ action: 'joistik', x: event.x, y: event.y});
      wsRef.current.send(command);
      console.log('Отправлена команда:', command);
    }
      console.log(`X: ${event.x}, Y: ${event.y}`);
    }
  };

  // Функция срабатывает, когда отпускаем джойстик
  const handleJoystickStop = () => {
    setCoordinates({ x: 0, y: 0 });
  };

  return (
    <>
     <div>
      <div className="header">
        <div className="changeTool">
          <p className="textfont">модуль 1:</p>
          <Dropdown options={Object.keys(modes)} onSelect={ModuleSelect1} />
        </div>
        <div className="changeTool">
          <p className="textfont">модуль 2:</p>
          <Dropdown options={Object.keys(modes)} onSelect={ModuleSelect2} />
        </div>
        <div className="changeTool">
          <p className="textfont">модуль 3:</p>
          <Dropdown options={Object.keys(modes)} onSelect={ModuleSelect3} />
        </div>
        <div className="changeTool">
          <p className="textfont">модуль 4:</p>
          <Dropdown options={Object.keys(modes)} onSelect={ModuleSelect4} />
        </div>
        <div className="changeTool">
          <p className="textfont">модуль 5:</p>
          <Dropdown options={Object.keys(modes)} onSelect={ModuleSelect5} />
        </div>
      </div>
      <div className="mainDiv">
        <div className="cameraDiv">
          <CameraStream frame={latestFrame} isLive={isConnected}/>
        </div>
        <div className="joistikDiv">
          <div style={{marginBottom: '40px', textAlign: 'center', fontSize: '18px' }}>
          </div>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center',
             margin: '20px', padding: '15px', background: '#1a1a1a',
             borderRadius: '50%' }}>
            <JoistikComponent 
              onMove={handleJoystickMove} 
              onStop={handleJoystickStop} 
            />
          </div>
        </div>
      </div>
     </div>
    </>
  )
}


export default App