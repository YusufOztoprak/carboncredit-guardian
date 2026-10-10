// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {CarbonCredit} from "../src/CarbonCredit.sol";

contract Deploy is Script {
    function run() external {
        address verifier = vm.envAddress("VERIFIER");

        vm.startBroadcast();
        (, address deployer, ) = vm.readCallers();

        CarbonCredit credit = new CarbonCredit(deployer);
        credit.grantRole(credit.VERIFIER_ROLE(), verifier);
        vm.stopBroadcast();

        console.log("CarbonCredit deployed at:", address(credit));
        console.log("Admin:", deployer);
        console.log("Verifier:", verifier);
    }
}