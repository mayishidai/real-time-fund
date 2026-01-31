'use client';

import { useEffect, useRef, useState } from 'react';

function PlusIcon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function TrashIcon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
      <path d="M3 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 6l1-2h6l1 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 6l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SettingsIcon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      <path d="M19.4 15a7.97 7.97 0 0 0 .1-2l2-1.5-2-3.5-2.3.5a8.02 8.02 0 0 0-1.7-1l-.4-2.3h-4l-.4 2.3a8.02 8.02 0 0 0-1.7 1l-2.3-.5-2 3.5 2 1.5a7.97 7.97 0 0 0 .1 2l-2 1.5 2 3.5 2.3-.5a8.02 8.02 0 0 0 1.7 1l.4 2.3h4l.4-2.3a8.02 8.02 0 0 0 1.7-1l2.3.5 2-3.5-2-1.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RefreshIcon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
      <path d="M4 12a8 8 0 0 1 12.5-6.9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 5h3v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 12a8 8 0 0 1-12.5 6.9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 19H5v-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Stat({ label, value, delta }) {
  const dir = delta > 0 ? 'up' : delta < 0 ? 'down' : '';
  return (
    <div className="stat">
      <span className="label">{label}</span>
      <span className={`value ${dir}`}>{value}</span>
      {typeof delta === 'number' && (
        <span className={`badge ${dir}`}>
          {delta > 0 ? '↗' : delta < 0 ? '↘' : '—'} {Math.abs(delta).toFixed(2)}%
        </span>
      )}
    </div>
  );
}

export default function HomePage() {
  const [funds, setFunds] = useState([]);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const timerRef = useRef(null);
  const [refreshMs, setRefreshMs] = useState(30000);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tempSeconds, setTempSeconds] = useState(30);
  const [manualRefreshing, setManualRefreshing] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('funds') || '[]');
      if (Array.isArray(saved) && saved.length) {
        setFunds(saved);
        refreshAll(saved.map((f) => f.code));
      }
      const savedMs = parseInt(localStorage.getItem('refreshMs') || '30000', 10);
      if (Number.isFinite(savedMs) && savedMs > 0) {
        setRefreshMs(savedMs);
        setTempSeconds(Math.round(savedMs / 1000));
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const codes = funds.map((f) => f.code);
      if (codes.length) refreshAll(codes);
    }, refreshMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [funds, refreshMs]);

  const refreshAll = async (codes) => {
    try {
      const updated = await Promise.all(
        codes.map(async (c) => {
          const res = await fetch(`/api/fund?code=${encodeURIComponent(c)}`, { cache: 'no-store' });
          if (!res.ok) throw new Error('网络错误');
          const data = await res.json();
          return data;
        })
      );
      setFunds(updated);
      localStorage.setItem('funds', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const addFund = async (e) => {
    e.preventDefault();
    setError('');
    const clean = code.trim();
    if (!clean) {
      setError('请输入基金编号');
      return;
    }
    if (funds.some((f) => f.code === clean)) {
      setError('该基金已添加');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/fund?code=${encodeURIComponent(clean)}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('基金未找到或接口异常');
      const data = await res.json();
      const next = [data, ...funds];
      setFunds(next);
      localStorage.setItem('funds', JSON.stringify(next));
      setCode('');
    } catch (e) {
      setError(e.message || '添加失败');
    } finally {
      setLoading(false);
    }
  };

  const removeFund = (removeCode) => {
    const next = funds.filter((f) => f.code !== removeCode);
    setFunds(next);
    localStorage.setItem('funds', JSON.stringify(next));
  };

  const manualRefresh = async () => {
    if (manualRefreshing) return;
    const codes = funds.map((f) => f.code);
    if (!codes.length) return;
    setManualRefreshing(true);
    try {
      await refreshAll(codes);
    } finally {
      setManualRefreshing(false);
    }
  };

  const saveSettings = (e) => {
    e?.preventDefault?.();
    const ms = Math.max(5, Number(tempSeconds)) * 1000;
    setRefreshMs(ms);
    localStorage.setItem('refreshMs', String(ms));
    setSettingsOpen(false);
  };

  useEffect(() => {
    const onKey = (ev) => {
      if (ev.key === 'Escape' && settingsOpen) setSettingsOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [settingsOpen]);

  return (
    <div className="container content">
      <div className="navbar glass">
        <div className="brand">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="var(--accent)" strokeWidth="2" />
            <path d="M5 14c2-4 7-6 14-5" stroke="var(--primary)" strokeWidth="2" />
          </svg>
          <span>实时基金估值</span>
        </div>
        <div className="actions">
          <div className="badge" title="当前刷新频率">
            <span>刷新</span>
            <strong>{Math.round(refreshMs / 1000)}秒</strong>
          </div>
          <button
            className="icon-button"
            aria-label="立即刷新"
            onClick={manualRefresh}
            disabled={manualRefreshing || funds.length === 0}
            aria-busy={manualRefreshing}
            title="立即刷新"
          >
            <RefreshIcon className={manualRefreshing ? 'spin' : ''} width="18" height="18" />
          </button>
          <button
            className="icon-button"
            aria-label="打开设置"
            onClick={() => setSettingsOpen(true)}
            title="设置"
          >
            <SettingsIcon width="18" height="18" />
          </button>
        </div>
      </div>

      <div className="grid">
        <div className="col-12 glass card" role="region" aria-label="添加基金">
          <div className="title" style={{ marginBottom: 12 }}>
            <PlusIcon width="20" height="20" />
            <span>添加基金</span>
            <span className="muted">输入基金编号（例如：110022）</span>
          </div>
          <form className="form" onSubmit={addFund}>
            <label htmlFor="fund-code" className="muted" style={{ position: 'absolute', left: -9999 }}>
              基金编号
            </label>
            <input
              id="fund-code"
              className="input"
              placeholder="基金编号"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              aria-invalid={!!error}
            />
            <button className="button" type="submit" disabled={loading} aria-busy={loading}>
              {loading ? '添加中…' : '添加'}
            </button>
          </form>
          {error && <div className="muted" role="alert" style={{ marginTop: 8, color: 'var(--danger)' }}>{error}</div>}
        </div>

        <div className="col-12">
          {funds.length === 0 ? (
            <div className="glass card empty">尚未添加基金</div>
          ) : (
            <div className="grid">
              {funds.map((f) => (
                <div key={f.code} className="col-6">
                  <div className="glass card" role="article" aria-label={`${f.name} 基金信息`}>
                    <div className="row" style={{ marginBottom: 10 }}>
                      <div className="title">
                        <span>{f.name}</span>
                        <span className="muted">#{f.code}</span>
                      </div>
                      <div className="actions">
                        <div className="badge">
                          <span>估值时间</span>
                          <strong>{f.gztime || f.time || '-'}</strong>
                        </div>
                        <button
                          className="icon-button danger"
                          aria-label={`删除基金 ${f.code}`}
                          onClick={() => removeFund(f.code)}
                          title="删除"
                        >
                          <TrashIcon width="18" height="18" />
                        </button>
                      </div>
                    </div>
                    <div className="row" style={{ marginBottom: 12 }}>
                      <Stat label="单位净值" value={f.dwjz ?? '—'} />
                      <Stat label="估值净值" value={f.gsz ?? '—'} />
                      <Stat label="涨跌幅" value={typeof f.gszzl === 'number' ? `${f.gszzl.toFixed(2)}%` : f.gszzl ?? '—'} delta={Number(f.gszzl) || 0} />
                    </div>
                    <div style={{ marginBottom: 8 }} className="title">
                      <span>前10重仓股票</span>
                      <span className="muted">持仓占比</span>
                    </div>
                    {Array.isArray(f.holdings) && f.holdings.length ? (
                      <div className="list" role="list">
                        {f.holdings.map((h, idx) => (
                          <div className="item" role="listitem" key={idx}>
                            <span className="name">
                              {h.name ? h.name : h.code}
                              {h.code ? ` (${h.code})` : ''}
                            </span>
                            <span className="weight">{h.weight}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="muted">暂无重仓数据</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="footer">数据源：基金估值与重仓来自东方财富公开接口，可能存在延迟</div>
      {settingsOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="刷新频率设置" onClick={() => setSettingsOpen(false)}>
          <div className="glass card modal" onClick={(e) => e.stopPropagation()}>
            <div className="title" style={{ marginBottom: 12 }}>
              <SettingsIcon width="20" height="20" />
              <span>刷新频率设置</span>
              <span className="muted">选择预设或自定义秒数</span>
            </div>
            <div className="chips" style={{ marginBottom: 12 }}>
              {[10, 30, 60, 120, 300].map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`chip ${tempSeconds === s ? 'active' : ''}`}
                  onClick={() => setTempSeconds(s)}
                  aria-pressed={tempSeconds === s}
                >
                  {s} 秒
                </button>
              ))}
            </div>
            <form onSubmit={saveSettings}>
              <div className="form" style={{ marginBottom: 12 }}>
                <label htmlFor="refresh-seconds" className="muted" style={{ position: 'absolute', left: -9999 }}>
                  自定义刷新秒数
                </label>
                <input
                  id="refresh-seconds"
                  className="input"
                  type="number"
                  min="5"
                  step="5"
                  value={tempSeconds}
                  onChange={(e) => setTempSeconds(Number(e.target.value))}
                  placeholder="秒数（≥5）"
                />
                <button className="button" type="submit">保存</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
