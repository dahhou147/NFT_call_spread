// Script de déploiement pour le contrat NFTCallSpreadKeeper
const hre = require("hardhat");

async function main() {
  console.log("Déploiement du contrat NFTCallSpreadKeeper...");

  // Obtenir le réseau actuel
  const network = hre.network.name;
  console.log(`Réseau de déploiement: ${network}`);

  // ⚠️ IMPORTANT: Remplacez cette valeur par l'adresse du contrat NFTCallSpread déployé ⚠️
  const NFT_CALL_SPREAD_ADDRESS = "0x5fbdb2315678afecb367f032d93f642f64180aa3";
  
  // Vérifier que l'adresse a été configurée
  if (NFT_CALL_SPREAD_ADDRESS === "REMPLACER_PAR_ADRESSE_DEPLOYEE") {
    console.error("⚠️ Veuillez remplacer l'adresse du contrat NFTCallSpread par l'adresse réelle déployée dans le fichier scripts/deployKeeper.js.");
    return;
  }

  const CHECK_GAS_LIMIT = 2000000; // Gas limit pour la fonction checkUpkeep
  const MAX_BATCH_SIZE = 10; // Nombre maximal d'options à exercer par transaction

  // Déployer le contrat Keeper
  const NFTCallSpreadKeeper = await hre.ethers.getContractFactory("NFTCallSpreadKeeper");
  const keeper = await NFTCallSpreadKeeper.deploy(
    NFT_CALL_SPREAD_ADDRESS,
    CHECK_GAS_LIMIT,
    MAX_BATCH_SIZE
  );

  await keeper.waitForDeployment();
  
  const address = await keeper.getAddress();
  console.log(`NFTCallSpreadKeeper déployé à l'adresse: ${address}`);

  console.log("Attendez environ 1 minute pour que le contrat soit vérifié sur l'explorateur...");
  
  // Vérifier le contrat sur l'explorateur
  try {
    await hre.run("verify:verify", {
      address: address,
      constructorArguments: [
        NFT_CALL_SPREAD_ADDRESS,
        CHECK_GAS_LIMIT,
        MAX_BATCH_SIZE
      ],
    });
    console.log("Contrat vérifié sur l'explorateur!");
  } catch (error) {
    console.error("Erreur lors de la vérification du contrat:", error);
  }
  
  // Obtenir le bon URL en fonction du réseau
  let chainlinkAutomationUrl = "";
  if (network === "bnbTestnet") {
    chainlinkAutomationUrl = "https://automation.chain.link/bnb-testnet";
  } else if (network === "polygonMumbai") {
    chainlinkAutomationUrl = "https://automation.chain.link/mumbai";
  }
  
  console.log(`
Une fois le contrat Keeper déployé, suivez ces étapes pour l'enregistrer avec Chainlink Automation:

1. Allez sur ${chainlinkAutomationUrl}
2. Connectez votre wallet
3. Créez un nouvel Upkeep en utilisant "Register new upkeep"
4. Sélectionnez "Custom logic" avec les paramètres:
   - Nom: NFTCallSpread Automation
   - Adresse du contrat: ${address}
   - Gas limit: ${CHECK_GAS_LIMIT}
   - Financement: 5 LINK (ou le montant recommandé)
5. Terminez l'enregistrement et confirmez la transaction

Votre contrat Keeper est maintenant configuré pour exercer automatiquement les call spreads arrivés à maturité.
  `);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 