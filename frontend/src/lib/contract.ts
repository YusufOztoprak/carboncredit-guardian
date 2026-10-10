import { parseAbi } from "viem";

export const CARBON_CREDIT_ADDRESS =
  "0x11d92Ad43f36Fc0598B5BeF8B8667939977E4083" as const;

export const carbonCreditAbi = parseAbi([
  "function balanceOf(address account, uint256 id) view returns (uint256)",
  "function uri(uint256 id) view returns (string)",
  "function safeTransferFrom(address from, address to, uint256 id, uint256 value, bytes data)",
  "function retire(uint256 projectId, uint256 amount, string beneficiary, string reason)",
]);