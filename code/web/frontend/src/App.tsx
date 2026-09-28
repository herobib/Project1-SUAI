import { useState } from 'react'
import { Dropdown } from './Dropdown.tsx';
import './App.css'
interface DropdownProps {
  options: string[];
  onSelect: (option: string) => void;
}


function App() {

  const modes = ['Ковш', 'Камера', 'Радар', 'Манипулятор'];

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

        </div>
      </div>
     </div>
    </>
  )
}


export default App