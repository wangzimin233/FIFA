function createNonce() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function buildWalletAuthMessage(walletAddress: string) {
  const issuedAt = new Date().toISOString()
  const nonce = createNonce()

  return [
    'DAPP',
    'Purpose: Authenticate wallet for login or registration',
    `Wallet: ${walletAddress}`,
    'Chain: BSC',
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
  ].join('\n')
}

