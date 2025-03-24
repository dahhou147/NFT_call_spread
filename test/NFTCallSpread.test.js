const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NFTCallSpread", function () {
  let NFTCallSpread;
  let nftCallSpread;
  let MockStablecoin;
  let mockStablecoin;
  let MockPriceFeed;
  let mockPriceFeed;
  let owner;
  let seller;
  let buyer;
  let addrs;

  // Paramètres pour les tests
  const INITIAL_BALANCE = ethers.parseUnits("1000", 18); // 1000 stablecoins
  const COLLATERAL_AMOUNT = ethers.parseUnits("100", 18); // 100 stablecoins
  const STRIKE_PRICE_1 = 25000 * 10**8; // 25,000 USD * 10^8 (format Chainlink)
  const STRIKE_PRICE_2 = 30000 * 10**8; // 30,000 USD * 10^8 (format Chainlink)
  const ONE_DAY = 24 * 60 * 60; // 1 jour en secondes

  beforeEach(async function () {
    // Obtenir les signataires pour les tests
    [owner, seller, buyer, ...addrs] = await ethers.getSigners();

    // Déployer le stablecoin mock
    MockStablecoin = await ethers.getContractFactory("MockERC20");
    mockStablecoin = await MockStablecoin.deploy("Mock USDT", "USDT");
    await mockStablecoin.waitForDeployment();

    // Déployer le price feed mock
    MockPriceFeed = await ethers.getContractFactory("MockV3Aggregator");
    mockPriceFeed = await MockPriceFeed.deploy(8, 27000 * 10**8); // 8 décimales, prix initial de 27,000 USD
    await mockPriceFeed.waitForDeployment();

    // Déployer le contrat NFTCallSpread
    NFTCallSpread = await ethers.getContractFactory("NFTCallSpread");
    nftCallSpread = await NFTCallSpread.deploy(
      await mockStablecoin.getAddress(),
      await mockPriceFeed.getAddress()
    );
    await nftCallSpread.waitForDeployment();

    // Donner des stablecoins au vendeur et à l'acheteur
    await mockStablecoin.mint(seller.address, INITIAL_BALANCE);
    await mockStablecoin.mint(buyer.address, INITIAL_BALANCE);

    // Approuver le contrat NFTCallSpread pour utiliser les stablecoins
    await mockStablecoin.connect(seller).approve(await nftCallSpread.getAddress(), INITIAL_BALANCE);
    await mockStablecoin.connect(buyer).approve(await nftCallSpread.getAddress(), INITIAL_BALANCE);
  });

  describe("Création et achat de call spread", function () {
    it("Devrait permettre de créer un call spread", async function () {
      // Timestamp actuel
      const blockNumBefore = await ethers.provider.getBlockNumber();
      const blockBefore = await ethers.provider.getBlock(blockNumBefore);
      const currentTimestamp = blockBefore.timestamp;
      const expiryTimestamp = currentTimestamp + ONE_DAY;

      // Créer un call spread
      await expect(nftCallSpread.connect(seller).createCallSpread(
        STRIKE_PRICE_1,
        STRIKE_PRICE_2,
        expiryTimestamp,
        COLLATERAL_AMOUNT,
        "https://example.com/metadata/0"
      )).to.emit(nftCallSpread, "CallSpreadCreated")
        .withArgs(0, seller.address, STRIKE_PRICE_1, STRIKE_PRICE_2, expiryTimestamp);

      // Vérifier que le token a été créé
      expect(await nftCallSpread.ownerOf(0)).to.equal(seller.address);

      // Vérifier les détails du call spread
      const callSpread = await nftCallSpread.callSpreads(0);
      expect(callSpread.strikePrice1).to.equal(STRIKE_PRICE_1);
      expect(callSpread.strikePrice2).to.equal(STRIKE_PRICE_2);
      expect(callSpread.expiry).to.equal(expiryTimestamp);
      expect(callSpread.collateral).to.equal(COLLATERAL_AMOUNT);
      expect(callSpread.seller).to.equal(seller.address);
      expect(callSpread.buyer).to.equal(ethers.ZeroAddress);
      expect(callSpread.exercised).to.equal(false);
    });

    it("Devrait permettre d'acheter un call spread", async function () {
      // Timestamp actuel
      const blockNumBefore = await ethers.provider.getBlockNumber();
      const blockBefore = await ethers.provider.getBlock(blockNumBefore);
      const currentTimestamp = blockBefore.timestamp;
      const expiryTimestamp = currentTimestamp + ONE_DAY;

      // Créer un call spread
      await nftCallSpread.connect(seller).createCallSpread(
        STRIKE_PRICE_1,
        STRIKE_PRICE_2,
        expiryTimestamp,
        COLLATERAL_AMOUNT,
        "https://example.com/metadata/0"
      );

      // Acheter le call spread
      await expect(nftCallSpread.connect(buyer).buyCallSpread(0))
        .to.emit(nftCallSpread, "CallSpreadPurchased")
        .withArgs(0, buyer.address);

      // Vérifier que le token a été transféré
      expect(await nftCallSpread.ownerOf(0)).to.equal(buyer.address);

      // Vérifier les détails du call spread
      const callSpread = await nftCallSpread.callSpreads(0);
      expect(callSpread.buyer).to.equal(buyer.address);
    });
  });

  describe("Exercice du call spread", function () {
    beforeEach(async function () {
      // Timestamp actuel
      const blockNumBefore = await ethers.provider.getBlockNumber();
      const blockBefore = await ethers.provider.getBlock(blockNumBefore);
      const currentTimestamp = blockBefore.timestamp;
      const expiryTimestamp = currentTimestamp + ONE_DAY;

      // Créer un call spread
      await nftCallSpread.connect(seller).createCallSpread(
        STRIKE_PRICE_1,
        STRIKE_PRICE_2,
        expiryTimestamp,
        COLLATERAL_AMOUNT,
        "https://example.com/metadata/0"
      );

      // Acheter le call spread
      await nftCallSpread.connect(buyer).buyCallSpread(0);
    });

    it("Ne devrait pas permettre d'exercer avant l'expiration", async function () {
      await expect(nftCallSpread.connect(buyer).exerciseCallSpread(0))
        .to.be.revertedWith("L'option n'a pas encore expire");
    });

    it("Devrait calculer correctement le payoff lorsque le prix est inférieur au strike1", async function () {
      // Mettre à jour le prix à 20,000 USD (en dessous de strike1)
      await mockPriceFeed.updateAnswer(20000 * 10**8);
      
      // Calculer le payoff
      const payoff = await nftCallSpread.calculatePayoff(0, 20000 * 10**8);
      expect(payoff).to.equal(0);
    });

    it("Devrait calculer correctement le payoff lorsque le prix est entre strike1 et strike2", async function () {
      // Mettre à jour le prix à 27,000 USD (entre strike1 et strike2)
      await mockPriceFeed.updateAnswer(27000 * 10**8);
      
      // Calculer le payoff
      const payoff = await nftCallSpread.calculatePayoff(0, 27000 * 10**8);
      expect(payoff).to.equal(2000 * 10**8); // 27000 - 25000 = 2000
    });

    it("Devrait calculer correctement le payoff lorsque le prix est supérieur au strike2", async function () {
      // Mettre à jour le prix à 35,000 USD (au-dessus de strike2)
      await mockPriceFeed.updateAnswer(35000 * 10**8);
      
      // Calculer le payoff
      const payoff = await nftCallSpread.calculatePayoff(0, 35000 * 10**8);
      expect(payoff).to.equal(5000 * 10**8); // 30000 - 25000 = 5000
    });

    it("Devrait exercer correctement le call spread à l'expiration", async function () {
      // Avancer le temps après l'expiration
      await ethers.provider.send("evm_increaseTime", [ONE_DAY + 1]);
      await ethers.provider.send("evm_mine", []);

      // Mettre à jour le prix à 28,000 USD
      await mockPriceFeed.updateAnswer(28000 * 10**8);

      // Calculer le payoff attendu
      const expectedPayoff = 3000 * 10**8; // 28000 - 25000 = 3000
      const expectedPayoffInWei = ethers.parseUnits("3", 18); // Convertir en wei (3 tokens)
      const expectedRemainingCollateral = COLLATERAL_AMOUNT - expectedPayoffInWei;

      // Soldes avant exercice
      const buyerBalanceBefore = await mockStablecoin.balanceOf(buyer.address);
      const sellerBalanceBefore = await mockStablecoin.balanceOf(seller.address);

      // Exercer l'option
      await expect(nftCallSpread.connect(buyer).exerciseCallSpread(0))
        .to.emit(nftCallSpread, "CallSpreadExercised")
        .withArgs(0, expectedPayoffInWei, 28000 * 10**8);

      // Vérifier que l'option a été exercée
      const callSpread = await nftCallSpread.callSpreads(0);
      expect(callSpread.exercised).to.equal(true);

      // Vérifier les soldes après exercice
      const buyerBalanceAfter = await mockStablecoin.balanceOf(buyer.address);
      const sellerBalanceAfter = await mockStablecoin.balanceOf(seller.address);
      
      expect(buyerBalanceAfter - buyerBalanceBefore).to.equal(expectedPayoffInWei);
      expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(expectedRemainingCollateral);
    });
  });
}); 