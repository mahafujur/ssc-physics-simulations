'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Sim3D from '@/components/Sim3D';
import { SIM_DEFS } from '@/lib/sims';
import { B } from '@/data/chapters';

export default function SimView({ ch }) {
  const def = SIM_DEFS[ch.sim];
  const init = useMemo(() => {
    const o = { fire: 0, flip: 0 };
    (def?.controls || []).forEach((c) => (o[c.k] = c.def));
    return o;
  }, [ch.sim]); // eslint-disable-line

  const [params, setParams] = useState(init);
  const paramsRef = useRef(params);
  paramsRef.current = params;
  useEffect(() => setParams(init), [init]);

  if (!def) return <div style={{ padding: '2rem', color: '#8fc8a8' }}>সিমুলেশন লোড হচ্ছে…</div>;

  return (
    <div className="sim-wrap" style={{ '--h': ch.hue }}>
      <div className="stage">
        <Sim3D simKey={ch.sim} hue={ch.hue} paramsRef={paramsRef} fill />
        <div className="ohint">👆 এক আঙুলে ঘোরাও · দুই আঙুলে জুম করো</div>
        <div className="reads">
          {def.readouts(params).map((r, i) => (
            <div className="r" key={i}>{r}</div>
          ))}
        </div>
      </div>
      <div className="panel" style={{ '--h': ch.hue }}>
        <h2>{ch.simTitle}</h2>
        <p>{ch.simDesc}</p>
        <span className="formula">সূত্র: {ch.formula}</span>
        <div className="ctrls">
          {def.controls.map((c) => (
            <div className="ctrl" key={c.k}>
              <label>
                <span>{c.label}</span>
                <span className="v">{B(params[c.k], 2)}{c.unit ? ' ' + c.unit : ''}</span>
              </label>
              <input
                type="range" min={c.min} max={c.max} step={c.step} value={params[c.k]}
                onChange={(e) => setParams((p) => ({ ...p, [c.k]: parseFloat(e.target.value) }))}
                aria-label={c.label}
              />
            </div>
          ))}
          {(def.actions || []).map((a) => (
            <div className="ctrl" key={a.k}>
              <button className="abtn" onClick={() => setParams((p) => ({ ...p, [a.k]: (p[a.k] || 0) + 1 }))}>
                {a.label}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
