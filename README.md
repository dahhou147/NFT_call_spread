# NFT Call Spread

Ce projet implémente un système de gestion d'options financières de type call spread à l'aide de NFTs sur la blockchain BNB. Les call spreads sont représentés par des NFTs et le paiement à maturité est calculé et distribué automatiquement via des smart contracts.

## Fonctionnalités

- Création d'options call spread avec dépôt de collatéral
- Représentation des options sous forme de NFTs
- Transfert de propriété des options via les NFTs
- Calcul automatique du pay-off à maturité
- Intégration avec Chainlink pour le prix de BTC/USD
- Automatisation de l'exercice des options à maturité via Chainlink Automation

## Architecture technique

Le projet comprend:
- Contrat `NFTCallSpread.sol`: Gère la création, l'achat et l'exercice des call spreads
- Contrat `NFTCallSpreadKeeper.sol`: Contrat Chainlink Keeper pour automatiser l'exercice des options arrivées à maturité
- Intégration avec Chainlink Price Feeds pour obtenir le prix de BTC/USD
- Scripts de déploiement et de configuration

## Prérequis

- Node.js (v18+)
- npm ou yarn
- Compte sur le testnet BNB avec des BNB de test
- Métamask ou autre wallet Ethereum/BNB
- LINK tokens pour financer l'automatisation Chainlink (sur le testnet)

## Installation

1. Cloner le dépôt:
```
git clone https://github.com/votre-username/NFT_call_spread.git
cd NFT_call_spread
```

2. Installer les dépendances:
```
npm install
```

3. Configurer les variables d'environnement:
Créer un fichier `.env` à la racine du projet avec les informations suivantes:
```
PRIVATE_KEY=your_private_key_here
BSCSCAN_API_KEY=your_bscscan_api_key_here
```

## Déploiement

1. Déployer le contrat principal sur le testnet BNB:
```
npm run deploy:testnet
```

2. Déployer le contrat Keeper pour l'automatisation:
```
npm run deploy:keeper
```

3. Enregistrer le contrat Keeper avec Chainlink Automation:
   - Visiter https://automation.chain.link/bnb-testnet
   - Suivre les instructions affichées à la fin du déploiement

## Tests

Exécuter les tests:
```
npm test
```

## Usage

### Créer un Call Spread

Pour créer un call spread, l'utilisateur doit:
1. Approuver le contrat pour utiliser ses stablecoins
2. Appeler la fonction `createCallSpread` avec les paramètres:
   - `strikePrice1`: Prix d'exercice inférieur (en USD, multiplié par 10^8)
   - `strikePrice2`: Prix d'exercice supérieur (en USD, multiplié par 10^8)
   - `expiry`: Timestamp d'expiration
   - `collateralAmount`: Montant de collatéral à déposer
   - `tokenURI`: URI des métadonnées pour le NFT

### Acheter un Call Spread

Pour acheter un call spread existant:
1. Appeler la fonction `buyCallSpread` avec l'ID du token

### Exercer un Call Spread

L'exercice est automatisé avec le contrat Keeper Chainlink, mais peut également être fait manuellement:
1. Appeler la fonction `exerciseCallSpread` avec l'ID du token après la date d'expiration

## Formule de calcul du Pay-off

Le pay-off d'un call spread est calculé comme suit:
- Si le prix spot ≤ strike1: Pay-off = 0
- Si strike1 < prix spot < strike2: Pay-off = prix spot - strike1
- Si prix spot ≥ strike2: Pay-off = strike2 - strike1

## Automatisation Chainlink

Le contrat `NFTCallSpreadKeeper` recherche périodiquement les call spreads arrivés à maturité et les exerce automatiquement. Il utilise Chainlink Automation pour:
1. Vérifier quels call spreads sont arrivés à maturité (`checkUpkeep`)
2. Exercer ces call spreads par lots (`performUpkeep`)
3. Gérer la distribution des paiements selon la formule de pay-off

## Licence

MIT 