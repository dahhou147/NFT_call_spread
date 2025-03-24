// Script pour configurer l'automatisation Chainlink pour notre contrat NFTCallSpread
const hre = require("hardhat");

// NOTE: Ce script est indicatif et devra être adapté aux détails spécifiques du réseau et 
// de l'implémentation Chainlink Automation sur BNB Chain

async function main() {
  console.log("Configuration de l'automatisation Chainlink pour NFTCallSpread...");

  // Adresse du contrat NFTCallSpread déployé
  const NFT_CALL_SPREAD_ADDRESS = "REMPLACER_PAR_ADRESSE_DEPLOYEE";
  
  // Vérifier que l'adresse a été configurée
  if (NFT_CALL_SPREAD_ADDRESS === "REMPLACER_PAR_ADRESSE_DEPLOYEE") {
    console.error("Veuillez remplacer l'adresse du contrat NFTCallSpread par l'adresse réelle déployée.");
    return;
  }

  console.log(`Adresse du contrat NFTCallSpread: ${NFT_CALL_SPREAD_ADDRESS}`);
  
  // Récupérer le contrat
  const NFTCallSpread = await hre.ethers.getContractAt("NFTCallSpread", NFT_CALL_SPREAD_ADDRESS);

  /*
   * ETAPES D'INTEGRATION AVEC CHAINLINK AUTOMATION:
   *
   * 1. Visitez https://automation.chain.link/bnb-testnet
   * 2. Connectez votre wallet
   * 3. Créez un nouvel Upkeep en suivant les étapes :
   *    - Sélectionner "Custom Logic"
   *    - Entrer l'adresse de votre contrat NFTCallSpread
   *    - Configurer les conditions pour vérifier périodiquement les options arrivées à maturité
   *    - Financer l'Upkeep avec des LINK pour payer les frais d'exécution
   * 
   * Pour une implémentation complète, vous devriez créer un contrat compatible avec l'interface
   * de Chainlink Automation qui vérifie si des options sont arrivées à maturité et qui appelle
   * la fonction exerciseCallSpread pour chaque option concernée.
   */

  console.log(`
Pour configurer l'Automation Chainlink manuellement:

1. Allez sur https://automation.chain.link/bnb-testnet
2. Connectez votre wallet
3. Créez un nouvel Upkeep avec les paramètres suivants:
   - Nom: NFTCallSpread Exerciser
   - Adresse du contrat: ${NFT_CALL_SPREAD_ADDRESS}
   - Intervalle de temps: 1 heure (ou selon vos besoins)
   - Gas Limit: 500,000

Pour implémenter une solution complète d'automatisation:
1. Créez un contrat KeeperCompatible qui implémente les fonctions checkUpkeep et performUpkeep
2. Ce contrat doit vérifier quels call spreads sont arrivés à maturité et les exercer
3. Déployez et configurez ce contrat avec Chainlink Automation
  `);
  
  console.log("Script de configuration terminé! Suivez les instructions ci-dessus pour compléter la configuration manuellement.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 