// Script de déploiement pour le contrat NFTCallSpread
const hre = require("hardhat");

async function main() {
  console.log("Déploiement du contrat NFTCallSpread...");

  // Adresses pour le testnet BNB
  // Ces adresses sont des exemples et doivent être remplacées par les vraies adresses sur le testnet BNB
  const STABLECOIN_ADDRESS = "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd"; // USDT sur BNB testnet (à vérifier)
  const BTC_USD_PRICE_FEED = "0x5741306c21795FdCBb9b265Ea0255F499DFe515C"; // Chainlink BTC/USD sur BNB testnet (à vérifier)

  // Déployer le contrat
  const NFTCallSpread = await hre.ethers.getContractFactory("NFTCallSpread");
  const nftCallSpread = await NFTCallSpread.deploy(STABLECOIN_ADDRESS, BTC_USD_PRICE_FEED);

  await nftCallSpread.waitForDeployment();
  
  const address = await nftCallSpread.getAddress();
  console.log(`NFTCallSpread déployé à l'adresse: ${address}`);

  console.log("Attendez environ 1 minute pour que le contrat soit vérifié sur BscScan...");
  
  // Vérifier le contrat sur BscScan
  try {
    await hre.run("verify:verify", {
      address: address,
      constructorArguments: [STABLECOIN_ADDRESS, BTC_USD_PRICE_FEED],
    });
    console.log("Contrat vérifié sur BscScan!");
  } catch (error) {
    console.error("Erreur lors de la vérification du contrat:", error);
  }
}

// Exécuter le déploiement
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 