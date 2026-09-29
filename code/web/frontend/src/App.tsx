import { useState } from 'react'
import { Dropdown } from './Dropdown.tsx';
import { JoistikComponent } from './Joistik.tsx'
import type { IJoystickUpdateEvent } from 'react-joystick-component/build/lib/Joystick';

import './App.css'
// interface DropdownProps {
//   options: string[];
//   onSelect: (option: string) => void;
// }


function App() {

  const modes = ['Пусто','Ковш', 'Камера', 'Радар', 'Манипулятор'];

  const ModuleSelect1 = (selectedMode: string) => {
    console.log('Выбран режим:', selectedMode);
  };
  const ModuleSelect2 = (selectedMode: string) => {
    console.log('Выбран режим:', selectedMode);
  };

  const ModuleSelect3 = (selectedMode: string) => {
    console.log('Выбран режим:', selectedMode);
  };
  const ModuleSelect4 = (selectedMode: string) => {
    console.log('Выбран режим:', selectedMode);
  };
  const ModuleSelect5 = (selectedMode: string) => {
    console.log('Выбран режим:', selectedMode);
  };
  

  const [coordinates, setCoordinates] = useState({ x: 0, y: 0 });
  const [direction, setDirection] = useState<string | null>('FORWARD');

  // Функция срабатывает при каждом движении джойстика
  const handleJoystickMove = (event: IJoystickUpdateEvent) => {
    if (event.x !== null && event.y !== null) {
      // Округляем значения для красоты вывода
      setCoordinates({
        x: Math.round(event.x),
        y: Math.round(event.y),
      });
      console.log(`X: ${event.x}, Y: ${event.y}`);
    }
    setDirection(event.direction);
  };

  // Функция срабатывает, когда отпускаем джойстик
  const handleJoystickStop = () => {
    setCoordinates({ x: 0, y: 0 });
    setDirection('STOPPED');
  };

  return (
    <>
     <div>
      <div className="header">
        <div className="changeTool">
          <p className="textfont">модуль 1:</p>
          <Dropdown options={modes} onSelect={ModuleSelect1} />
        </div>
        <div className="changeTool">
          <p className="textfont">модуль 2:</p>
          <Dropdown options={modes} onSelect={ModuleSelect2} />
        </div>
        <div className="changeTool">
          <p className="textfont">модуль 3:</p>
          <Dropdown options={modes} onSelect={ModuleSelect3} />
        </div>
        <div className="changeTool">
          <p className="textfont">модуль 4:</p>
          <Dropdown options={modes} onSelect={ModuleSelect4} />
        </div>
        <div className="changeTool">
          <p className="textfont">модуль 5:</p>
          <Dropdown options={modes} onSelect={ModuleSelect5} />
        </div>
      </div>
      <div className="mainDiv">
        <div className="cameraDiv">
          <div className="alacamera">
          </div>
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