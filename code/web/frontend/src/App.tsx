import { useEffect, useState, useRef } from 'react'
import { Dropdown } from './Dropdown.tsx';
import { JoistikComponent } from './Joistik.tsx'
import { CameraStream } from './CameraStream.tsx';
import type { IJoystickUpdateEvent } from 'react-joystick-component/build/lib/Joystick';
import { ensureHuffman } from './huffman.ts'
import { useGamepad } from './useGamepad.ts'
import { GamepadBindDialog, type BindField } from './GamepadBindDialog';

const BIND_FIELDS: BindField[] = [
  { label: 'Правый стик право/лево', kind: 'axis' },
  { label: 'Правый стик вверх/вниз', kind: 'axis' },
  { label: 'Левый стик вверх/вниз', kind: 'axis' },
  { label: 'R2 (сжать):', kind: 'button' },
  { label: 'L2 (режим горизонталь):', kind: 'button' },
  { label: 'R1 (клешня наверх):', kind: 'button' },
  { label: 'L1 (клешня вниз):', kind: 'button' },
  { label: 'Y (первое колено вверх):', kind: 'button' },
  { label: 'A (первое колено вниз):', kind: 'button' },
  { label: 'B (второе колено вверх):', kind: 'button' },
  { label: 'X (второе колено вниз):', kind: 'button' },
];

import './App.css'

function App() {
  const MaxAngle1=180
  const MinAngle1=0
  const MaxAngle2=180
  const MinAngle2=0
  const MaxAngle3=180
  const MinAngle3=0
  const MinCamAngle=0
  const MaxCamAngle=270

  const modes = {'Пусто':'0','Ковш':'1', 'Манипулятор':'2'};

  const SendModule=(id:number, selectedMode:string)=>{
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const command = JSON.stringify({ action: `drop${id+1}`, value: modes[selectedMode as keyof typeof modes] });
      wsRef.current.send(command);
      console.log('Отправлена команда:', command);
    }
    if(selectedMode=='Манипулятор'){
        setManipulatorConnected(prevState => {
          const newState = [...prevState];
          newState[id] = true;
          return newState;
        });
      }
      else{
        setManipulatorConnected(prevState => {
          const newState = [...prevState];
          newState[id] = false;
          return newState;
        });
      };
    console.log(`${id+1}, режим:`, modes[selectedMode as keyof typeof modes]);
  }

  const ModuleSelect1 = (selectedMode: string) => {
    SendModule(0,selectedMode);
  };
  const ModuleSelect2 = (selectedMode: string) => {
    SendModule(1,selectedMode);
  };
  
  const ModuleSelect3 = (selectedMode: string) => {
    SendModule(2,selectedMode);
  };
  const ModuleSelect4 = (selectedMode: string) => {
    SendModule(3,selectedMode);
  };
  const ModuleSelect5 = (selectedMode: string) => {
    SendModule(4,selectedMode);
  };
    
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [latestFrame, setLatestFrame] = useState<Blob | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [coordinates, setCoordinates] = useState({ x: 0, y: 0 });
  const [manipulatorConnected,setManipulatorConnected]= useState<boolean[]>([false,false,false,false,false]);
  const [manAngle1,SetManAngle1]=useState<number>((MaxAngle1-MinAngle1)/2);
  const [manAngle2,SetManAngle2]=useState<number>((MaxAngle2-MinAngle2)/2);
  const [manAngle3,SetManAngle3]=useState<number>((MaxAngle3-MinAngle3)/2);
  const [camAngle,SetCamAngle]=useState<number>((MaxCamAngle-MinCamAngle)/2);
  const [horizontalEnState,SetHorizontalState]=useState<boolean>(false);
  const [compressState,SetCompressState]=useState<boolean>(false);
  const [bindingMode,Setbindingmode]=useState<boolean>(false);
  

  useEffect(() => {
    const ws = new WebSocket(`ws://${location.host}/camera_ws`);
  wsRef.current = ws;
  ws.binaryType = 'arraybuffer';
  ws.onopen = () => {
    setIsConnected(true);
    ws.send(JSON.stringify({ type: 'set_camera_enabled', enabled: true }));
  };
   ws.onmessage = e => console.log(e.data.byteLength ?? e.data);
  ws.onclose = () => setIsConnected(false);

  ws.onmessage = (event) => {
    if (!(event.data instanceof ArrayBuffer)) return;
    const buf = event.data;
    const HEADER = 16;
    if (buf.byteLength <= HEADER) return;
    const dv = new DataView(buf);
    if (dv.getUint8(0) !== 0x43 || dv.getUint8(1) !== 1) return;
    const len = dv.getUint32(4, true);
    if (len + HEADER !== buf.byteLength) return;
    const jpeg = ensureHuffman(new Uint8Array(buf, HEADER, len));
    setLatestFrame(new Blob([jpeg as BlobPart], { type: 'image/jpeg' }));
  };
  return () => ws.close();
}, []);

useEffect(() => {
  let raf = 0, lastSent = 0, lx = 0, ly = 0;
  const tick = (now: number) => {
    const pad = Array.from(navigator.getGamepads()).find((g): g is Gamepad => g !== null);
    if (pad && !bindOpenRef.current) {                 // пока окно открыто, робота не двигаем
      const [ix, iy] = bindsRef.current;
      const dz = (v: number) => (Math.abs(v) < 0.08 ? 0 : v);
      const x = ix >= 0 ? dz(pad.axes[ix] ?? 0) : 0;
      const y = iy >= 0 ? -dz(pad.axes[iy] ?? 0) : 0;  // у геймпада "вверх" = -1, у вашего джойстика +1
      if ((Math.abs(x - lx) > 0.02 || Math.abs(y - ly) > 0.02) && now - lastSent >= 50) {
        lx = x; ly = y; lastSent = now;
        sendJoystick(x, y);
      }
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
  }, []);

  const [bindOpen, setBindOpen] = useState(false);
  const [binds, setBinds] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem('gamepad-binds') ?? '') as number[]; }
    catch { return [0, 1]; }
  });
  const bindsRef = useRef(binds);
  const bindOpenRef = useRef(bindOpen);
  useEffect(() => { bindsRef.current = binds; }, [binds]);
  useEffect(() => { bindOpenRef.current = bindOpen; }, [bindOpen]);

  const saveBinds = (v: number[]) => {
    setBinds(v);
    console.log(v);
    try { localStorage.setItem('gamepad-binds', JSON.stringify(v)); } catch { /* не критично */ }
  };


  const handleJoystickMove = (event: IJoystickUpdateEvent) => {
    if (event.x !== null && event.y !== null) sendJoystick(event.x, event.y);
    console.log(`X: ${event.x}, Y: ${event.y}`);
  };

  const handleJoystickStop = () => {
    setCoordinates({ x: 0, y: 0 });
    sendJoystick(0, 0);
  };

  const sendJoystick = (x: number, y: number) => {
    setCoordinates({ x, y });
     if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const command = JSON.stringify({ action: 'joistik', x: x , y: y});
      wsRef.current.send(command);
      console.log('Отправлена команда:', command);
    }
    console.log(`X: ${x}, Y: ${y}`);
  };

  const SendCamAngle = (angle: number) => {
    SetCamAngle(angle);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const command = JSON.stringify({ action: 'cam', angle:camAngle});
      wsRef.current.send(command);
      console.log('Отправлена команда:', command);
    }
    console.log(`CamAngle: ${camAngle}`);
  };

  const SendCompress = (state: boolean) => {
    SetCompressState(state);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const command = JSON.stringify({ action: 'compress', state:compressState});
      wsRef.current.send(command);
      console.log('Отправлена команда:', command);
    }
    console.log(`comperss click: ${compressState}`);
  };
  const SendAngles=(angles:number[],horSt:boolean)=>{
    SetHorizontalState(horSt);
    SetManAngle1(angles[0]);
    SetManAngle2(angles[1]);
    SetManAngle3(angles[2]);
    SendSocketAngles();
    console.log(angles)
  }
  const SendSocketAngles=()=>{
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      let command = JSON.stringify({ action: 'man', angle1:manAngle1,angle2:manAngle2,angle3:manAngle3});
      wsRef.current.send(command);
      console.log('Отправлены углы', manAngle1,manAngle2,manAngle3);
    }
  }

  const gamepadConnected = useGamepad(binds,sendJoystick,SendCamAngle,SendCompress,SendAngles,MinCamAngle,MaxCamAngle,MinAngle1,MaxAngle1,MinAngle2,MaxAngle2,MinAngle3,MaxAngle3);

  const manAngle1Handler = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.valueAsNumber;
    if(horizontalEnState){
      const a3=360-MinAngle1-nextValue-MinAngle2-manAngle2-MinAngle3;
      if (a3 >= MinAngle3 && a3 <= MaxAngle3) {
        SetManAngle3(a3);
        SetManAngle1(nextValue);
      } else {
        event.target.value = String(manAngle1);
      }
    }
    else{
      SetManAngle1(event.target.valueAsNumber);
    }
    SendSocketAngles();
  };

  const manAngle2Handler = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.valueAsNumber;
    if(horizontalEnState){
      const a3=360-MinAngle1-manAngle1-MinAngle2-nextValue-MinAngle3;
      if (a3 >= MinAngle3 && a3 <= MaxAngle3) {
        SetManAngle3(a3);
        SetManAngle2(nextValue);
      } else {
        event.target.value = String(manAngle2);
      }
    }
    else{
      SetManAngle2(event.target.valueAsNumber);
    }
    SendSocketAngles();
  };

  const manAngle3Handler = (event: React.ChangeEvent<HTMLInputElement>) => {
    SetManAngle3(event.target.valueAsNumber);
    SendSocketAngles();
  };

  const camAngleHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    SendCamAngle(event.target.valueAsNumber);
  };

  const horizontalEnStatehandler=(event: React.ChangeEvent<HTMLInputElement>) => {
    SetHorizontalState(event.target.checked)
    console.log("horizontal press")
  };
  const compressStatehandler=() => {
    SendCompress(!compressState)
  };
  
  return (
    <>
     <div>
      <div className="header">
        <div className="StatusBar">
          <p className="statusText">Status: {isConnected ? 'connected' : 'disconnected'}</p>
          <p className="statusText">Gamepad: {gamepadConnected ? 'connected' : 'disconnected'}</p>
          <p className="statusText">Горизонталь: {horizontalEnState?'вкл':'выкл'}</p>
          <button onClick={() => { sendJoystick(0, 0); setBindOpen(true); }} className="statusText" style={{height:'10px', padding:'0px', marginLeft:'5px'}}>Бинд геймпада</button>
            <GamepadBindDialog
              open={bindOpen}
              fields={BIND_FIELDS}
              value={binds}
              onSave={saveBinds}
              onClose={() => setBindOpen(false)}
            />
        </div>
        <div className="ToolBar">
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
      </div>
      <div className="mainDiv">
        {(manipulatorConnected.some((v)=> v)&& !gamepadConnected) ? 
        <div className="manipulatorDiv">
          <div className="manipulatorControl">
            <div style={{margin:'10px',minWidth:'30px'}}>
              <input value={manAngle1} onChange={manAngle1Handler} className="range" type="range" min={MinAngle1} max={MaxAngle1}/>
              <p style={{color:'black', fontSize:'18px'}}>{manAngle1}</p>
            </div>
            <div style={{margin:'10px',minWidth:'30px'}}>
              <input value={manAngle2} onChange={manAngle2Handler} className="range" type="range" min={MinAngle2} max={MaxAngle2}/>
              <p style={{color:'black', fontSize:'18px'}}>{manAngle2}</p>
            </div>
            <div style={{margin:'10px',minWidth:'30px'}}>
              <input value={manAngle3} onChange={manAngle3Handler}className="range" type="range" min={MinAngle3} max={MaxAngle3} disabled={horizontalEnState}/>
              <p style={{color:'black', fontSize:'18px'}}>{manAngle3}</p>
            </div>
          </div>
          <div className="manipulatorFeacheDiv">
            <div style={{display:'flex', flexDirection:'row'}}>
              <input checked={horizontalEnState} onChange={horizontalEnStatehandler} type="checkbox"/>
              <p style={{color:'black', fontSize:'15px'}}>Горизонталь</p>
            </div>  
            <button className='compressButton' onClick={compressStatehandler}>{!compressState ? "Сжать":"Разжать"}
            </button>         
          </div>
        </div>
        :null}

        <div className="cameraDiv">
          {gamepadConnected ==false ? 
          <input value={camAngle} onChange={camAngleHandler} type="range" className="range" style={{minWidth:"30px"}} min={MinCamAngle} max={MaxCamAngle}  />
          :null}
          <CameraStream frame={latestFrame} isLive={isConnected}/>
        </div>

        {gamepadConnected ==false ? 
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
      :null}
      </div>
     </div>
    </>
  )
}

export default App