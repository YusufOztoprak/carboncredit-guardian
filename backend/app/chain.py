"""On-chain integration (Sepolia): mint verified credits from the backend.

The backend wallet holds VERIFIER_ROLE on the ERC-1155 contract, so only
projects that passed verification can ever get credits. Transfers and
retirements are signed by users' own wallets in the frontend.
"""

import json
from functools import lru_cache
from pathlib import Path

from web3 import Web3

from app.config import settings

ABI_PATH = Path(__file__).resolve().parent.parent / "abi" / "CarbonCredit.json"
RECEIPT_TIMEOUT_S = 120


class ChainError(Exception):
    """Raised when the chain is not configured or a transaction fails."""


@lru_cache(maxsize=1)
def _abi() -> list:
    return json.loads(ABI_PATH.read_text())


@lru_cache(maxsize=1)
def _web3() -> Web3:
    if not settings.sepolia_rpc_url:
        raise ChainError("SEPOLIA_RPC_URL is not set")
    w3 = Web3(Web3.HTTPProvider(settings.sepolia_rpc_url, request_kwargs={"timeout": 30}))
    if w3.eth.chain_id != settings.chain_id:
        raise ChainError(f"RPC is on chain {w3.eth.chain_id}, expected {settings.chain_id} (Sepolia)")
    return w3


def _contract(w3: Web3):
    if not settings.contract_address:
        raise ChainError("CONTRACT_ADDRESS is not set")
    return w3.eth.contract(address=Web3.to_checksum_address(settings.contract_address), abi=_abi())


def verifier_address() -> str:
    if not settings.verifier_private_key:
        raise ChainError("VERIFIER_PRIVATE_KEY is not set")
    return _web3().eth.account.from_key(settings.verifier_private_key).address


def mint_credits(to: str, project_id: int, amount: int, metadata_uri: str, risk_score_bp: int) -> str:
    """Send mint() from the verifier wallet and wait for it to be mined. Returns the tx hash."""
    try:
        w3 = _web3()
        contract = _contract(w3)
        account = w3.eth.account.from_key(settings.verifier_private_key)
        tx = contract.functions.mint(
            Web3.to_checksum_address(to), project_id, amount, metadata_uri, risk_score_bp
        ).build_transaction(
            {
                "from": account.address,
                "nonce": w3.eth.get_transaction_count(account.address, "pending"),
                "chainId": settings.chain_id,
            }
        )
        signed = account.sign_transaction(tx)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=RECEIPT_TIMEOUT_S)
    except ChainError:
        raise
    except Exception as exc:  # web3 raises many different error types
        raise ChainError(f"Mint transaction failed: {exc}") from exc

    hex_hash = "0x" + tx_hash.hex().removeprefix("0x")
    if receipt["status"] != 1:
        raise ChainError(f"Mint transaction reverted: {hex_hash}")
    return hex_hash