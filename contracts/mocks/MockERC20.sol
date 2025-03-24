// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockERC20
 * @dev Contrat de stablecoin mock pour les tests
 */
contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    /**
     * @dev Fonction pour créer des jetons de test
     * @param account Adresse du destinataire
     * @param amount Montant à créer
     */
    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }
} 