// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {CarbonCredit} from "../src/CarbonCredit.sol";

contract CarbonCreditTest is Test {
    CarbonCredit credit;
    address admin = address(0xA11CE);
    address verifier = address(0xBEEF);
    address buyer = address(0xB0B);
    address other = address(0xCAFE);

    event CreditsRetired(
        uint256 indexed projectId,
        address indexed from,
        uint256 amount,
        string beneficiary,
        string reason
    );

    function setUp() public {
        credit = new CarbonCredit(admin);
        bytes32 role = credit.VERIFIER_ROLE();
        vm.prank(admin);
        credit.grantRole(role, verifier);

        vm.prank(verifier);
        credit.mint(buyer, 1, 100, "ipfs://project-1", 12);
    }

    // ---- mint (Day 1) ----

    function test_VerifierCanMint() public view {
        assertEq(credit.balanceOf(buyer, 1), 100);
        assertEq(credit.uri(1), "ipfs://project-1");
    }

    function test_NonVerifierCannotMint() public {
        vm.prank(buyer);
        vm.expectRevert();
        credit.mint(buyer, 2, 100, "ipfs://project-2", 12);
    }

    // ---- retire (Day 2) ----

    function test_RetireBurnsCreditsAndEmitsEvent() public {
        vm.expectEmit(true, true, false, true);
        emit CreditsRetired(1, buyer, 40, "Acme Corp", "2026 offset");

        vm.prank(buyer);
        credit.retire(1, 40, "Acme Corp", "2026 offset");

        assertEq(credit.balanceOf(buyer, 1), 60);
    }

    function test_CannotRetireMoreThanOwned() public {
        vm.prank(buyer);
        vm.expectRevert();
        credit.retire(1, 101, "Acme Corp", "too many");
    }

    function test_CannotRetireZero() public {
        vm.prank(buyer);
        vm.expectRevert();
        credit.retire(1, 0, "Acme Corp", "zero");
    }

    function test_NonOwnerCannotRetire() public {
        vm.prank(other);
        vm.expectRevert();
        credit.retire(1, 10, "Someone", "not mine");
    }

    // ---- the double-counting proof ----

    function test_RetiredCreditsCannotBeRetiredAgain() public {
        vm.startPrank(buyer);
        credit.retire(1, 100, "Acme Corp", "2026 offset");

        vm.expectRevert();
        credit.retire(1, 1, "Acme Corp", "double count");
        vm.stopPrank();
    }

    function test_RetiredCreditsCannotBeTransferred() public {
        vm.startPrank(buyer);
        credit.retire(1, 100, "Acme Corp", "2026 offset");

        vm.expectRevert();
        credit.safeTransferFrom(buyer, other, 1, 1, "");
        vm.stopPrank();
    }

    function test_PartialRetireLeavesRestTransferable() public {
        vm.startPrank(buyer);
        credit.retire(1, 30, "Acme Corp", "partial");
        credit.safeTransferFrom(buyer, other, 1, 70, "");
        vm.stopPrank();

        assertEq(credit.balanceOf(buyer, 1), 0);
        assertEq(credit.balanceOf(other, 1), 70);
    }
}