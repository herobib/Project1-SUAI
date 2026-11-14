import React, { useEffect, useState } from 'react';

export interface BindField {
  label: string;
  kind: 'axis' | 'button';   // подсказка пользователю: номер оси или номер кнопки
}

interface GamepadBindDialogProps {
  open: boolean;
  fields: BindField[];                 // что настраиваем (объявите массив ВНЕ компонента, чтобы он не пересоздавался)
  value: number[];                     // текущие номера, по одному на каждое поле (-1 = не назначено)
  onSave: (value: number[]) => void;   // вызывается по кнопке "Готово" с массивом номеров
  onClose: () => void;
}

const firstPad = (): Gamepad | null =>
  Array.from(navigator.getGamepads()).find((g): g is Gamepad => g !== null) ?? null;

// '' -> -1 (не назначено), целое >= 0 -> число, всё остальное -> null (ошибка ввода)
const parseDraft = (s: string): number | null => {
  if (s.trim() === '') return -1;
  const n = Number(s);
  return Number.isInteger(n) && n >= 0 ? n : null;
};

export const GamepadBindDialog: React.FC<GamepadBindDialogProps> = ({ open, fields, value, onSave, onClose }) => {
  const [padName, setPadName] = useState<string>('');
  const [axes, setAxes] = useState<number[]>([]);
  const [buttons, setButtons] = useState<number[]>([]);
  const [draft, setDraft] = useState<string[]>([]);

  // При открытии копируем текущие номера в поля ввода
  useEffect(() => {
    if (open) {
      setDraft(fields.map((_, i) => (value[i] !== undefined && value[i] >= 0 ? String(value[i]) : '')));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Живой опрос геймпада, пока окно открыто (~20 раз в секунду)
  useEffect(() => {
    if (!open) return;
    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      if (now - last > 50) {
        last = now;
        const pad = firstPad();
        setPadName(pad ? pad.id : '');
        setAxes(pad ? Array.from(pad.axes) : []);
        setButtons(pad ? pad.buttons.map((b) => b.value) : []);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open]);

  if (!open) return null;

  const parsed = fields.map((_, i) => parseDraft(draft[i] ?? ''));
  const hasError = parsed.some((p) => p === null);

  const handleSave = () => {
    if (hasError) return;
    onSave(parsed as number[]);
    onClose();
  };

  return (
    <div style={S.overlay}>
      <div style={S.panel}>
        <h3 style={S.title}>Привязка геймпада</h3>
        <div style={S.pad}>
          {padName ? padName : 'Геймпад не найден: нажмите кнопку или пошевелите стик'}
        </div>

        <div style={S.sectionTitle}>Оси (axes)</div>
        <div style={S.grid}>
          {axes.map((v, i) => {
            const c = Math.max(-1, Math.min(1, v));
            return (
              <div key={i} style={S.cell}>
                <div style={S.idx}>{i}</div>
                <div style={S.track}>
                  <div style={{ ...S.fill, left: `${50 + Math.min(0, c) * 50}%`, width: `${Math.abs(c) * 50}%` }} />
                </div>
                <div style={S.num}>{v.toFixed(2)}</div>
              </div>
            );
          })}
          {axes.length === 0 && <div style={S.empty}>нет данных</div>}
        </div>

        <div style={S.sectionTitle}>Кнопки (buttons)</div>
        <div style={S.grid}>
          {buttons.map((v, i) => (
            <div key={i} style={{ ...S.cell, ...(v > 0.5 ? S.pressed : null) }}>
              <div style={S.idx}>{i}</div>
              <div style={S.num}>{v.toFixed(1)}</div>
            </div>
          ))}
          {buttons.length === 0 && <div style={S.empty}>нет данных</div>}
        </div>

        <div style={S.sectionTitle}>Назначение (пусто = не назначено)</div>
        {fields.map((f, i) => (
          <label key={i} style={S.row}>
            <span style={S.rowLabel}>
              {f.label} <span style={S.hint}>({f.kind === 'axis' ? 'номер оси' : 'номер кнопки'})</span>
            </span>
            <input
              type="number"
              min={0}
              step={1}
              value={draft[i] ?? ''}
              placeholder="—"
              style={{ ...S.input, ...(parsed[i] === null ? S.inputBad : null) }}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const next = [...draft];
                next[i] = e.target.value;
                setDraft(next);
              }}
            />
          </label>
        ))}

        <div style={S.actions}>
          <button type="button" style={S.btnSecondary} onClick={onClose}>Отмена</button>
          <button type="button" style={{ ...S.btnPrimary, ...(hasError ? S.btnDisabled : null) }} disabled={hasError} onClick={handleSave}>
            Готово
          </button>
        </div>
      </div>
    </div>
  );
};

const S: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 12 },
  panel: { background: '#1a1a1a', color: '#eee', borderRadius: 10, padding: 18, width: 'min(560px, 100%)', maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box' },
  title: { margin: '0 0 6px' },
  pad: { fontSize: 12, color: '#9aa', marginBottom: 12, wordBreak: 'break-word' },
  sectionTitle: { fontSize: 13, fontWeight: 700, margin: '12px 0 6px', color: '#cde' },
  grid: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  cell: { background: '#262626', borderRadius: 6, padding: '4px 6px', minWidth: 74, textAlign: 'center' },
  pressed: { background: '#007aff' },
  idx: { fontSize: 11, color: '#9aa' },
  num: { fontSize: 12, fontVariantNumeric: 'tabular-nums' },
  track: { position: 'relative', height: 6, background: '#444', borderRadius: 3, margin: '4px 0' },
  fill: { position: 'absolute', top: 0, bottom: 0, background: '#4da3ff', borderRadius: 3 },
  empty: { fontSize: 12, color: '#789' },
  row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, margin: '6px 0' },
  rowLabel: { fontSize: 14 },
  hint: { fontSize: 11, color: '#789' },
  input: { width: 70, padding: '6px 8px', borderRadius: 6, border: '1px solid #555', background: '#111', color: '#fff', fontSize: 14 },
  inputBad: { borderColor: '#e5484d' },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 },
  btnPrimary: { background: '#007aff', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer' },
  btnSecondary: { background: '#333', color: '#eee', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer' },
  btnDisabled: { opacity: 0.5, cursor: 'not-allowed' },
};
