import { useEffect, useRef, useState } from 'react';

export function useGamepad(bindsAxes:number[],
  onAxes: (x: number, y: number) => void,
  onCamServo: (angle:number)=>void,
  onCompress: (state:boolean)=>void,
  onManAngles: (angles:number[],horSt:boolean)=>void,
  minCamAngle:number, maxCamAngle:number,
  minAngle1:number,maxAngle1:number,
  minAngle2:number,maxAngle2:number,
  minAngle3:number,maxAngle3:number,
  deadzone = 0.1,
  scale = 1,
) {
  const cbRef = useRef(onAxes);
  useEffect(() => { cbRef.current = onAxes; }, [onAxes]);
  const camRef = useRef(onCamServo);
  useEffect(() => { camRef.current = onCamServo; }, [onCamServo]);
  const compressRef = useRef(onCompress);
  useEffect(() => { compressRef.current = onCompress; }, [onCompress]);
  const manAnglesRef = useRef(onManAngles);
  useEffect(() => { manAnglesRef.current = onManAngles; }, [onManAngles]);

  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let raf = 0;
    let last = { x: 0, y: 0 };
    let Angle1=(maxAngle1-minAngle1)/2+minAngle1;
    let Angle2=(maxAngle2-minAngle2)/2+minAngle2;
    let Angle3=(maxAngle3-minAngle3)/2+minAngle3;
    let lastCam=0;
    let wasConnected=false;
    let lastcompress=false;
    let horizontal=false;
    let lasthor=false;
    
    

    const tick = () => {
      const pad = Array.from(navigator.getGamepads()).find(p => p && p.connected);
      const isConnected = !!pad;
      if (isConnected !== wasConnected) {
        wasConnected = isConnected;
        setConnected(isConnected);
        if (!isConnected && (last.x !== 0 || last.y !== 0)) {
          last = { x: 0, y: 0 };
          cbRef.current(0, 0);
        }
      }

      if (pad) {
        let x = pad.axes[bindsAxes[0]] ?? 0;
        let y = -(pad.axes[bindsAxes[1]] ?? 0);
        let cam=-(pad.axes[bindsAxes[2]] ?? 0);
        let compress=pad.buttons[bindsAxes[3]].pressed??0;
        let BY=pad.buttons[bindsAxes[7]].pressed??0;
        let BA=pad.buttons[bindsAxes[8]].pressed??0;
        let BX=pad.buttons[bindsAxes[10]].pressed??0;
        let BB=pad.buttons[bindsAxes[9]].pressed??0;
        let BR1=pad.buttons[bindsAxes[5]].pressed??0;
        let BL1=pad.buttons[bindsAxes[6]].pressed??0;
        let Bhor=pad.buttons[bindsAxes[4]].pressed??0;

        if (Math.hypot(x, y) < deadzone) { x = 0; y = 0; }
        x = Math.round(x * scale * 100) / 100;
        y = Math.round(y * scale * 100) / 100;
        if (x !== last.x || y !== last.y){
          last = { x, y };
          cbRef.current(x, y);
        }
        if(lastCam!=cam){
          lastCam=cam;
          camRef.current(Math.round((cam+1)*(maxCamAngle-minCamAngle)/2+minCamAngle));
        }
        if(lastcompress!=compress){
          lastcompress=compress;
          compressRef.current(compress);
        }
        if(Bhor!=lasthor){
          if(Bhor){ 
            horizontal=(!horizontal);
            manAnglesRef.current([Angle1,Angle2,Angle3],horizontal);
          }
          lasthor=Bhor;
          
        }
        if(BY){
        if(Angle1+1<=maxAngle1){
          if(horizontal){
            let a3=360-minAngle1-Angle1-1-minAngle2-Angle2-minAngle3;
            if (a3 >= minAngle3 && a3 <= maxAngle3) {
              Angle1+=1;
              Angle3=a3;
              manAnglesRef.current([Angle1,Angle2,Angle3],horizontal);
            }
          }
          else {
            Angle1+=1;
            manAnglesRef.current([Angle1,Angle2,Angle3],horizontal);
          }
        }
        }
        else if(BA){
          if(Angle1-1>=minAngle1){
            if(horizontal){
              let a3=360-minAngle1-Angle1+1-minAngle2-Angle2-minAngle3;
              if (a3 >= minAngle3 && a3 <= maxAngle3) {
                Angle1-=1;
                Angle3=a3;
                manAnglesRef.current([Angle1,Angle2,Angle3],horizontal);
              }
            } else{
              Angle1-=1;
              manAnglesRef.current([Angle1,Angle2,Angle3],horizontal);
            }
          }
        }
        if(BX){
          if(Angle2-1>=minAngle2){
            if(horizontal){
              let a3=360-minAngle1-Angle1+1-minAngle2-Angle2-minAngle3;
              if (a3 >= minAngle3 && a3 <= maxAngle3) {
                Angle2-=1;
                Angle3=a3;
                manAnglesRef.current([Angle1,Angle2,Angle3],horizontal);
              }
            } else{
              Angle2-=1;
              manAnglesRef.current([Angle1,Angle2,Angle3],horizontal);
            }
          }
        }
        else if(BB){
          if(Angle2+1<=maxAngle2){
            if(horizontal){
              let a3=360-minAngle1-Angle1-1-minAngle2-Angle2-minAngle3;
              if (a3 >= minAngle3 && a3 <= maxAngle3) {
                Angle2+=1;
                Angle3=a3;
                manAnglesRef.current([Angle1,Angle2,Angle3],horizontal);
              }
            } else{
              Angle2+=1;
              manAnglesRef.current([Angle1,Angle2,Angle3],horizontal);
            }
          }
        }
        if(BR1){
          if(Angle3+1<=maxAngle3 && !horizontal){
            Angle3+=1;
            manAnglesRef.current([Angle1,Angle2,Angle3],horizontal);
          }
        }
        else if(BL1){
          if(Angle3-1>=minAngle3 && !horizontal){
            Angle3-=1;
            manAnglesRef.current([Angle1,Angle2,Angle3],horizontal);
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [deadzone, scale]);

  return connected;
}