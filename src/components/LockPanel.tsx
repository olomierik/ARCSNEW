import { useState, useEffect } from 'react';
import { useAccount, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits, maxUint256 } from 'viem';
import { toast } from 'sonner';
import { ExternalLink, Lock, Unlock } from 'lucide-react';
import { ADDRESSES, VEARCS_ABI, ERC20_ABI } from '../contracts';
import { arcMainnet } from '../config';

const WEEK = 7 * 24 * 3600;
// Captured once at module load — keeps Date.now() out of render paths
const _NOW_SEC = Math.floor(Date.now() / 1000);
const LOCK_OPTIONS = [
  { label: '1 month', weeks: 4 },
  { label: '6 months', weeks: 26 },
  { label: '1 year', weeks: 52 },
  { label: '2 years', weeks: 104 },
  { label: '4 years', weeks: 208 },
];

export default function LockPanel() {
  const { address, isConnected } = useAccount();
  const [lockAmt, setLockAmt] = useState('');
  const [lockWeeks, setLockWeeks] = useState(52);

  const { data, refetch } = useReadContracts({
    contracts: [
      { address: ADDRESSES.ARCS, abi: ERC20_ABI, functionName: 'balanceOf', args: address ? [address] : undefined, chainId: arcMainnet.id },
      { address: ADDRESSES.ARCS, abi: ERC20_ABI, functionName: 'allowance', args: address ? [address, ADDRESSES.veARCS as `0x${string}`] : undefined, chainId: arcMainnet.id },
      { address: ADDRESSES.veARCS, abi: VEARCS_ABI, functionName: 'balanceOf', args: address ? [address] : undefined, chainId: arcMainnet.id },
      { address: ADDRESSES.veARCS, abi: VEARCS_ABI, functionName: 'locked', args: address ? [address] : undefined, chainId: arcMainnet.id },
      { address: ADDRESSES.veARCS, abi: VEARCS_ABI, functionName: 'totalSupply', chainId: arcMainnet.id },
    ],
    query: { enabled: !!address },
  });

  const arcsBal = data?.[0]?.result;
  const arcsAllowance = data?.[1]?.result;
  const veBalance = data?.[2]?.result;
  const locked = data?.[3]?.result as { amount: bigint; end: bigint } | undefined;
  const veTotalSupply = data?.[4]?.result;

  const lockedAmt = locked?.amount !== undefined ? (locked.amount < 0n ? -locked.amount : locked.amount) : undefined;
  const lockEnd = locked?.end;
  const hasLock = lockedAmt !== undefined && lockedAmt > 0n;
  const lockExpired = lockEnd !== undefined && lockEnd < BigInt(_NOW_SEC);

  const lockAmtRaw = lockAmt ? (() => { try { return parseUnits(lockAmt, 18); } catch { return undefined; } })() : undefined;
  const needsApproval = lockAmtRaw !== undefined && (arcsAllowance ?? 0n) < lockAmtRaw;

  const unlockTime = BigInt(_NOW_SEC + lockWeeks * WEEK);

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  const loading = isPending || isConfirming;

  useEffect(() => {
    if (!isSuccess) return;
    toast.success('Transaction confirmed!', {
      action: txHash ? { label: 'Explorer', onClick: () => window.open(`https://explorer.arc.io/tx/${txHash}`, '_blank') } : undefined,
    });
    void refetch();
  }, [isSuccess, txHash, refetch]);

  const displayLockAmt = isSuccess ? '' : lockAmt;

  function approve() {
    writeContract({ address: ADDRESSES.ARCS, abi: ERC20_ABI, functionName: 'approve', args: [ADDRESSES.veARCS as `0x${string}`, maxUint256], chainId: arcMainnet.id });
  }
  function createLock() {
    if (!lockAmtRaw) return;
    writeContract({ address: ADDRESSES.veARCS, abi: VEARCS_ABI, functionName: 'create_lock', args: [lockAmtRaw, unlockTime], chainId: arcMainnet.id });
  }
  function increaseAmount() {
    if (!lockAmtRaw) return;
    writeContract({ address: ADDRESSES.veARCS, abi: VEARCS_ABI, functionName: 'increase_amount', args: [lockAmtRaw], chainId: arcMainnet.id });
  }
  function increaseTime() {
    writeContract({ address: ADDRESSES.veARCS, abi: VEARCS_ABI, functionName: 'increase_unlock_time', args: [unlockTime], chainId: arcMainnet.id });
  }
  function withdraw() {
    writeContract({ address: ADDRESSES.veARCS, abi: VEARCS_ABI, functionName: 'withdraw', chainId: arcMainnet.id });
  }

  const lockEndDate = lockEnd ? new Date(Number(lockEnd) * 1000).toLocaleDateString() : '—';

  return (
    <div className="w-full max-w-md flex flex-col gap-4">
      {/* Current lock info */}
      {isConnected && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl p-4 flex flex-col gap-1" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <span className="text-xs" style={{ color: 'var(--subtle)' }}>Your veARCS</span>
            <span className="tabular-nums font-bold text-xl display" style={{ color: 'var(--accent)' }}>
              {veBalance !== undefined ? Number(formatUnits(veBalance, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
            </span>
          </div>
          <div className="rounded-xl p-4 flex flex-col gap-1" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <span className="text-xs" style={{ color: 'var(--subtle)' }}>Locked ARCS</span>
            <span className="tabular-nums font-bold text-xl display" style={{ color: 'var(--ink)' }}>
              {lockedAmt !== undefined ? Number(formatUnits(lockedAmt, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
            </span>
          </div>
          <div className="rounded-xl p-4 flex flex-col gap-1" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <span className="text-xs" style={{ color: 'var(--subtle)' }}>Lock Expires</span>
            <span className="font-semibold text-sm" style={{ color: lockExpired ? 'var(--danger)' : 'var(--ink-2)' }}>
              {lockExpired ? 'Expired' : lockEndDate}
            </span>
          </div>
          <div className="rounded-xl p-4 flex flex-col gap-1" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <span className="text-xs" style={{ color: 'var(--subtle)' }}>Total veARCS</span>
            <span className="tabular-nums font-semibold text-sm" style={{ color: 'var(--muted)' }}>
              {veTotalSupply !== undefined ? Number(formatUnits(veTotalSupply, 18)).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '—'}
            </span>
          </div>
        </div>
      )}

      {/* Lock form */}
      <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
        <h2 className="display font-semibold text-base" style={{ color: 'var(--ink)' }}>
          {hasLock ? 'Manage Lock' : 'Create Lock'}
        </h2>

        {/* Amount input */}
        <div className="rounded-xl p-4" style={{ background: 'var(--surface-muted)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium" style={{ color: 'var(--subtle)' }}>ARCS Amount</span>
            {arcsBal !== undefined && (
              <button className="text-xs hover:underline" style={{ color: 'var(--subtle)' }} onClick={() => setLockAmt(formatUnits(arcsBal, 18))}>
                Balance: {Number(formatUnits(arcsBal, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </button>
            )}
          </div>
          <input type="number" min="0" placeholder="0.00" value={displayLockAmt} onChange={(e) => setLockAmt(e.target.value)}
            className="w-full bg-transparent text-2xl font-semibold tabular-nums outline-none"
            style={{ color: 'var(--ink)', fontFamily: 'Space Grotesk, sans-serif' }} />
        </div>

        {/* Duration */}
        {!hasLock && (
          <div>
            <div className="text-xs font-medium mb-2" style={{ color: 'var(--subtle)' }}>Lock Duration</div>
            <div className="flex flex-wrap gap-2">
              {LOCK_OPTIONS.map((opt) => (
                <button key={opt.weeks} onClick={() => setLockWeeks(opt.weeks)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                  style={lockWeeks === opt.weeks
                    ? { background: 'rgba(172,198,233,0.2)', color: 'var(--accent)' }
                    : { background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {!isConnected ? (
          <div className="text-center text-sm py-1" style={{ color: 'var(--subtle)' }}>Connect wallet</div>
        ) : lockExpired && hasLock ? (
          <button onClick={withdraw} disabled={loading} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm disabled:opacity-50"
            style={{ background: 'var(--danger)', color: '#fff' }}>
            <Unlock size={14} /> {loading ? 'Withdrawing…' : 'Withdraw Expired Lock'}
          </button>
        ) : hasLock ? (
          <div className="flex flex-col gap-2">
            {needsApproval ? (
              <button onClick={approve} disabled={loading} className="w-full py-3 rounded-xl font-semibold text-sm disabled:opacity-50" style={{ background: 'var(--accent)', color: '#0d1b2f' }}>
                {loading ? 'Approving…' : 'Approve ARCS'}
              </button>
            ) : (
              <>
                <button onClick={increaseAmount} disabled={loading || !lockAmtRaw} className="w-full py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50" style={{ background: 'var(--accent)', color: '#0d1b2f' }}>
                  {loading ? 'Locking…' : 'Increase Amount'}
                </button>
                <div>
                  <div className="text-xs font-medium mb-2" style={{ color: 'var(--subtle)' }}>Extend Lock Duration</div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {LOCK_OPTIONS.map((opt) => (
                      <button key={opt.weeks} onClick={() => setLockWeeks(opt.weeks)}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                        style={lockWeeks === opt.weeks
                          ? { background: 'rgba(172,198,233,0.2)', color: 'var(--accent)' }
                          : { background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <button onClick={increaseTime} disabled={loading} className="w-full py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink-2)' }}>
                    {loading ? 'Extending…' : 'Extend Lock Time'}
                  </button>
                </div>
              </>
            )}
          </div>
        ) : needsApproval ? (
          <button onClick={approve} disabled={loading} className="w-full py-3 rounded-xl font-semibold text-sm disabled:opacity-50" style={{ background: 'var(--accent)', color: '#0d1b2f' }}>
            {loading ? 'Approving…' : 'Approve ARCS'}
          </button>
        ) : (
          <button onClick={createLock} disabled={loading || !lockAmtRaw} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm disabled:opacity-50"
            style={{ background: 'var(--accent)', color: '#0d1b2f' }}>
            <Lock size={14} /> {loading ? 'Locking…' : 'Create Lock'}
          </button>
        )}

        {txHash && (
          <a href={`https://explorer.arc.io/tx/${txHash}`} target="_blank" rel="noreferrer"
            className="flex items-center justify-center gap-1 text-xs hover:underline" style={{ color: 'var(--subtle)' }}>
            <ExternalLink size={11} /> View on Explorer
          </a>
        )}
      </div>

      <p className="text-xs text-center" style={{ color: 'var(--subtle)' }}>
        Lock ARCS to receive veARCS. More time = more voting power and yield share.
      </p>
    </div>
  );
}
