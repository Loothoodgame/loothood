/**
 * Token transfer watcher.
 *
 * WHY. A Season entry ticket is bought with an ordinary token transfer to the
 * treasury address. We have no contracts of our own and never will, so a
 * "payment" is not a method call but simply an incoming transfer that has to be
 * SEEN and attributed to a player. Attribution is possible because the wallet
 * was bound to the account beforehand with a signature (see wallet.js).
 *
 * WHY READING, NOT RECEIVING. The server signs nothing and sends nothing — it
 * only reads public history. Which means it does not and cannot hold the
 * treasury's private key: there is nothing on the server to steal.
 *
 * WHAT MUST NOT BE BROKEN HERE
 *
 * Double crediting. A transfer is uniquely identified by the pair (transaction
 * hash, log index) — that pair is also the primary key. Processing the same
 * transfer twice is physically impossible, no matter how many times the watcher
 * rereads a block.
 *
 * History rewrites. On an L2 recent blocks can be reverted, so we read not "up
 * to the latest block" but up to the latest minus a confirmations margin. A
 * ticket handed out for a reverted transfer cannot be taken back.
 *
 * The data source is passed in as a PARAMETER instead of being taken from the
 * global fetch. This is not abstraction for its own sake: otherwise the watcher
 * could only be tested against the real network with real money.
 */

/** Topic of the Transfer(address,address,uint256) event. A protocol constant. */
export const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

/** An address inside a log topic is written as 32 bytes with leading zeroes. */
function addressFromTopic(topic) {
  const text = String(topic || "");
  return text.length >= 42 ? `0x${text.slice(-40)}`.toLowerCase() : null;
}

function toNumber(hex) {
  return Number(BigInt(String(hex || "0x0")));
}

/**
 * Settings come from the environment and have NO default values.
 *
 * The token address cannot be made up — with a made-up one the watcher would
 * silently read emptiness and never issue a single ticket, and it would look
 * like "nobody is paying, that's all". So without settings it honestly refuses
 * to start.
 */
/** Public network node. It is hardcoded in the client as well, so there is no
 *  point putting it into the environment — it is neither a secret nor a choice. */
export const DEFAULT_RPC_URL = "https://rpc.mainnet.chain.robinhood.com";

/* Clean up what a human pasted into a settings panel.
   ------------------------------------------------------------------
   The address itself was read raw: no trim, no quote stripping. So a trailing
   space or newline — the sort of thing that rides along with a copy-paste and
   is invisible in the panel — failed the pattern, the watcher stayed off, and
   the log said only "required", as if the variable had never been set. The
   value was right there; one invisible character was the whole problem.

   Being lenient here costs nothing and is not the same as being lenient about
   correctness: the pattern below still demands exactly 0x plus forty hex
   characters. We only remove what could not have been meant — whitespace and
   the quotes some panels add around a value. */
function readAddress(raw) {
  return String(raw ?? "").trim().replace(/^["']|["']$/g, "").trim().toLowerCase();
}

export function chainSettings(env = process.env) {
  const token = readAddress(env.TOKEN_ADDRESS);
  const treasury = readAddress(env.TREASURY_ADDRESS);
  const rpc = String(env.CHAIN_RPC_URL || DEFAULT_RPC_URL).trim();
  const isAddress = /^0x[0-9a-f]{40}$/;
  return {
    enabled: isAddress.test(token) && isAddress.test(treasury) && Boolean(rpc),
    token, treasury, rpc,
    // How many blocks to wait before treating a transfer as settled.
    confirmations: Math.max(1, Number(env.CHAIN_CONFIRMATIONS) || 12),
    // How many blocks to read in one pass. Nodes cap the window width, and a
    // request that is too wide is rejected outright.
    window: Math.max(1, Number(env.CHAIN_LOG_WINDOW) || 2000),
    // Which block to start from when there is no cursor yet. Zero means "from
    // the current one": there is no point rereading the chain's history from
    // the beginning of time.
    startBlock: Number(env.CHAIN_START_BLOCK) || 0,
  };
}

/** A minimal JSON-RPC client. A node error is turned into an exception. */
export function createRpcClient(rpcUrl, fetchImpl = globalThis.fetch) {
  let counter = 0;
  return async function call(method, params = []) {
    counter += 1;
    const response = await fetchImpl(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: counter, method, params }),
    });
    if (!response.ok) throw new Error(`RPC ${method}: HTTP ${response.status}`);
    const body = await response.json();
    if (body.error) throw new Error(`RPC ${method}: ${body.error.message || "node error"}`);
    return body.result;
  };
}

/**
 * Incoming token transfers to the treasury address over a range of blocks.
 *
 * We filter on the node side by the third topic (the recipient) rather than on
 * ours: a popular token has tens of thousands of transfers, and dragging all of
 * them across for the sake of our three is a sure way to run into the node's
 * limits.
 */
export async function readTransfers({ call, token, treasury, fromBlock, toBlock }) {
  const treasuryTopic = `0x${"0".repeat(24)}${treasury.slice(2)}`;
  const logs = await call("eth_getLogs", [{
    address: token,
    fromBlock: `0x${fromBlock.toString(16)}`,
    toBlock: `0x${toBlock.toString(16)}`,
    topics: [TRANSFER_TOPIC, null, treasuryTopic],
  }]);
  return (logs || [])
    .filter((entry) => !entry.removed)
    .map((entry) => ({
      txHash: String(entry.transactionHash || "").toLowerCase(),
      logIndex: toNumber(entry.logIndex),
      blockNumber: toNumber(entry.blockNumber),
      from: addressFromTopic(entry.topics?.[1]),
      // The amount is in the token's smallest units. Kept as a string: for a
      // token with eighteen decimals an ordinary amount does not fit into a
      // number without losing precision, and losing precision on money is not
      // acceptable.
      amount: BigInt(entry.data || "0x0").toString(),
    }))
    .filter((transfer) => transfer.from);
}

/**
 * One pass of the watcher: read the new transfers, record them and hand out
 * tickets to those whose wallet is bound.
 *
 * Returns a summary — the caller prints it. It logs nothing itself so that it
 * can be run inside the test bench without noise.
 */
export async function pollTransfers({ query, call, settings, ticketPrice, seasonKey }) {
  const latestBlock = toNumber(await call("eth_blockNumber"));
  const safeBlock = latestBlock - settings.confirmations;
  if (safeBlock < 1) return { transfersRead: 0, ticketsCredited: 0, throughBlock: 0 };

  const { rows: cursorRows } = await query("SELECT last_block FROM chain_cursor WHERE id = 1");
  let cursorBlock = Number(cursorRows[0]?.last_block || 0);
  if (!cursorBlock) cursorBlock = settings.startBlock || safeBlock;
  if (cursorBlock > safeBlock) return { transfersRead: 0, ticketsCredited: 0, throughBlock: cursorBlock };
  const targetBlock = Math.min(safeBlock, cursorBlock + settings.window);

  const transfers = await readTransfers({
    call, token: settings.token, treasury: settings.treasury,
    fromBlock: cursorBlock + 1, toBlock: targetBlock,
  });

  let credited = 0;
  for (const transfer of transfers) {
    // Who to attribute it to. The wallet is bound with a signature beforehand;
    // if it belongs to nobody, the transfer is still recorded — the money came
    // in, and that has to be visible.
    const { rows: owners } = await query(
      "SELECT id FROM accounts WHERE wallet_address = $1", [transfer.from]);
    const accountId = owners[0]?.id || null;

    const enough = ticketPrice > 0n && BigInt(transfer.amount) >= ticketPrice;
    const grantTicket = Boolean(accountId && seasonKey && enough);

    // ON CONFLICT DO NOTHING is the entire protection against double crediting.
    // If the row already exists, rowCount will be zero and the ticket will not
    // be issued a second time.
    const { rowCount } = await query(
      `INSERT INTO chain_payments
         (tx_hash, log_index, block_number, from_address, amount_wei, account_id, season_key, credited_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (tx_hash, log_index) DO NOTHING`,
      [transfer.txHash, transfer.logIndex, transfer.blockNumber, transfer.from, transfer.amount,
       accountId, grantTicket ? seasonKey : null, grantTicket ? new Date() : null]);
    if (!rowCount || !grantTicket) continue;

    await query(
      `INSERT INTO season_entries (season_key, account_id, status, controller_wallet)
       VALUES ($1,$2,'purchased',$3)
       ON CONFLICT (season_key, account_id) DO UPDATE
         SET status = CASE WHEN season_entries.status = 'completed'
                           THEN 'purchased' ELSE season_entries.status END`,
      [seasonKey, accountId, transfer.from]);
    await query(
      `INSERT INTO mailbox(account_id, subject, body)
       VALUES ($1, 'Season Entry Ticket confirmed', $2)`,
      [accountId, `Your payment was confirmed on chain. Your entry to ${seasonKey} is ready.`]);
    credited += 1;
  }

  await query(
    `INSERT INTO chain_cursor(id, last_block, updated_at) VALUES (1,$1, now())
     ON CONFLICT (id) DO UPDATE SET last_block = $1, updated_at = now()`, [targetBlock]);
  return { transfersRead: transfers.length, ticketsCredited: credited, throughBlock: targetBlock };
}
