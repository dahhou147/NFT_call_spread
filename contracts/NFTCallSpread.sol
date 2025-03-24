// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/AggregatorV3Interface.sol";

/**
 * @title NFTCallSpread
 * @dev Contrat pour gérer des options financières call spread représentées par des NFTs
 */
contract NFTCallSpread is ERC721, ERC721URIStorage, Ownable {
    struct CallSpread {
        uint256 strikePrice1; // Prix d'exercice inférieur (en USD, multiplié par 10^8)
        uint256 strikePrice2; // Prix d'exercice supérieur (en USD, multiplié par 10^8)
        uint256 expiry;       // Timestamp d'expiration
        uint256 collateral;   // Montant de collatéral déposé (en stablecoins)
        address seller;       // Adresse du vendeur
        address buyer;        // Adresse de l'acheteur
        bool exercised;       // Flag indiquant si l'option a été exercée
    }

    // Compteur de tokenId pour le minting
    uint256 private _nextTokenId;
    
    // Mapping de tokenId vers CallSpread
    mapping(uint256 => CallSpread) public callSpreads;
    
    // Adresse du stablecoin utilisé comme collatéral
    IERC20 public stablecoin;
    
    // Oracle Chainlink pour le prix BTC/USD
    AggregatorV3Interface public priceFeed;
    
    // Événements
    event CallSpreadCreated(uint256 indexed tokenId, address seller, uint256 strikePrice1, uint256 strikePrice2, uint256 expiry);
    event CallSpreadPurchased(uint256 indexed tokenId, address buyer);
    event CallSpreadExercised(uint256 indexed tokenId, uint256 payoff, uint256 btcPrice);
    
    /**
     * @dev Constructeur initialisant le contrat
     * @param _stablecoin Adresse du contrat du stablecoin
     * @param _priceFeed Adresse de l'Oracle Chainlink pour BTC/USD
     */
    constructor(address _stablecoin, address _priceFeed) 
        ERC721("NFT Call Spread", "NFTCS") 
        Ownable(msg.sender)
    {
        stablecoin = IERC20(_stablecoin);
        priceFeed = AggregatorV3Interface(_priceFeed);
    }
    
    /**
     * @dev Créer un nouveau call spread
     * @param strikePrice1 Prix d'exercice inférieur
     * @param strikePrice2 Prix d'exercice supérieur
     * @param expiry Timestamp d'expiration
     * @param collateralAmount Montant de collatéral à déposer
     * @param _tokenURI URI des métadonnées pour le NFT
     */
    function createCallSpread(
        uint256 strikePrice1,
        uint256 strikePrice2,
        uint256 expiry,
        uint256 collateralAmount,
        string memory _tokenURI
    ) external returns (uint256) {
        require(strikePrice1 < strikePrice2, "Strike1 doit etre inferieur a Strike2");
        require(expiry > block.timestamp, "L'expiration doit etre dans le futur");
        require(collateralAmount > 0, "Le collateral doit etre positif");
        
        // Transférer le collatéral du vendeur au contrat
        require(stablecoin.transferFrom(msg.sender, address(this), collateralAmount), "Transfert de collateral echoue");
        
        // Incrémenter le compteur de tokenId
        uint256 tokenId = _nextTokenId++;
        
        // Créer le call spread
        callSpreads[tokenId] = CallSpread({
            strikePrice1: strikePrice1,
            strikePrice2: strikePrice2,
            expiry: expiry,
            collateral: collateralAmount,
            seller: msg.sender,
            buyer: address(0),
            exercised: false
        });
        
        // Minter le NFT au vendeur
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, _tokenURI);
        
        emit CallSpreadCreated(tokenId, msg.sender, strikePrice1, strikePrice2, expiry);
        
        return tokenId;
    }
    
    /**
     * @dev Acheter un call spread existant
     * @param tokenId ID du token du call spread à acheter
     */
    function buyCallSpread(uint256 tokenId) external {
        CallSpread storage cs = callSpreads[tokenId];
        require(cs.expiry > block.timestamp, "L'option a expire");
        require(cs.buyer == address(0), "L'option a deja ete achetee");
        require(ownerOf(tokenId) != msg.sender, "Vous ne pouvez pas acheter votre propre option");
        
        // Mettre à jour l'acheteur
        cs.buyer = msg.sender;
        
        // Transférer le NFT au nouvel acheteur
        address owner = ownerOf(tokenId);
        _transfer(owner, msg.sender, tokenId);
        
        emit CallSpreadPurchased(tokenId, msg.sender);
    }
    
    /**
     * @dev Exercer un call spread à l'expiration
     * @param tokenId ID du token du call spread à exercer
     */
    function exerciseCallSpread(uint256 tokenId) external {
        CallSpread storage cs = callSpreads[tokenId];
        require(!cs.exercised, "L'option a deja ete exercee");
        require(block.timestamp >= cs.expiry, "L'option n'a pas encore expire");
        
        // Marquer comme exercé
        cs.exercised = true;
        
        // Obtenir le prix BTC/USD actuel
        uint256 btcPrice = getCurrentBTCPrice();
        
        // Calculer le payoff
        uint256 payoff = calculatePayoff(tokenId, btcPrice);
        
        // Déterminer les montants à transférer
        address buyer = cs.buyer != address(0) ? cs.buyer : cs.seller;
        
        // Transférer le payoff à l'acheteur
        if (payoff > 0) {
            require(stablecoin.transfer(buyer, payoff), "Transfert de payoff echoue");
        }
        
        // Retourner le collatéral restant au vendeur
        uint256 remainingCollateral = cs.collateral - payoff;
        if (remainingCollateral > 0) {
            require(stablecoin.transfer(cs.seller, remainingCollateral), "Transfert de collateral restant echoue");
        }
        
        emit CallSpreadExercised(tokenId, payoff, btcPrice);
    }
    
    /**
     * @dev Calculer le payoff pour un call spread
     * @param tokenId ID du token du call spread
     * @param currentPrice Prix actuel de BTC/USD
     * @return Le montant du payoff
     */
    function calculatePayoff(uint256 tokenId, uint256 currentPrice) public view returns (uint256) {
        CallSpread storage cs = callSpreads[tokenId];
        
        if (currentPrice <= cs.strikePrice1) {
            // Prix en dessous du strike inférieur, payoff = 0
            return 0;
        } else if (currentPrice >= cs.strikePrice2) {
            // Prix au-dessus du strike supérieur, payoff = strikePrice2 - strikePrice1
            return cs.strikePrice2 - cs.strikePrice1;
        } else {
            // Prix entre les deux strikes, payoff = currentPrice - strikePrice1
            return currentPrice - cs.strikePrice1;
        }
    }
    
    /**
     * @dev Obtenir le prix actuel de BTC/USD depuis l'oracle Chainlink
     * @return Prix BTC/USD multiplié par 10^8
     */
    function getCurrentBTCPrice() public view returns (uint256) {
        (, int256 price, , , ) = priceFeed.latestRoundData();
        require(price > 0, "Prix BTC invalide");
        return uint256(price);
    }
    
    // Fonctions nécessaires pour override ERC721URIStorage
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
} 