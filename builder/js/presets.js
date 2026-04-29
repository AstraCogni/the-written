const PRESETS = {
  gold:    { bg:'#120e1e', surface:'#1c1630', border:'#2e2650', accent:'#cab37e', text:'#ede8d8', muted:'#7a7090' },
  dark:    { bg:'#0d1117', surface:'#161b22', border:'#30363d', accent:'#58a6ff', text:'#e6edf3', muted:'#7d8590' },
  navy:    { bg:'#0a0f1a', surface:'#111827', border:'#1f2d40', accent:'#38bdf8', text:'#e2e8f0', muted:'#64748b' },
  crimson: { bg:'#120808', surface:'#1c1010', border:'#3a1010', accent:'#e05c5c', text:'#f0dede', muted:'#7a5050' },
  forest:  { bg:'#080f0a', surface:'#0f1a10', border:'#1a3020', accent:'#4ade80', text:'#dcfce7', muted:'#4b7a5a' },
};

if (typeof module !== 'undefined') module.exports = { PRESETS };
