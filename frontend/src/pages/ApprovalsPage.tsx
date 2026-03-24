import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Collapse,
  Divider, Paper, Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import BugReportIcon from '@mui/icons-material/BugReport';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import {
  Approval, DebugState, DetectedTech,
  approveRequest, fetchDebugState, listApprovals,
  openLogStream, pollNow, rejectRequest,
} from '../services/approvalService';

// ── Stage definitions ────────────────────────────────────────────────────────
const STAGES = [
  { num: 1, label: 'Tech Detection',    desc: 'Scanning repository for language, framework and build tool' },
  { num: 2, label: 'Terraform',         desc: 'Provisioning cloud infrastructure from centralized modules' },
  { num: 3, label: 'CI/CD Pipeline',    desc: 'Generating and committing workflow YAML, pushing secrets' },
  { num: 4, label: 'GitHub Actions',    desc: 'Monitoring workflow run until completion' },
];

const STATUS_COLOR: Record<string, string> = {
  pending: '#fbbf24', running: '#38bdf8', done: '#34d399', failed: '#f87171', rejected: '#94a3b8',
};

function stageState(stageNum: number, currentStage: number, status: string): 'done' | 'active' | 'failed' | 'waiting' {
  if (status === 'failed' && stageNum === currentStage) return 'failed';
  if (stageNum < currentStage || (stageNum === currentStage && status === 'done')) return 'done';
  if (stageNum === currentStage) return 'active';
  return 'waiting';
}

function logLineColor(line: string): string {
  const l = line.toLowerCase();
  if (l.includes('fail') || l.includes('error')) return '#f87171';
  if (l.includes('complete') || l.includes('success') || l.includes('ok')) return '#34d399';
  if (l.includes('warning') || l.includes('warn')) return '#fbbf24';
  if (l.startsWith('provisioned') || l.startsWith('committed') || l.startsWith('secrets')) return '#a78bfa';
  return '#94a3b8';
}

// ── Stage log panel ──────────────────────────────────────────────────────────
const StageLogPanel: React.FC<{ logs: string[]; active: boolean }> = ({ logs, active }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [logs]);

  return (
    <Box ref={ref} sx={{
      background: '#020817', border: '1px solid rgba(99,179,237,0.1)',
      borderRadius: 1, p: 1.5, maxHeight: 200, overflowY: 'auto',
      fontFamily: 'monospace', fontSize: 11, mt: 1,
    }}>
      {logs.length === 0
        ? <Typography variant="caption" color="rgba(148,163,184,0.3)">
            {active ? 'Waiting for output...' : 'No output yet'}
          </Typography>
        : logs.map((line, i) => (
          <Box key={i} sx={{ color: logLineColor(line), lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {line}
          </Box>
        ))
      }
      {active && (
        <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
          <CircularProgress size={8} sx={{ color: '#38bdf8' }} />
          <Typography variant="caption" color="#38bdf8" fontSize={10}>running...</Typography>
        </Box>
      )}
    </Box>
  );
};

// ── Tech badge row ───────────────────────────────────────────────────────────
const TechBadges: React.FC<{ tech: DetectedTech }> = ({ tech }) => {
  if (!tech.language) return null;
  const items: [string, string | boolean | null | undefined][] = [
    ['Language', tech.language],
    ['Framework', tech.framework],
    ['Build', tech.buildTool],
    ['Dockerfile', tech.hasDockerfile ? 'Yes' : null],
    ['Helm', tech.hasHelm ? 'Yes' : null],
    ['Terraform', tech.hasTerraform ? 'Yes' : null],
  ];
  return (
    <Box display="flex" flexWrap="wrap" gap={0.75} mt={1}>
      {items.filter(([, v]) => v).map(([label, value]) => (
        <Chip key={label} size="small"
          label={`${label}: ${value}`}
          sx={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa', fontSize: 10, border: '1px solid rgba(167,139,250,0.2)' }} />
      ))}
    </Box>
  );
};

// ── Approval card ────────────────────────────────────────────────────────────
interface CardProps {
  approval: Approval;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onRetry: (id: string) => void;
  actionLoading: string | null;
}

const ApprovalCard: React.FC<CardProps> = ({ approval, onApprove, onReject, onRetry, actionLoading }) => {
  const [status, setStatus]           = useState(approval.status);
  const [stage, setStage]             = useState(approval.pipeline_stage);
  const [stageLogs, setStageLogs]     = useState<Record<string, string[]>>(approval.stage_logs || {});
  const [tech, setTech]               = useState<DetectedTech>(approval.detected_tech || {});
  const [deployedUrl, setDeployedUrl] = useState<string | null>(approval.deployed_url);
  const [actionsUrl, setActionsUrl]   = useState<string | null>(approval.actions_run_url);
  const [expandedStage, setExpandedStage] = useState<number | null>(null);
  const esRef = useRef<EventSource | null>(null);

  // Sync from parent polling
  useEffect(() => { setStatus(approval.status); }, [approval.status]);
  useEffect(() => { setStage(approval.pipeline_stage); }, [approval.pipeline_stage]);
  useEffect(() => { if (approval.deployed_url) setDeployedUrl(approval.deployed_url); }, [approval.deployed_url]);
  useEffect(() => { if (approval.actions_run_url) setActionsUrl(approval.actions_run_url); }, [approval.actions_run_url]);
  useEffect(() => {
    if (approval.detected_tech?.language) setTech(approval.detected_tech);
  }, [approval.detected_tech]);

  // Auto-expand Actions stage when an Actions run URL appears so users
  // immediately see workflow progress in the logs panel.
  useEffect(() => {
    if (actionsUrl) setExpandedStage(4);
  }, [actionsUrl]);

  // Open SSE when running
  useEffect(() => {
    if (status !== 'running' && status !== 'done' && status !== 'failed') return;
    if (esRef.current) return;
    const es = openLogStream(approval.id);
    esRef.current = es;

    es.onmessage = (e: MessageEvent) => {
      const raw: string = e.data;

      // Stage advance signal
      if (raw.startsWith('STAGE:')) {
        const n = parseInt(raw.replace('STAGE:', ''), 10);
        setStage(n);
        setExpandedStage(n); // auto-expand active stage
        return;
      }
      if (raw === 'DONE') { setStatus('done'); return; }
      if (raw === 'FAILED') { setStatus('failed'); return; }

      // Global messages (no stage prefix)
      if (!raw.includes('|')) {
        if (raw.startsWith('Deployed URL')) {
          const url = raw.replace(/^Deployed URL\s*:\s*/, '').trim();
          if (url) setDeployedUrl(url);
        }
        if (raw.startsWith('Actions Run')) {
          const url = raw.replace(/^Actions Run\s*:\s*/, '').trim();
          if (url) setActionsUrl(url);
        }
        return;
      }

      // Stage-prefixed log: "1|some message"
      const pipeIdx = raw.indexOf('|');
      const stageKey = raw.slice(0, pipeIdx);
      const line = raw.slice(pipeIdx + 1);
      const stageNum = parseInt(stageKey, 10);

      setStageLogs((prev) => {
        const cur = prev[stageKey] || [];
        // avoid appending duplicate lines when backend replays stored logs
        if (cur.includes(line)) return prev;
        return {
          ...prev,
          [stageKey]: [...cur, line],
        };
      });

      // Extract tech from stage 1 logs
      if (stageNum === 1) {
        if (line.startsWith('Language')) {
          setTech((t) => ({ ...t, language: line.split(':')[1]?.trim() }));
        }
        if (line.startsWith('Framework')) {
          setTech((t) => ({ ...t, framework: line.split(':')[1]?.trim() }));
        }
        if (line.startsWith('Build tool')) {
          setTech((t) => ({ ...t, buildTool: line.split(':')[1]?.trim() }));
        }
      }
      // Extract deployed URL from stage 2
      if (stageNum === 2 && line.startsWith('Provisioned URL')) {
        const url = line.replace(/^Provisioned URL\s*:\s*/, '').trim();
        if (url) setDeployedUrl(url);
      }
    };

    es.onerror = () => { es.close(); esRef.current = null; };
    return () => { es.close(); esRef.current = null; };
  }, [approval.id, status]);

  const cfg = approval.config;
  const isLoading = actionLoading === approval.id;
  const isRunning = status === 'running';
  const statusColor = STATUS_COLOR[status] ?? '#94a3b8';

  return (
    <Paper sx={{
      background: 'rgba(13,25,48,0.9)',
      border: `1px solid ${isRunning ? 'rgba(56,189,248,0.3)' : 'rgba(99,179,237,0.15)'}`,
      borderRadius: 2, p: 3, mb: 2,
      boxShadow: isRunning ? '0 0 20px rgba(56,189,248,0.08)' : 'none',
    }}>
      {/* ── Header ── */}
      <Box display="flex" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" gap={1} mb={1}>
        <Box>
          <Typography variant="subtitle1" fontWeight={700} color="#e2e8f0">{approval.repo}</Typography>
          <Typography variant="caption" color="rgba(148,163,184,0.6)">
            Branch: <b style={{ color: '#63b3ed' }}>{approval.branch}</b>
            &nbsp;·&nbsp;
            <code style={{ color: '#63b3ed' }}>{approval.commit_sha}</code>
            &nbsp;·&nbsp;{approval.committed_by}
            {approval.committed_at && <>&nbsp;·&nbsp;{new Date(approval.committed_at).toLocaleString()}</>}
          </Typography>
        </Box>
        <Chip size="small" label={status.toUpperCase()}
          sx={{ color: statusColor, background: `${statusColor}18`, border: `1px solid ${statusColor}40`, fontWeight: 700 }} />
      </Box>

      <Typography variant="body2" color="rgba(148,163,184,0.6)" mb={1.5} sx={{ fontStyle: 'italic' }}>
        {approval.commit_message}
      </Typography>

      {/* ── Config chips ── */}
      <Box display="flex" flexWrap="wrap" gap={0.75} mb={2}>
        {([
          ['App', cfg.APP_NAME], ['Target', cfg.DEPLOY_TARGET],
          ['Region', cfg.LOCATION], ['RG', cfg.RESOURCE_GROUP],
        ] as [string, unknown][]).filter(([, v]) => v).map(([label, value]) => (
          <Chip key={label} size="small" label={`${label}: ${value}`}
            sx={{ background: 'rgba(99,179,237,0.07)', color: '#64748b', fontSize: 10 }} />
        ))}
      </Box>

      <Divider sx={{ borderColor: 'rgba(99,179,237,0.08)', mb: 2 }} />

      {/* ── Approve / Reject ── */}
      {status === 'pending' && (
        <Box display="flex" gap={1} mb={2}>
          <Button variant="contained" size="small"
            startIcon={isLoading ? <CircularProgress size={13} color="inherit" /> : <CheckCircleIcon />}
            disabled={isLoading} onClick={() => onApprove(approval.id)}
            sx={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', fontWeight: 700, textTransform: 'none' }}>
            Approve & Deploy
          </Button>
          <Button variant="outlined" size="small" startIcon={<CancelIcon />}
            disabled={isLoading} onClick={() => onReject(approval.id)}
            sx={{ borderColor: '#f87171', color: '#f87171', textTransform: 'none' }}>
            Reject
          </Button>
        </Box>
      )}

      {/* ── Retry on failure ── */}
      {status === 'failed' && (
        <Box display="flex" gap={1} mb={2}>
          <Button variant="contained" size="small"
            startIcon={isLoading ? <CircularProgress size={13} color="inherit" /> : <RefreshIcon />}
            disabled={isLoading} onClick={() => onRetry(approval.id)}
            sx={{ background: 'linear-gradient(135deg,#3b82f6,#06b6d4)', fontWeight: 700, textTransform: 'none' }}>
            Retry
          </Button>
          <Button variant="outlined" size="small" startIcon={<CancelIcon />}
            disabled={isLoading} onClick={() => onReject(approval.id)}
            sx={{ borderColor: '#f87171', color: '#f87171', textTransform: 'none' }}>
            Reject
          </Button>
        </Box>
      )}

      {/* ── Stage stepper ── */}
      {(isRunning || status === 'done' || status === 'failed') && (
        <Box mb={2}>
          {STAGES.map((s) => {
            const state = stageState(s.num, stage, status);
            const logs = stageLogs[String(s.num)] || [];
            const isExpanded = expandedStage === s.num;

            const dotColor =
              state === 'done'    ? '#34d399' :
              state === 'active'  ? '#38bdf8' :
              state === 'failed'  ? '#f87171' : 'rgba(148,163,184,0.2)';

            const labelColor =
              state === 'done'    ? '#34d399' :
              state === 'active'  ? '#e2e8f0' :
              state === 'failed'  ? '#f87171' : 'rgba(148,163,184,0.3)';

            return (
              <Box key={s.num} mb={0.5}>
                <Box
                  display="flex" alignItems="center" gap={1.5}
                  sx={{ cursor: logs.length > 0 ? 'pointer' : 'default', py: 0.75,
                        px: 1, borderRadius: 1,
                        '&:hover': logs.length > 0 ? { background: 'rgba(99,179,237,0.04)' } : {} }}
                  onClick={() => logs.length > 0 && setExpandedStage(isExpanded ? null : s.num)}
                >
                  {/* dot / spinner */}
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                    background: state === 'active' ? 'transparent' : dotColor,
                    border: state === 'active' ? `2px solid ${dotColor}` : 'none',
                    boxShadow: state === 'active' ? `0 0 8px ${dotColor}` : 'none',
                  }}>
                    {state === 'active' && (
                      <CircularProgress size={10} sx={{ color: dotColor, mt: '-1px', ml: '-1px' }} />
                    )}
                  </Box>

                  {/* label */}
                  <Box flex={1}>
                    <Typography variant="body2" fontWeight={state === 'active' ? 700 : 500}
                      color={labelColor} display="inline">
                      Stage {s.num}: {s.label}
                    </Typography>
                    {state === 'active' && (
                      <Typography variant="caption" color="rgba(148,163,184,0.5)" ml={1}>
                        {s.desc}
                      </Typography>
                    )}
                    {/* For Actions stage show the latest operation as a compact sublabel */}
                    {s.num === 4 && logs.length > 0 && (
                      <Typography variant="caption" color="rgba(148,163,184,0.45)" ml={1} noWrap>
                        {logs[logs.length - 1]}
                      </Typography>
                    )}
                    {/* Tech badges inline after stage 1 completes */}
                    {s.num === 1 && state === 'done' && tech.language && (
                      <TechBadges tech={tech} />
                    )}
                  </Box>

                  {/* expand toggle */}
                  {logs.length > 0 && (
                    <Box sx={{ color: 'rgba(148,163,184,0.4)', fontSize: 12 }}>
                      {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                    </Box>
                  )}
                </Box>

                {/* per-stage log panel */}
                <Collapse in={isExpanded}>
                  <Box pl={3.5}>
                    <StageLogPanel logs={logs} active={state === 'active'} />
                  </Box>
                </Collapse>
              </Box>
            );
          })}
        </Box>
      )}

      {/* ── Deployed URL ── */}
      {deployedUrl && (
        <Box display="flex" alignItems="center" gap={1.5} p={2} mt={1}
          sx={{ background: 'rgba(52,211,153,0.07)', borderRadius: 1.5, border: '1px solid rgba(52,211,153,0.25)' }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', flexShrink: 0,
            boxShadow: '0 0 10px #34d399',
            animation: status === 'done' ? 'pulse 2s infinite' : 'none' }} />
          <Box flex={1} minWidth={0}>
            <Typography variant="caption" color="rgba(52,211,153,0.7)" display="block" fontWeight={600}>
              LIVE APPLICATION
            </Typography>
            <Typography variant="body2" color="#34d399" fontWeight={700}
              sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {deployedUrl}
            </Typography>
          </Box>
          <Button variant="contained" size="small" endIcon={<OpenInNewIcon fontSize="small" />}
            href={deployedUrl.startsWith('http') ? deployedUrl : `https://${deployedUrl}`}
            target="_blank" rel="noopener noreferrer"
            sx={{ background: 'linear-gradient(135deg,#34d399,#059669)', color: '#fff',
              fontWeight: 700, textTransform: 'none', flexShrink: 0,
              '&:hover': { background: 'linear-gradient(135deg,#6ee7b7,#34d399)' } }}>
            Open App
          </Button>
        </Box>
      )}

      {/* ── Actions run link ── */}
      {actionsUrl && (
        <Box mt={1}>
          <Button size="small" endIcon={<OpenInNewIcon fontSize="small" />}
            href={actionsUrl} target="_blank" rel="noopener noreferrer"
            sx={{ color: '#63b3ed', textTransform: 'none', fontSize: 11, p: 0 }}>
            View GitHub Actions run
          </Button>
        </Box>
      )}
    </Paper>
  );
};

// ── Debug panel ──────────────────────────────────────────────────────────────
const DebugPanel: React.FC<{ debug: DebugState }> = ({ debug }) => (
  <Paper sx={{ background: 'rgba(13,25,48,0.9)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 2, p: 2.5, mb: 3 }}>
    <Typography variant="subtitle2" color="#fbbf24" fontWeight={700} mb={1.5}>Poller Diagnostics</Typography>
    <Box display="flex" flexWrap="wrap" gap={1} mb={1.5}>
      <Chip size="small" label={`Token: ${debug.token_preview}`}
        sx={{ background: debug.token_set ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
          color: debug.token_set ? '#34d399' : '#f87171' }} />
      <Chip size="small" label={`GitHub: ${debug.github_reachable ? 'Reachable' : 'Unreachable'}`}
        sx={{ background: debug.github_reachable ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
          color: debug.github_reachable ? '#34d399' : '#f87171' }} />
      {debug.github_user && (
        <Chip size="small" label={`User: ${debug.github_user}`}
          sx={{ background: 'rgba(99,179,237,0.1)', color: '#63b3ed' }} />
      )}
      <Chip size="small" label={`${debug.repos_visible.length} repos visible`}
        sx={{ background: 'rgba(99,179,237,0.1)', color: '#63b3ed' }} />
      <Chip size="small" label={`${debug.repos_with_config_py.length} with config.py`}
        sx={{ background: debug.repos_with_config_py.length > 0 ? 'rgba(52,211,153,0.1)' : 'rgba(148,163,184,0.1)',
          color: debug.repos_with_config_py.length > 0 ? '#34d399' : '#94a3b8' }} />
    </Box>
    {!debug.token_set && (
      <Alert severity="error" sx={{ mt: 1, fontSize: 12 }}>GITHUB_PERSONAL_ACCESS_TOKEN is not set in backend/.env</Alert>
    )}
    {debug.token_set && !debug.github_reachable && (
      <Alert severity="error" sx={{ mt: 1, fontSize: 12 }}>Token set but GitHub API unreachable — token may be expired</Alert>
    )}
    {debug.token_set && debug.github_reachable && debug.repos_with_config_py.length === 0 && (
      <Alert severity="warning" sx={{ mt: 1, fontSize: 12 }}>
        No repos with config.py found. Commit config.py to a repo root, then click Scan Now.
      </Alert>
    )}
  </Paper>
);

// ── Page ─────────────────────────────────────────────────────────────────────
export const ApprovalsPage: React.FC = () => {
  const [approvals, setApprovals]         = useState<Approval[]>([]);
  const [loading, setLoading]             = useState(true);
  const [polling, setPolling]             = useState(false);
  const [error, setError]                 = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [debug, setDebug]                 = useState<DebugState | null>(null);
  const [showDebug, setShowDebug]         = useState(false);

  const fetchApprovals = useCallback(async () => {
    try {
      const data = await listApprovals();
      setApprovals(data);
    } catch {
      setError('Failed to load approvals.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchApprovals();
    const interval = setInterval(() => void fetchApprovals(), 5000);
    return () => clearInterval(interval);
  }, [fetchApprovals]);

  const handlePollNow = async (): Promise<void> => {
    setPolling(true);
    setError('');
    try { await pollNow(); await fetchApprovals(); }
    catch { setError('Poll failed — check backend logs.'); }
    finally { setPolling(false); }
  };

  const handleShowDebug = async (): Promise<void> => {
    try {
      const state = await fetchDebugState();
      setDebug(state);
      setShowDebug((p) => !p);
    } catch { setError('Could not fetch diagnostics.'); }
  };

  const handleApprove = async (id: string): Promise<void> => {
    setActionLoading(id);
    try {
      await approveRequest(id);
      setApprovals((prev) => prev.map((a) => a.id === id ? { ...a, status: 'running', pipeline_stage: 1 } : a));
    } catch { setError('Approval failed. Please try again.'); }
    finally { setActionLoading(null); }
  };

  const handleReject = async (id: string): Promise<void> => {
    setActionLoading(id);
    try {
      await rejectRequest(id);
      setApprovals((prev) => prev.map((a) => a.id === id ? { ...a, status: 'rejected' } : a));
    } catch { setError('Rejection failed. Please try again.'); }
    finally { setActionLoading(null); }
  };

  const handleRetry = async (id: string): Promise<void> => {
    setActionLoading(id);
    try {
      await retryRequest(id);
      setApprovals((prev) => prev.map((a) => a.id === id ? { ...a, status: 'pending', pipeline_stage: 0, stage_logs: {}, logs: [] } : a));
    } catch { setError('Retry failed. Please try again.'); }
    finally { setActionLoading(null); }
  };

  const pending  = approvals.filter((a) => a.status === 'pending').length;
  const running  = approvals.filter((a) => a.status === 'running').length;

  return (
    <Box sx={{ p: 3, maxWidth: 960, mx: 'auto' }}>
      {/* ── Page header ── */}
      <Box display="flex" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" gap={2} mb={3}>
        <Box>
          <Typography variant="subtitle1" fontWeight={700} color="#e2e8f0">
            Deployment Approvals
          </Typography>
          <Typography variant="body2" color="rgba(148,163,184,0.55)" mt={0.5}>
            Repos that committed <code>config.py</code> — approve to run the full automated pipeline
          </Typography>
        </Box>
        <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
          {pending > 0 && (
            <Chip label={`${pending} pending`}
              sx={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', fontWeight: 700 }} />
          )}
          {running > 0 && (
            <Chip label={`${running} running`}
              sx={{ background: 'rgba(56,189,248,0.12)', color: '#38bdf8', fontWeight: 700 }} />
          )}
          <Button variant="outlined" size="small" startIcon={<BugReportIcon />}
            onClick={() => void handleShowDebug()}
            sx={{ borderColor: 'rgba(251,191,36,0.3)', color: '#fbbf24', textTransform: 'none' }}>
            Diagnostics
          </Button>
          <Button variant="contained" size="small"
            startIcon={polling ? <CircularProgress size={13} color="inherit" /> : <RefreshIcon />}
            disabled={polling} onClick={() => void handlePollNow()}
            sx={{ background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', fontWeight: 700, textTransform: 'none' }}>
            {polling ? 'Scanning...' : 'Scan Now'}
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}

      {showDebug && debug && (
        <Box>
          <Button size="small" onClick={() => setShowDebug(false)}
            sx={{ color: '#64748b', textTransform: 'none', mb: 1, fontSize: 12 }}>
            Hide diagnostics
          </Button>
          <DebugPanel debug={debug} />
        </Box>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" mt={8}>
          <CircularProgress sx={{ color: '#63b3ed' }} />
        </Box>
      ) : approvals.length === 0 ? (
        <Box textAlign="center" mt={6} p={4}
          sx={{ border: '1px dashed rgba(99,179,237,0.12)', borderRadius: 2 }}>
          <Typography variant="h6" color="rgba(148,163,184,0.35)" mb={1}>No approvals yet</Typography>
          <Typography variant="body2" color="rgba(148,163,184,0.3)" mb={2}>
            Commit a <code>config.py</code> file to any GitHub repo root, then click Scan Now.
          </Typography>
          <Button variant="outlined" size="small"
            startIcon={polling ? <CircularProgress size={13} color="inherit" /> : <RefreshIcon />}
            disabled={polling} onClick={() => void handlePollNow()}
            sx={{ borderColor: 'rgba(99,179,237,0.3)', color: '#63b3ed', textTransform: 'none' }}>
            {polling ? 'Scanning...' : 'Scan Now'}
          </Button>
        </Box>
      ) : (
        approvals.map((approval) => (
          <ApprovalCard key={approval.id} approval={approval}
            onApprove={(id) => void handleApprove(id)}
            onReject={(id) => void handleReject(id)}
            onRetry={(id) => void handleRetry(id)}
            actionLoading={actionLoading} />
        ))
      )}
    </Box>
  );
};
