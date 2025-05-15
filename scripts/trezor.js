const bitcoin = require('bitcoinjs-lib');

function extractPublicKeysFromSerializedTx(serializedTx) {
  // Parse the transaction
  const tx = bitcoin.Transaction.fromHex(serializedTx);
  
  // We're working with a witness transaction
  if (!tx.ins[0].witness || tx.ins[0].witness.length === 0) {
    throw new Error('No witness data found in transaction');
  }
  
  const witnessItems = tx.ins[0].witness;
  
  // In a P2WSH multisig, the last item in the witness is the redeem script
  const redeemScript = witnessItems[witnessItems.length - 1];
  
  // Parse the redeem script
  try {
    // Create a script from the redeem script buffer
    const script = bitcoin.script.decompile(redeemScript);
    
    if (!script) {
      throw new Error('Failed to decompile redeem script');
    }
    
    // Extract public keys from the script
    // In a multisig script, public keys are between the first item (m) and the last two items (n OP_CHECKMULTISIG)
    const publicKeys = [];
    
    for (let i = 1; i < script.length - 2; i++) {
      const item = script[i];
      
      if (Buffer.isBuffer(item)) {
        // This should be a public key
        publicKeys.push(item.toString('hex'));
      }
    }
    
    return publicKeys;
  } catch (error) {
    console.error('Error parsing redeem script:', error);
    throw error;
  }
}

// The serialized transaction from Trezor response
const serializedTx = "0100000000010127f316889ffb0e16187c225f5ffd8aaa168847525f3f451ba5635c362c0b04a10000000000ffffffff02e803000000000000160014cf8bc07f8e7e161aae7261beb2373d2eddb5bee00b810100000000002200205c22196a7740c5293825cd54133e45a115443d42b7cf82194b2e4747c1df122603004730440220078ce521a237d1b751a2561b9c1c42130a39f5d9c6e1fc179d767e1efa881e8302206dee1935ade83baa8006524dfcfe28ca2255c18c0550fcf864d45574de72a24601695221027131bac26f817a7577390f9f2bf0dbb04ad598e9f15f8e86e7b1b0e6c08f09b7210352a43bcfd4783ed3f5390b014d8aaebec4d28fbfcac227d1d66cdfd3fc9b4e762103f593b503450d69cac2c124e50986179c3e87d05cc0ceef7fad74c4237294daf953ae00000000";

// Extract and display the public keys
try {
  const publicKeys = extractPublicKeysFromSerializedTx(serializedTx);
  
  console.log('Number of public keys found:', publicKeys.length);
  console.log('Public keys:');
  publicKeys.forEach((pubKey, index) => {
    console.log(`${index + 1}: ${pubKey}`);
  });
  
  // Additional: determine which public key corresponds to the signature
  const tx = bitcoin.Transaction.fromHex(serializedTx);
  const witnessItems = tx.ins[0].witness;
  
  // Extract the signature (typically at index 1 after the initial 0)
  if (witnessItems.length > 1) {
    const signature = witnessItems[1];
    console.log('\nSignature used:', signature.toString('hex').substring(2)); // Skip the first byte (sighash type)
    
    // In a production environment, you would verify which pubkey this signature corresponds to
    console.log('\nNote: To determine which public key corresponds to this signature,');
    console.log('you would need to verify the signature against each public key using the transaction data.');
  }
} catch (error) {
  console.error('Failed to extract public keys:', error);
}