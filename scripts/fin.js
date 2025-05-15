const bitcoin = require('bitcoinjs-lib');

// Parse the PSBT from base64
const psbtBase64 = 'cHNidP8BAH0CAAAAAVCuWXpSk++T39zSYg10OHdMYGGnqBCFs6qtwPLqdn5XAQAAAAD/////AugDAAAAAAAAFgAUz4vAf45+FhqucmG+sjc9Lt21vuAjBgAAAAAAACIAICJ+qS5xLFlsJeThZ9z4v+B7HG0Zuha8vtt5ibhIHJIDAAAAAAABAP0VAQIAAAAAAQE+fLI89JyV9CsiWqFFesMXsCkI1a63gwITy9IKGSclgAEAAAAA/f///wMK8OUFAAAAABYAFFv9m8QmcNrylW+9c416iJcvcMmjuAsAAAAAAAAiACCi7LuNNo278bUoGKsmW1sNRUoZbV33bLAEZ4seOgt8BdAHAAAAAAAAIgAgWXEuzRiwSQRHyKHVGlikgG7JjJebCtnrOe67k+1iiigCRzBEAiBy9ezvddnmIpwjwlgCEfKyvMwtZM8jxSjcc9au5Dca0wIgGtgcAbod4y/N95uvHAnikR3354hhZm6Mmdfy28ZHLXgBIQJesOhOmR+f9uj3wGPo795U67x6aAFiClXyNuJDw6Swxoy5AwABASu4CwAAAAAAACIAIKLsu402jbvxtSgYqyZbWw1FShltXfdssARnix46C3wFAQVpUiECcTG6wm+BenV3OQ+fK/DbsErVmOnxX46G57Gw5sCPCbchAwR46QqCBE813uyRkoLlOy8vtuNQUT0Ws6Y0VSHSAVVJIQO4XCtpT2kLTCQg3rHh/i9WKQ9Okb/1aCGXvc3GGc0EgVOuIgYCcTG6wm+BenV3OQ+fK/DbsErVmOnxX46G57Gw5sCPCbccQo+HEzAAAIABAACAAAAAgAIAAIAAAAAAAAAAACIGAwR46QqCBE813uyRkoLlOy8vtuNQUT0Ws6Y0VSHSAVVJHEKPhxMwAACAAQAAgAEAAIACAACAAAAAAAAAAAAiBgO4XCtpT2kLTCQg3rHh/i9WKQ9Okb/1aCGXvc3GGc0EgQwAAAAAAAAAAAAAAAAAAAA=';

// Wallet signatures to add
const walletSignatures = [
  {
      "inputIndex": 0,
      "signature": "30450221008ac6d1d24fa4d58574c427cbf91c458f27736118040478eb17e7da3853ac784202207f2bf92edfee5ac94ad06ae933b8ec235e760df8e054375992edf26c1ba8cf6901",
      "pubkey": "027131bac26f817a7577390f9f2bf0dbb04ad598e9f15f8e86e7b1b0e6c08f09b7"
  },
  {
      "inputIndex": 0,
      "signature": "30440220245358051bf457a0c6b342efccdc898afc9a01aad114c15c8b255c1099bc3a01022014dabdeaaaf277d45bdc082b1394230bb96e2eacac1760c3c783c0c85f0d04ec01",
      "pubkey": "030478e90a82044f35deec919282e53b2f2fb6e350513d16b3a6345521d2015549"
  }
];


const psbt = bitcoin.Psbt.fromBase64(psbtBase64);

// Add wallet signatures to the PSBT
walletSignatures.forEach(signature => {
  psbt.updateInput(signature.inputIndex, {
    partialSig: [
      {
        pubkey: Buffer.from(signature.pubkey, 'hex'),
        signature: Buffer.from(signature.signature, 'hex')
      }
    ],
  })
});

psbt.finalizeAllInputs();

// Extract the final transaction from the PSBT
const finalTransaction = psbt.extractTransaction();

// Get the hex representation for broadcasting
console.log(finalTransaction.toHex());


