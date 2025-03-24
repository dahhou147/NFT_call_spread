// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface KeeperCompatibleInterface {
  /**
   * @notice méthode qui est simulée par le keeper pour vérifier si l'upkeep est nécessaire
   * @param checkData données passées à la fonction checkUpkeep pour indiquer le type d'upkeep requis
   * @return upkeepNeeded boolean indiquant si l'upkeep est nécessaire, performData bytes qui seront passées à performUpkeep
   */
  function checkUpkeep(bytes calldata checkData) external view returns (bool upkeepNeeded, bytes memory performData);

  /**
   * @notice méthode qui est appelée par le keeper pour effectuer l'upkeep
   * @param performData données passées à performUpkeep
   */
  function performUpkeep(bytes calldata performData) external;
} 