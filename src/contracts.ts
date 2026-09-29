// ArcStable — contract addresses on Arc Mainnet (chainId 5042)
// and Arc Testnet (chainId 21000000 / arc-testnet)

export const ARC_CHAIN_ID = 5042;

export const ADDRESSES = {
  ARCS:               '0xFb3a730cdb68D6EC773b85bD4C44Fd5daAb9AeBB',
  veARCS:             '0x40245f5C8Fe27A4525522FC684e0005b95D71cCF',
  POOL:               '0xecB0dCd298823a9667ED6a30c43A45935c325f6d',
  GAUGE_CONTROLLER:   '0xe54b73059d19Fa5d909bBbFEcbE6137bC9a50299',
  BUYBACK_BURNER:     '0xd6Aa70FE28f61cdeD7451acc4ecB7c106116eb9A',
  REVENUE_DIST:       '0x1568c7C9aF826e7803F762028E9581f302e94534',
  USDC:               '0x3600000000000000000000000000000000000001',
} as const;

// Minimal ABIs — only the functions the UI calls
export const ERC20_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'allowance', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint8' }] },
  { name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'string' }] },
  { name: 'totalSupply', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
] as const;

export const POOL_ABI = [
  { name: 'get_dy', type: 'function', stateMutability: 'view', inputs: [{ name: 'i', type: 'int128' }, { name: 'j', type: 'int128' }, { name: 'dx', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'exchange', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'i', type: 'int128' }, { name: 'j', type: 'int128' }, { name: 'dx', type: 'uint256' }, { name: 'min_dy', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'add_liquidity', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'amounts', type: 'uint256[2]' }, { name: 'min_mint_amount', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'remove_liquidity', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_amount', type: 'uint256' }, { name: 'min_amounts', type: 'uint256[2]' }], outputs: [{ name: '', type: 'uint256[2]' }] },
  { name: 'remove_liquidity_imbalance', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'amounts', type: 'uint256[2]' }, { name: 'max_burn_amount', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'calc_token_amount', type: 'function', stateMutability: 'view', inputs: [{ name: 'amounts', type: 'uint256[2]' }, { name: 'deposit', type: 'bool' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'get_virtual_price', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'balances', type: 'function', stateMutability: 'view', inputs: [{ name: 'i', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'totalSupply', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'allowance', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
] as const;

export const ARCS_ABI = [
  ...ERC20_ABI,
  { name: 'burn', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [] },
] as const;

export const VEARCS_ABI = [
  { name: 'create_lock', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_value', type: 'uint256' }, { name: '_unlock_time', type: 'uint256' }], outputs: [] },
  { name: 'increase_amount', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_value', type: 'uint256' }], outputs: [] },
  { name: 'increase_unlock_time', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_unlock_time', type: 'uint256' }], outputs: [] },
  { name: 'withdraw', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'addr', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'locked', type: 'function', stateMutability: 'view', inputs: [{ name: 'addr', type: 'address' }], outputs: [{ name: 'amount', type: 'int128' }, { name: 'end', type: 'uint256' }] },
  { name: 'totalSupply', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
] as const;

export const GAUGE_CONTROLLER_ABI = [
  { name: 'vote_for_gauge_weights', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_gauge_addr', type: 'address' }, { name: '_user_weight', type: 'uint256' }], outputs: [] },
  { name: 'gauge_relative_weight', type: 'function', stateMutability: 'view', inputs: [{ name: 'addr', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'last_user_vote', type: 'function', stateMutability: 'view', inputs: [{ name: 'addr', type: 'address' }, { name: 'gauge', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'vote_user_slopes', type: 'function', stateMutability: 'view', inputs: [{ name: 'addr', type: 'address' }, { name: 'gauge', type: 'address' }], outputs: [{ name: 'slope', type: 'uint256' }, { name: 'power', type: 'uint256' }, { name: 'end', type: 'uint256' }] },
] as const;

export const REVENUE_DIST_ABI = [
  { name: 'claim', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'claimable', type: 'function', stateMutability: 'view', inputs: [{ name: 'addr', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'token_last_balance', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
] as const;

export const BUYBACK_BURNER_ABI = [
  { name: 'burn', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { name: 'claimable_tokens', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
] as const;
