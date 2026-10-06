// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @notice One token ID = one verified project. One unit = 1 tonne CO2.
contract CarbonCredit is ERC1155, AccessControl {
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    mapping(uint256 => string) private _projectURIs;

    event CreditsMinted(
        uint256 indexed projectId,
        address indexed to,
        uint256 amount,
        uint256 riskScore
    );

    event CreditsRetired(
        uint256 indexed projectId,
        address indexed from,
        uint256 amount,
        string beneficiary,
        string reason
    );

    constructor(address admin) ERC1155("") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    /// @notice Only the backend (VERIFIER_ROLE) can mint, after a project is approved.
    function mint(
        address to,
        uint256 projectId,
        uint256 amount,
        string calldata metadataURI,
        uint256 riskScore
    ) external onlyRole(VERIFIER_ROLE) {
        require(amount > 0, "Amount must be > 0");

        if (bytes(_projectURIs[projectId]).length == 0) {
            _projectURIs[projectId] = metadataURI;
            emit URI(metadataURI, projectId);
        }

        _mint(to, projectId, amount, "");
        emit CreditsMinted(projectId, to, amount, riskScore);
    }

    /// @notice Permanently burns the caller's credits. Retired credits cannot be transferred or retired again.
    function retire(
        uint256 projectId,
        uint256 amount,
        string calldata beneficiary,
        string calldata reason
    ) external {
        require(amount > 0, "Amount must be > 0");

        _burn(msg.sender, projectId, amount);
        emit CreditsRetired(projectId, msg.sender, amount, beneficiary, reason);
    }

    function uri(uint256 projectId) public view override returns (string memory) {
        return _projectURIs[projectId];
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}