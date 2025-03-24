// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/KeeperCompatibleInterface.sol";
import "./NFTCallSpread.sol";

/**
 * @title NFTCallSpreadKeeper
 * @dev Contrat Chainlink Keeper pour exercer automatiquement les call spreads arrivés à maturité
 */
contract NFTCallSpreadKeeper is KeeperCompatibleInterface {
    NFTCallSpread public nftCallSpread;
    uint256 public immutable checkGasLimit;
    
    // Dernière option exercée
    uint256 public lastProcessedId;
    
    // Nombre maximal d'options à exercer par transaction
    uint256 public maxBatchSize;
    
    constructor(address _nftCallSpread, uint256 _checkGasLimit, uint256 _maxBatchSize) {
        nftCallSpread = NFTCallSpread(_nftCallSpread);
        checkGasLimit = _checkGasLimit;
        maxBatchSize = _maxBatchSize;
    }
    
    /**
     * @dev Fonction vérifiée par Chainlink Automation pour déterminer si une exécution est nécessaire
     * @return upkeepNeeded Indique si une exécution est nécessaire
     * @return performData Données à passer à performUpkeep
     */
    function checkUpkeep(bytes calldata /* checkData */)
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        uint256 currentId = lastProcessedId;
        uint256 batchCount = 0;
        uint256[] memory expiredTokenIds = new uint256[](maxBatchSize);
        
        // Parcourir les tokens pour trouver ceux qui sont expirés et non exercés
        while (batchCount < maxBatchSize) {
            // Si le token n'existe pas, on arrête la recherche
            try nftCallSpread.ownerOf(currentId) returns (address) {
                // Vérifier si le token est un call spread et s'il est arrivé à maturité
                (uint256 strikePrice1, uint256 strikePrice2, uint256 expiry, uint256 collateral, address seller, address buyer, bool exercised) = 
                    getNFTCallSpreadDetails(currentId);
                
                // Si le token est arrivé à maturité et n'a pas été exercé
                if (!exercised && expiry <= block.timestamp) {
                    expiredTokenIds[batchCount] = currentId;
                    batchCount++;
                }
            } catch {
                // Si le token n'existe pas, on passe au suivant
            }
            
            currentId++;
        }
        
        // Préparer les données pour performUpkeep si nécessaire
        if (batchCount > 0) {
            // Réduire le tableau à la taille réelle
            uint256[] memory tokenIdsToExercise = new uint256[](batchCount);
            for (uint256 i = 0; i < batchCount; i++) {
                tokenIdsToExercise[i] = expiredTokenIds[i];
            }
            
            performData = abi.encode(tokenIdsToExercise, currentId);
            upkeepNeeded = true;
        } else {
            upkeepNeeded = false;
        }
    }
    
    /**
     * @dev Fonction exécutée par Chainlink Automation lorsque checkUpkeep indique que c'est nécessaire
     * @param performData Données encodées par checkUpkeep
     */
    function performUpkeep(bytes calldata performData) external override {
        (uint256[] memory tokenIdsToExercise, uint256 nextId) = abi.decode(performData, (uint256[], uint256));
        
        // Exercer chaque option
        for (uint256 i = 0; i < tokenIdsToExercise.length; i++) {
            try nftCallSpread.exerciseCallSpread(tokenIdsToExercise[i]) {
                // Option exercée avec succès
            } catch {
                // En cas d'erreur, continuer avec l'option suivante
            }
        }
        
        // Mettre à jour le dernier ID traité
        lastProcessedId = nextId;
    }
    
    /**
     * @dev Récupère les détails d'un call spread
     * @param tokenId ID du token
     * @return strikePrice1 Prix d'exercice inférieur
     * @return strikePrice2 Prix d'exercice supérieur
     * @return expiry Date d'expiration
     * @return collateral Montant du collatéral
     * @return seller Adresse du vendeur
     * @return buyer Adresse de l'acheteur
     * @return exercised Indique si l'option a été exercée
     */
    function getNFTCallSpreadDetails(uint256 tokenId) internal view returns (
        uint256 strikePrice1,
        uint256 strikePrice2,
        uint256 expiry,
        uint256 collateral,
        address seller,
        address buyer,
        bool exercised
    ) {
        // Accéder aux champs individuels
        (strikePrice1, strikePrice2, expiry, collateral, seller, buyer, exercised) = nftCallSpread.callSpreads(tokenId);
        return (strikePrice1, strikePrice2, expiry, collateral, seller, buyer, exercised);
    }
    
    /**
     * @dev Fonction pour mettre à jour le nombre maximal d'options à exercer par transaction
     * @param _maxBatchSize Nouvelle taille de lot maximale
     */
    function setMaxBatchSize(uint256 _maxBatchSize) external {
        // Cette fonction devrait avoir une restriction d'accès dans un environnement de production
        maxBatchSize = _maxBatchSize;
    }
} 