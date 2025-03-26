import React, { useState, useEffect } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Card, 
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Slider
} from '@mui/material';
import { ethers } from 'ethers';

const NFTCallSpreadForm = () => {
  const [formData, setFormData] = useState({
    underlying: 'EUR/USD',
    buyerAddress: '',
    optionPremium: 0.052,
    optionMultiplier: 10000,
    lowerStrike: 0.665,
    higherStrike: 1.2625,
    expiry: new Date().toISOString().split('T')[0]
  });

  const [connected, setConnected] = useState(false);
  const [account, setAccount] = useState('');
  const [maxGain, setMaxGain] = useState(5455);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        });
        setAccount(accounts[0]);
        setConnected(true);
      } catch (error) {
        console.error("Erreur de connexion au wallet:", error);
      }
    } else {
      alert("Veuillez installer MetaMask!");
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!connected) {
      alert("Veuillez d'abord connecter votre wallet!");
      return;
    }
    
    // Ici, nous ajouterons la logique pour interagir avec le smart contract
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      
      // Remplacer avec l'adresse de votre contrat déployé
      const contractAddress = "0x68CB7e97fa7934375C4162Aac9674579F4375417";
      const contractABI = []; // Ajouter votre ABI ici
      
      const contract = new ethers.Contract(contractAddress, contractABI, signer);
      
      // Convertir les valeurs pour le smart contract
      const lowerStrikeWei = ethers.utils.parseEther(formData.lowerStrike.toString());
      const higherStrikeWei = ethers.utils.parseEther(formData.higherStrike.toString());
      const premiumWei = ethers.utils.parseEther(formData.optionPremium.toString());
      
      // Appeler la fonction du smart contract
      const tx = await contract.createCallSpread(
        lowerStrikeWei,
        higherStrikeWei,
        Math.floor(new Date(formData.expiry).getTime() / 1000),
        premiumWei,
        formData.buyerAddress
      );
      
      await tx.wait();
      alert("Call Spread NFT créé avec succès!");
      
    } catch (error) {
      console.error("Erreur lors de la création du Call Spread:", error);
      alert("Erreur lors de la création du Call Spread. Voir la console pour plus de détails.");
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4, p: 3 }}>
      <Typography variant="h4" gutterBottom>
        NFT - Derivatives
      </Typography>
      
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Smart contract à utiliser</InputLabel>
                <Select
                  value={formData.underlying}
                  label="Smart contract à utiliser"
                  disabled
                >
                  <MenuItem value="EUR/USD">
                    Call spread atomic - 0x68CB7e97fa7934375C4162Aac9674579F4375417
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Sous-jacent</InputLabel>
                <Select
                  name="underlying"
                  value={formData.underlying}
                  onChange={handleChange}
                >
                  <MenuItem value="EUR/USD">EUR/USD</MenuItem>
                  <MenuItem value="BTC/USD">BTC/USD</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Adresse du Wallet de l'Acheteur"
                name="buyerAddress"
                value={formData.buyerAddress}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Prime de l'option"
                name="optionPremium"
                type="number"
                value={formData.optionPremium}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Multiplicateur de l'option"
                name="optionMultiplier"
                type="number"
                value={formData.optionMultiplier}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Date d'expiration"
                name="expiry"
                type="datetime-local"
                value={formData.expiry}
                onChange={handleChange}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography gutterBottom>
                Strike inférieur: €{formData.lowerStrike}
              </Typography>
              <Slider
                value={formData.lowerStrike}
                onChange={(e, value) => handleChange({
                  target: { name: 'lowerStrike', value }
                })}
                min={0.5}
                max={1.0}
                step={0.0001}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography gutterBottom>
                Strike supérieur: €{formData.higherStrike}
              </Typography>
              <Slider
                value={formData.higherStrike}
                onChange={(e, value) => handleChange({
                  target: { name: 'higherStrike', value }
                })}
                min={1.0}
                max={1.5}
                step={0.0001}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Gain Maximum: €{maxGain}
              </Typography>
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            {!connected ? (
              <Button 
                variant="contained" 
                color="primary" 
                onClick={connectWallet}
                fullWidth
              >
                Connecter MetaMask
              </Button>
            ) : (
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleSubmit}
                fullWidth
              >
                Créer le Token
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default NFTCallSpreadForm; 