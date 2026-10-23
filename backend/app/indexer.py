"""Index contract events from Sepolia into PostgreSQL.

The contract is the source of truth for who owns / retired which credits.
We copy its events into the credit_events table so the API can serve a fast,
human-readable history for the public verification page.

Event mapping (one row per credit movement):
- CreditsMinted                      -> "mint"
- CreditsRetired                     -> "retire"
- TransferSingle / TransferBatch     -> "transfer" (only wallet-to-wallet;
  mints and burns also emit these, but are already covered above)

Sync is incremental: the last indexed block is stored in sync_state, so each
run only scans new blocks. It is safe to run repeatedly (rows are unique per
tx hash + log index).
"""

import threading
import time
from datetime import datetime, timezone

from eth_abi import decode as abi_decode
from sqlalchemy import select
from sqlalchemy.orm import Session
from web3 import Web3

from app.chain import ChainError, _abi, _contract, _web3
from app.config import settings
from app.models import CreditEvent, Project, SyncState

ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
SYNC_KEY = "contract_events"
INITIAL_CHUNK = 5_000  # blocks per eth_getLogs request (halved automatically if the RPC refuses)
MIN_CHUNK = 50
MIN_SYNC_INTERVAL_S = 10  # lazy sync from read endpoints at most this often

_sync_lock = threading.Lock()
_last_sync_monotonic = 0.0


def _event_abis() -> dict[str, dict]:
    """topic0 hex -> event ABI, for the events we index."""
    wanted = {"CreditsMinted", "CreditsRetired", "TransferSingle", "TransferBatch"}
    result = {}
    for item in _abi():
        if item.get("type") == "event" and item["name"] in wanted:
            signature = f"{item['name']}({','.join(i['type'] for i in item['inputs'])})"
            result[Web3.keccak(text=signature).hex().removeprefix("0x")] = item
    return result


def decode_log(log: dict, event_abi: dict) -> dict:
    """Decode a raw log into {arg_name: value} using the event ABI."""
    topics = [t.hex() if isinstance(t, (bytes, bytearray)) else str(t) for t in log["topics"]]
    indexed = [i for i in event_abi["inputs"] if i["indexed"]]
    plain = [i for i in event_abi["inputs"] if not i["indexed"]]

    args = {}
    for inp, topic in zip(indexed, topics[1:]):
        raw = bytes.fromhex(topic.removeprefix("0x"))
        args[inp["name"]] = abi_decode([inp["type"]], raw)[0]
    data = log["data"]
    data_bytes = bytes(data) if isinstance(data, (bytes, bytearray)) else bytes.fromhex(str(data).removeprefix("0x"))
    for inp, value in zip(plain, abi_decode([i["type"] for i in plain], data_bytes)):
        args[inp["name"]] = value
    for key, value in args.items():
        if isinstance(value, str) and value.startswith("0x") and len(value) == 42:
            args[key] = Web3.to_checksum_address(value)
    return args


def rows_from_log(log: dict, event_abi: dict) -> list[dict]:
    """Turn one decoded log into 0..n credit_events rows."""
    args = decode_log(log, event_abi)
    tx_hash = log["transactionHash"]
    tx_hex = "0x" + (tx_hash.hex() if isinstance(tx_hash, (bytes, bytearray)) else str(tx_hash)).removeprefix("0x")
    base = {"tx_hash": tx_hex, "block_number": int(log["blockNumber"]), "log_index": int(log["logIndex"])}
    name = event_abi["name"]

    if name == "CreditsMinted":
        return [{**base, "event_type": "mint", "project_id": int(args["projectId"]),
                 "to_address": args["to"], "amount": int(args["amount"])}]
    if name == "CreditsRetired":
        return [{**base, "event_type": "retire", "project_id": int(args["projectId"]),
                 "from_address": args["from"], "amount": int(args["amount"]),
                 "beneficiary": args["beneficiary"], "reason": args["reason"]}]

    sender, receiver = args["from"], args["to"]
    if ZERO_ADDRESS in (sender, receiver):
        return []  # mint / burn leg, already recorded via CreditsMinted / CreditsRetired
    if name == "TransferSingle":
        return [{**base, "event_type": "transfer", "project_id": int(args["id"]),
                 "from_address": sender, "to_address": receiver, "amount": int(args["value"])}]
    # TransferBatch: one row per token id; sub-index keeps (tx_hash, log_index) unique
    return [
        {**base, "log_index": base["log_index"] * 1000 + i, "event_type": "transfer",
         "project_id": int(token_id), "from_address": sender, "to_address": receiver, "amount": int(value)}
        for i, (token_id, value) in enumerate(zip(args["ids"], args["values"]))
    ]


def _is_pruned_error(exc: Exception) -> bool:
    """Free RPCs drop old logs ("pruned history unavailable", code 4444)."""
    text = str(exc).lower()
    return "pruned" in text or "4444" in text


def _probe(w3: Web3, address: str, block: int) -> bool:
    """True if the RPC still serves logs for this block."""
    try:
        w3.eth.get_logs({"address": address, "fromBlock": block, "toBlock": block})
        return True
    except Exception as exc:
        if _is_pruned_error(exc):
            return False
        raise ChainError(f"eth_getLogs failed at block {block}: {exc}") from exc


def _earliest_available(w3: Web3, address: str, pruned_block: int, latest: int) -> int:
    """First block >= pruned_block whose logs are still served (exponential + binary search)."""
    low, step = pruned_block, 1_000
    high = None
    while high is None:
        candidate = min(low + step, latest)
        if _probe(w3, address, candidate):
            high = candidate
        elif candidate == latest:
            raise ChainError("RPC serves no log history up to the latest block")
        else:
            low, step = candidate, step * 2
    while high - low > 1:  # invariant: low is pruned, high is available
        mid = (low + high) // 2
        if _probe(w3, address, mid):
            high = mid
        else:
            low = mid
    return high


def _get_logs_chunked(w3: Web3, address: str, start: int, end: int) -> tuple[list[dict], list[tuple[int, int]]]:
    """Fetch logs in chunks. Returns (logs, skipped ranges the RPC no longer serves)."""
    logs, skipped, chunk, cursor = [], [], INITIAL_CHUNK, start
    while cursor <= end:
        to_block = min(cursor + chunk - 1, end)
        try:
            logs.extend(w3.eth.get_logs({"address": address, "fromBlock": cursor, "toBlock": to_block}))
            cursor = to_block + 1
        except Exception as exc:  # RPCs reject large ranges / pruned ranges with different errors
            if _is_pruned_error(exc):
                resume = _earliest_available(w3, address, cursor, end)
                skipped.append((cursor, resume - 1))
                cursor = resume
                continue
            if chunk <= MIN_CHUNK:
                raise ChainError(f"eth_getLogs failed for blocks {cursor}-{to_block}: {exc}") from exc
            chunk = max(MIN_CHUNK, chunk // 2)
    return logs, skipped


def sync_events(db: Session, from_block: int | None = None) -> dict:
    """Index new contract events. Returns a small summary.

    from_block forces a rescan from that block (safe: existing rows are skipped).
    """
    with _sync_lock:
        w3 = _web3()
        contract = _contract(w3)
        state = db.get(SyncState, SYNC_KEY)
        if from_block is not None:
            start = from_block
        else:
            start = (state.last_block + 1) if state else settings.contract_start_block
        latest = w3.eth.block_number
        if start > latest:
            return {"from_block": start, "to_block": latest, "new_events": 0, "skipped": []}

        abis = _event_abis()
        known_projects = set(db.scalars(select(Project.id)))
        timestamps: dict[int, datetime] = {}
        added = 0
        logs, skipped = _get_logs_chunked(w3, contract.address, start, latest)
        for log in logs:
            topic0 = log["topics"][0]
            topic0 = (topic0.hex() if isinstance(topic0, (bytes, bytearray)) else str(topic0)).removeprefix("0x")
            event_abi = abis.get(topic0)
            if event_abi is None:
                continue
            for row in rows_from_log(log, event_abi):
                if row["project_id"] not in known_projects:
                    continue  # e.g. manual test mints on-chain that never existed in our DB
                exists = db.scalar(
                    select(CreditEvent.id).where(
                        CreditEvent.tx_hash == row["tx_hash"], CreditEvent.log_index == row["log_index"]
                    )
                )
                if exists:
                    continue
                block = row["block_number"]
                if block not in timestamps:
                    ts = w3.eth.get_block(block)["timestamp"]
                    timestamps[block] = datetime.fromtimestamp(ts, tz=timezone.utc)
                db.add(CreditEvent(**row, block_timestamp=timestamps[block]))
                added += 1

        if state is None:
            state = SyncState(key=SYNC_KEY, last_block=latest)
            db.add(state)
        else:
            state.last_block = latest
        db.commit()
        return {"from_block": start, "to_block": latest, "new_events": added, "skipped": skipped}


def sync_if_stale(db: Session) -> str | None:
    """Lazy sync for read endpoints. Returns an error message instead of raising."""
    global _last_sync_monotonic
    if time.monotonic() - _last_sync_monotonic < MIN_SYNC_INTERVAL_S:
        return None
    try:
        sync_events(db)
        _last_sync_monotonic = time.monotonic()
        return None
    except ChainError as exc:
        db.rollback()
        return str(exc)
    except Exception as exc:  # never break the history page because the RPC is down
        db.rollback()
        return f"Chain sync failed: {exc}"
