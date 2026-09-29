import { useState, useEffect } from 'react';
import { useAccount, useReadContracts, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits, maxUint256 } from 'viem';
import { toast } from 'sonner';
import { ExternalLink, Plus, Minus } from 'lucide-react';
import { ADDRESSES, POOL_ABI, ERC20_ABI } from '../contracts';
import { arcMainnet } from '../config';

export default function LiquidityPanel() {
  const { address, isConnected } = useAccount();
  const [mode, setMode] = useState<'add' | 'remove'>('add');
  const [usdcAmt, setUsdcAmt] = useState('');
  const [removeAmt, setRemoveAmt] = useState('');

  // Balances
  const { data: bals } = useReadContracts({
    contracts: [
      { address: ADDRESSES.USDC, abi: ERC20_ABI, functionName: 'balanceOf', args: address ? [address] : undefined, chainId: arcMainnet.id },
      { address: ADDRESSES.POOL, abi: POOL_ABI, functionName: 'balanceOf', args: address ? [address] : undefined, chainId: arcMainnet.id },
    ],
    query: { enabled: !!address },
  });
  const usdcBal = bals?.[0]?.result;
  const lpBal = bals?.[1]?.result;

  // USDC allowance
  const { data: allowances, refetch: refetchAllowances } = useReadContracts({
    contracts: [
      { address: ADDRESSES.USDC, abi: ERC20_ABI, functionName: 'allowance', args: address ? [address, ADDRESSES.POOL as `0x${string}`] : undefined, chainId: arcMainnet.id },
    ],
    query: { enabled: !!address },
  });
  const usdcAllowance = allowances?.[0]?.result;

  // LP allowance for remove
  const { data: lpAllowance, refetch: refetchLpAllowance } = useReadContract({
    address: ADDRESSES.POOL,
    abi: POOL_ABI,
    functionName: 'allowance',
    args: address ? [address, ADDRESSES.POOL as `0x${string}`] : undefined,
    chainId: arcMainnet.id,
    query: { enabled: !!address },
  });

  const usdcRaw = usdcAmt ? (() => { try { return parseUnits(usdcAmt, 6); } catch { return undefined; } })() : undefined;
  const removeRaw = removeAmt ? (() => { try { return parseUnits(removeAmt, 18); } catch { return undefined; } })() : undefined;

  const needsUsdcApproval = usdcRaw !== undefined && (usdcAllowance ?? 0n) < usdcRaw;
  const needsLpApproval = removeRaw !== undefined && ((lpAllowance) ?? 0n) < removeRaw;

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  const loading = isPending || isConfirming;

  useEffect(() => {
    if (!isSuccess) return;
    toast.success('Transaction confirmed!', {
      action: txHash ? { label: 'Explorer', onClick: () => window.open(`https://explorer.arc.io/tx/${txHash}`, '_blank') } : undefined,
    });
    void refetchAllowances();
    void refetchLpAllowance();
  }, [isSuccess, txHash, refetchAllowances, refetchLpAllowance]);

  // Derive display values: clear when a tx just succeeded
  const displayUsdcAmt = isSuccess ? '' : usdcAmt;
  const displayRemoveAmt = isSuccess ? '' : removeAmt;

  function approveUsdc() {
    writeContract({ address: ADDRESSES.USDC, abi: ERC20_ABI, functionName: 'approve', args: [ADDRESSES.POOL as `0x${string}`, maxUint256], chainId: arcMainnet.id });
  }
  function addLiquidity() {
    const u = usdcRaw ?? 0n;
    // Pool slot 0 = USDC, slot 1 = EURC (0 until EURC is live)
    writeContract({ address: ADDRESSES.POOL, abi: POOL_ABI, functionName: 'add_liquidity', args: [[u, 0n], 0n], chainId: arcMainnet.id });
  }
  function removeLiquidity() {
    if (!removeRaw) return;
    writeContract({ address: ADDRESSES.POOL, abi: POOL_ABI, functionName: 'remove_liquidity', args: [removeRaw, [0n, 0n]], chainId: arcMainnet.id });
  }

  const inputClass = "w-full bg-transparent text-xl font-semibold tabular-nums outline-none";

  return (
    <div className="w-full max-w-md flex flex-col gap-4">
      {/* Mode toggle */}
      <div className="flex rounded-xl overflow-hidden" style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
        {(['add', 'remove'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold transition-all"
            style={mode === m ? { background: 'var(--accent)', color: '#0d1b2f' } : { color: 'var(--muted)' }}
          >
            {m === 'add' ? <Plus size={14} /> : <Minus size={14} />}
            {m === 'add' ? 'Add Liquidity' : 'Remove Liquidity'}
          </button>
        ))}
      </div>

      <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)' }}>
        {mode === 'add' ? (
          <>
            {/* Info banner */}
            <div
              className="rounded-xl px-4 py-3 text-xs text-pretty"
              style={{ background: 'rgba(172,198,233,0.08)', border: '1px solid rgba(172,198,233,0.2)', color: 'var(--muted)' }}
            >
              Only USDC deposits are accepted while EURC is not yet live on Arc Mainnet.
            </div>

            {/* USDC input */}
            <div className="rounded-xl p-4" style={{ background: 'var(--surface-muted)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium" style={{ color: 'var(--subtle)' }}>USDC</span>
                {usdcBal !== undefined && (
                  <button className="text-xs hover:underline" style={{ color: 'var(--subtle)' }} onClick={() => setUsdcAmt(formatUnits(usdcBal, 6))}>
                    Max: {Number(formatUnits(usdcBal, 6)).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                  </button>
                )}
              </div>
              <input type="number" min="0" placeholder="0.00" value={displayUsdcAmt} onChange={(e) => setUsdcAmt(e.target.value)}
                className={inputClass} style={{ color: 'var(--ink)', fontFamily: 'Space Grotesk, sans-serif' }} />
            </div>

            {!isConnected ? (
              <div className="text-center text-sm py-1" style={{ color: 'var(--subtle)' }}>Connect wallet</div>
            ) : needsUsdcApproval ? (
              <button onClick={approveUsdc} disabled={loading} className="w-full py-3 rounded-xl font-semibold text-sm disabled:opacity-50" style={{ background: 'var(--accent)', color: '#0d1b2f' }}>
                {loading ? 'Approving…' : 'Approve USDC'}
              </button>
            ) : (
              <button onClick={addLiquidity} disabled={loading || !usdcRaw} className="w-full py-3 rounded-xl font-semibold text-sm disabled:opacity-50" style={{ background: 'var(--accent)', color: '#0d1b2f' }}>
                {loading ? 'Adding…' : 'Add Liquidity'}
              </button>
            )}
          </>
        ) : (
          <>
            <div className="rounded-xl p-4" style={{ background: 'var(--surface-muted)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium" style={{ color: 'var(--subtle)' }}>LP Tokens to Burn</span>
                {lpBal !== undefined && (
                  <button className="text-xs hover:underline" style={{ color: 'var(--subtle)' }} onClick={() => setRemoveAmt(formatUnits(lpBal, 18))}>
                    Max: {Number(formatUnits(lpBal, 18)).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                  </button>
                )}
              </div>
              <input type="number" min="0" placeholder="0.000000" value={displayRemoveAmt} onChange={(e) => setRemoveAmt(e.target.value)}
                className={inputClass} style={{ color: 'var(--ink)', fontFamily: 'Space Grotesk, sans-serif' }} />
            </div>

            {!isConnected ? (
              <div className="text-center text-sm py-1" style={{ color: 'var(--subtle)' }}>Connect wallet</div>
            ) : needsLpApproval ? (
              <button
                onClick={() => writeContract({ address: ADDRESSES.POOL, abi: POOL_ABI, functionName: 'approve', args: [ADDRESSES.POOL as `0x${string}`, maxUint256], chainId: arcMainnet.id })}
                disabled={loading} className="w-full py-3 rounded-xl font-semibold text-sm disabled:opacity-50" style={{ background: 'var(--accent)', color: '#0d1b2f' }}>
                {loading ? 'Approving…' : 'Approve LP Token'}
              </button>
            ) : (
              <button onClick={removeLiquidity} disabled={loading || !removeRaw} className="w-full py-3 rounded-xl font-semibold text-sm disabled:opacity-50" style={{ background: 'var(--accent)', color: '#0d1b2f' }}>
                {loading ? 'Removing…' : 'Remove Liquidity'}
              </button>
            )}
          </>
        )}

        {txHash && (
          <a href={`https://explorer.arc.io/tx/${txHash}`} target="_blank" rel="noreferrer"
            className="flex items-center justify-center gap-1 text-xs hover:underline" style={{ color: 'var(--subtle)' }}>
            <ExternalLink size={11} /> View on Explorer
          </a>
        )}
      </div>

      {lpBal !== undefined && lpBal > 0n && (
        <div className="rounded-xl px-4 py-3 flex items-center justify-between text-sm" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <span style={{ color: 'var(--muted)' }}>Your LP balance</span>
          <span className="tabular-nums font-semibold" style={{ color: 'var(--ink-2)' }}>
            {Number(formatUnits(lpBal, 18)).toLocaleString(undefined, { maximumFractionDigits: 6 })} LP
          </span>
        </div>
      )}
    </div>
  );
}
