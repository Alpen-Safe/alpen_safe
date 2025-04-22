// Credits to https://github.com/jlopp/bitcoin-transaction-size-calculator
import * as bitcoinjs from 'bitcoinjs-lib';
import { getBitcoinLibNetwork } from './helpers';

const P2PKH_IN_SIZE = 148;
const P2PKH_OUT_SIZE = 34;

const P2SH_OUT_SIZE = 32;
// Unused but kept for reference
// const P2SH_P2WPKH_OUT_SIZE = 32;
// const P2SH_P2WSH_OUT_SIZE = 32;
// All segwit input sizes are reduced by 1wu to account for the witness item counts being added for every input per the transaction header
const P2SH_P2WPKH_IN_SIZE = 90.75;

const P2WPKH_IN_SIZE = 67.75;
// Unused but kept for reference
// const P2WPKH_OUT_SIZE = 31;

const P2WSH_OUT_SIZE = 43;
const P2TR_OUT_SIZE = 43;

const P2TR_IN_SIZE = 57.25;

const PUBKEY_SIZE = 33;
const SIGNATURE_SIZE = 72;

type InputScript = 'P2PKH' | 'P2SH' | 'P2SH-P2WPKH' | 'P2WPKH' | 'P2TR' | 'P2SH-P2WSH' | 'P2WSH';
type OutputScript = 'P2PKH' | 'P2SH' | 'P2SH-P2WPKH' | 'P2WPKH' | 'P2TR' | 'P2WSH';
type BatchMode = 'separate-outputs' | 'shared-output' | null;

const getTxOverheadExtraRawBytes = (inputScript: InputScript, inputCount: number): number => {
  let witnessBytes = 0;
  // Returns the remaining 3/4 bytes per witness bytes
  if (inputScript === 'P2PKH' || inputScript === 'P2SH') {
    witnessBytes = 0;
  } else { // Transactions with segwit inputs have extra overhead
    witnessBytes = 0.25 // segwit marker
      + 0.25 // segwit flag
      + inputCount / 4; // witness element count per input
  }

  return witnessBytes * 3;
};

const getSizeOfVarInt = (length: number): number => {
  if (length < 253) {
    return 1;
  } if (length < 65535) {
    return 3;
  } if (length < 4294967295) {
    return 5;
  } if (length < Number.MAX_SAFE_INTEGER) {
    return 9;
  }

  throw new Error('invalid len');
};

const getSizeOfScriptLengthElement = (length: number): number => {
  if (length < 75) {
    return 1;
  } if (length <= 255) {
    return 2;
  } if (length <= 65535) {
    return 3;
  } if (length <= 4294967295) {
    return 5;
  }

  throw new Error('Size of redeem script is too large');
};

const getTxOverheadVBytes = (inputScript: InputScript, inputCount: number, outputCount: number): number => {
  let witnessVbytes = 0;
  if (inputScript === 'P2PKH' || inputScript === 'P2SH') {
    witnessVbytes = 0;
  } else { // Transactions with segwit inputs have extra overhead
    witnessVbytes = 0.25 // segwit marker
      + 0.25 // segwit flag
      + inputCount / 4; // witness element count per input
  }

  return 4 // nVersion
    + getSizeOfVarInt(inputCount) // number of inputs
    + getSizeOfVarInt(outputCount) // number of outputs
    + 4 // nLockTime
    + witnessVbytes;
};

interface InputWitnessSize {
  inputWitnessSize: number;
  inputSize: number;
}

const getInputAndWitnessSize = (inputScript: InputScript): InputWitnessSize => {
  let inputWitnessSize = 0;
  let inputSize = 0;

  if (inputScript === 'P2PKH') {
    inputSize = P2PKH_IN_SIZE;
  } else if (inputScript === 'P2SH-P2WPKH' || inputScript === 'P2WPKH') {
    inputSize = (inputScript === 'P2SH-P2WPKH') ? P2SH_P2WPKH_IN_SIZE : P2WPKH_IN_SIZE;
    inputWitnessSize = 107; // size(signature) + signature + size(pubkey) + pubkey
  } else if (inputScript === 'P2TR') {
    inputSize = P2TR_IN_SIZE;
    inputWitnessSize = 65; // getSizeOfVarInt(schnorrSignature) + schnorrSignature;
  } else if (inputScript === 'P2SH') {
    const redeemScriptSize = 1 // OP_M
      + 1 * (1 + PUBKEY_SIZE) // OP_PUSH33 <pubkey>
      + 1 // OP_N
      + 1; // OP_CHECKMULTISIG
    const scriptSigSize = 1 // size(0)
      + 1 * (1 + SIGNATURE_SIZE) // size(SIGNATURE_SIZE) + signature
      + getSizeOfScriptLengthElement(redeemScriptSize) + redeemScriptSize;
    inputSize = 32 + 4 + getSizeOfVarInt(scriptSigSize) + scriptSigSize + 4;
  } else if (inputScript === 'P2SH-P2WSH' || inputScript === 'P2WSH') {
    const redeemScriptSize = 1 // OP_M
      + 1 * (1 + PUBKEY_SIZE) // OP_PUSH33 <pubkey>
      + 1 // OP_N
      + 1; // OP_CHECKMULTISIG
    inputWitnessSize = 1 // size(0)
      + 1 * (1 + SIGNATURE_SIZE) // size(SIGNATURE_SIZE) + signature
      + getSizeOfScriptLengthElement(redeemScriptSize) + redeemScriptSize;
    inputSize = 36 // outpoint (spent UTXO ID)
      + inputWitnessSize / 4 // witness program
      + 4; // nSequence
    if (inputScript === 'P2SH-P2WSH') {
      inputSize += 32 + 3; // P2SH wrapper (redeemscript hash) + overhead?
    }
  }

  return {
    inputWitnessSize,
    inputSize,
  };
};

/**
 * Get the out script size
 * @param {string} outputScript - the out script
 * @returns {number} - the size
 */
const getOutputScriptSize = (outputScript: OutputScript): number => {
  if (outputScript === 'P2PKH') {
    return P2PKH_OUT_SIZE;
  }

  if (outputScript.includes('P2SH')) {
    return P2SH_OUT_SIZE;
  }

  if (outputScript === 'P2TR') {
    return P2TR_OUT_SIZE;
  }

  if (outputScript === 'P2WSH') {
    return P2WSH_OUT_SIZE;
  }

  return 0;
};

interface TxVBytesResult {
  txVBytes: number;
  inputWitnessSize: number;
}

/**
 * Calc tx vbytes
 * @param {number} inputsCount - ins
 * @param {number} outputsCount - outs
 * @param {string} inputScript - script
 * @param {string} outputScript - script
 * @returns {{txVBytes:number, inputWitnessSize: number}} - the tx vbytes and witness size
 */
const calculateTxVBytes = (
  inputsCount: number, 
  outputsCount: number, 
  inputScript: InputScript = 'P2TR', 
  outputScript: OutputScript = 'P2TR'
): TxVBytesResult => {
  const txVbytesOverhead = getTxOverheadVBytes(inputScript, inputsCount, outputsCount);
  const {
    inputWitnessSize,
    inputSize,
  } = getInputAndWitnessSize(inputScript);
  const outScriptSize = getOutputScriptSize(outputScript);
  const txVBytes = Math.ceil(txVbytesOverhead + (inputSize * inputsCount) + (outputsCount * outScriptSize));
  return {
    txVBytes,
    inputWitnessSize,
  };
};

/**
 * Calc tx size
 * @param {number} inputsCount - ins
 * @param {number} outputsCount - outs
 * @param {string} inputScript - script
 * @param {string} outputScript - script
 * @returns {number} - the tx fee
 */
const calculateTxSize = (
  inputsCount: number, 
  outputsCount: number, 
  inputScript: InputScript = 'P2TR', 
  outputScript: OutputScript = 'P2TR'
): number => {
  const {
    txVBytes,
    inputWitnessSize,
  } = calculateTxVBytes(inputsCount, outputsCount, inputScript, outputScript);

  const extra = getTxOverheadExtraRawBytes(inputScript, inputsCount);

  return extra + txVBytes + (inputWitnessSize * inputsCount) * (3 / 4);
};

/**
 * Calc tx fees
 * @param {number} inputsCount - ins
 * @param {number} outputsCount - outs
 * @param {number} feePerByte  - fee
 * @param {string} inputScript - script
 * @param {string} outputScript - script
 * @param {Buffer} opReturn - op return
 * @returns {number} - the tx fee
 */
const calculateTxFees = (
  inputsCount: number, 
  outputsCount: number, 
  feePerByte: number, 
  inputScript: InputScript = 'P2TR', 
  outputScript: OutputScript = 'P2TR', 
  opReturn: Buffer | null = null
): number => {
  let {
    txVBytes,
  } = calculateTxVBytes(inputsCount, outputsCount, inputScript, outputScript);

  if (opReturn) {
    txVBytes += opReturn.length;
  }

  return Math.ceil(txVBytes * feePerByte);
};

/**
 * Sanity checks for tx fees
 * @param {number} totalFilesSize - the size of all files combined
 * @param {number} inscriptionsCount - how many inscriptions we will make
 * @param {number} feePerByte - the selected fee
 */
const txFeeSanityChecks = (totalFilesSize: number, inscriptionsCount: number, feePerByte: number): void => {
  if (totalFilesSize < 0) {
    throw new Error('size is negative');
  }

  if (inscriptionsCount < 0) {
    throw new Error('count is negative');
  }

  if (feePerByte < 0) {
    throw new Error('fee is negative');
  }
};

/**
 * Calculates the chain fee for multiple inscriptions
 * @param {number} totalFilesSize - the size of all files combined
 * @param {number} inscriptionsCount - how many inscriptions we will make
 * @param {number} feePerByte - the selected fee
 * @param {number} envelopeSize - the ordinals overhead
 * @param {string} batchMode - the batch mode
 * @returns {number} the chain fee
 */
const calculateInscriptionTransactionFees = (
  totalFilesSize: number, 
  inscriptionsCount: number, 
  feePerByte: number, 
  envelopeSize: number = 100, 
  batchMode: BatchMode = null
): number => {
  txFeeSanityChecks(totalFilesSize, inscriptionsCount, feePerByte);

  // The fee for the files + inscription overhead
  const chainFeeFiles = Math.ceil((feePerByte * (totalFilesSize + envelopeSize)) / 4);

  // 1 commit tx is used for batch inscriptions including rune-etch
  const commitTxCount = batchMode ? 1 : inscriptionsCount;

  // Calculate the fees of a regular tx and add it the the file fee
  // that is our tx overhead'
  // most of our commit txs are 2 inputs 3 outputs
  // https://mempool.space/tx/b6035a268634053698857406bcc98c5216217a006de2560cd2ca572b0a9718d8
  const commitTxFees = calculateTxFees(2, 3, feePerByte) * commitTxCount;

  // we also do 1 reveal tx per inscription that actually has the file data in its witness data field
  // https://mempool.space/tx/23546e096dd165845f9242315ef8b3257f83337f614f0159a44b47f174c0ca7d#vin=0
  let revealTxFees = calculateTxFees(1, 1, feePerByte) * inscriptionsCount;

  // multiple outputs in 1 reveal tx
  if (batchMode === 'separate-outputs') {
    revealTxFees = calculateTxFees(1, inscriptionsCount, feePerByte) * 1;
  }

  // single output in 1 reveal tx separated by postage
  if (batchMode === 'shared-output') {
    revealTxFees = calculateTxFees(1, 1, feePerByte) * 1;
  }

  return commitTxFees + revealTxFees + chainFeeFiles;
};

/**
 * Function to calculate the virtual size of a mixed transaction with a single inscription input and multiple parent inputs.
 * The transaction has a mix of ordinal (Taproot) and legacy inputs and outputs.
 * The function calculates the transaction size and virtual size based on the specified parameters.
 * @param {number} numParents - number of parent inputs (excluding the inscription input)
 * @param {number} fileSize - size of the file data in bytes
 * @param {number} metadataSize - size of the metadata in bytes
 * @param {number} [taprootSigLength] - length of the Taproot signature (default: 64 bytes)
 * @returns {number} - the estimated transaction virtual size in vbytes
 */
const calculateOrdEnvelopeSize = (
  numParents: number = 0, 
  fileSize: number = 0, 
  metadataSize: number = 0, 
  taprootSigLength: number = 64
): number => {
  // In mixed mode, we assume:
  // • Ordinal (Taproot) inputs: inscription input + parent inputs.
  // • Legacy input: added as the last input.
  // • Ordinal (Taproot) outputs: base ordinal outputs.
  // • Legacy output: added as the last output.
  //
  // For our example, we want a total of 4 inputs and 5 outputs.
  // Let's define:
  //   numOrdinalInputs = (inscription + parent inputs)
  //   totalInputs = numOrdinalInputs + 1 (legacy)
  //   numOrdinalOutputs = (base ordinal outputs)
  //   totalOutputs = numOrdinalOutputs + 1 (legacy)
  //
  // For our sample, set:
  //   numOrdinalInputs = 3   (1 inscription + 2 parent inputs)
  //   totalInputs = 3 + 1 = 4
  //   numOrdinalOutputs = 4  (we assume base ordinal outputs remain 4)
  //   totalOutputs = 4 + 1 = 5
  //
  // If you wish to use a different configuration, adjust these numbers accordingly.
  const numOrdinalInputs = numParents + 0; // originally: inscription input + numParents parent inputs

  // --- Inscription Envelope (as per spec) ---
  // Constructed as four push operations:
  //   1. "ord" marker: 1-byte push opcode + 3 bytes = 4 bytes
  //   2. Version: 1-byte push opcode + 1 byte = 2 bytes
  //   3. Metadata: 1-byte push opcode + metadataSize bytes = metadataSize + 1 bytes
  //   4. File data: 1-byte push opcode + fileSize bytes = fileSize + 1 bytes
  // Total envelope data = fileSize + metadataSize + 8 bytes.
  const inscriptionEnvelopeSize = fileSize + metadataSize + 8;

  // --- Witness Data for Ordinal (Taproot) Inputs ---
  // For each parent input (ordinal), the witness stack contains 3 items:
  //   a. Signature: 1-byte length + taprootSigLength bytes
  //   b. Parent pointer #1: 1-byte length + 32 bytes
  //   c. Parent pointer #2: 1-byte length + 32 bytes
  // Plus a 1-byte witness count.
  const parentWitnessSize = 1 + (1 + taprootSigLength) + (1 + 32) + (1 + 32);

  // For the inscription input (ordinal), an extra witness item is appended for the inscription envelope.
  // Its witness stack has 4 items:
  //   a. Signature: 1-byte length + taprootSigLength bytes
  //   b. Parent pointer #1: 1-byte length + 32 bytes
  //   c. Parent pointer #2: 1-byte length + 32 bytes
  //   d. Inscription envelope: 1-byte length + inscriptionEnvelopeSize bytes
  // Plus a 1-byte witness count.
  const inscriptionWitnessSize = 1 + (1 + taprootSigLength) + (1 + 32) + (1 + 32) + (1 + inscriptionEnvelopeSize);

  // --- Witness Data for Legacy Segwit Input ---
  // For the legacy input (now assumed as Segwit), the witness stack contains 2 items:
  //   a. Signature: 1-byte length + taprootSigLength bytes
  //   b. Public Key: 1-byte length + 33 bytes
  // Plus a 1-byte witness count.
  const legacyWitnessSize = 1 + (1 + taprootSigLength) + (1 + 33);

  // Total witness for ordinal (Taproot) inputs plus the legacy segwit input:
  // There are numOrdinalInputs total, of which 1 is the inscription input and the rest are parent inputs.
  const totalWitness = inscriptionWitnessSize + ((numOrdinalInputs - 1) * parentWitnessSize) + legacyWitnessSize;

  // --- Final Weight & Virtual Size Calculation ---
  // Total transaction weight = (baseSize * 4) + totalWitness.
  // Virtual size (vbytes) = ceil(weight / 4)
  const totalWitnessVbytes = Math.ceil(totalWitness / 4);

  return totalWitnessVbytes;
};

/**
 * Calculates the chain fee for multiple inscriptions
 * @param {number} totalFilesSize - the size of all files combined
 * @param {number} inscriptionsCount - how many inscriptions we will make
 * @param {number} feePerByte - the selected fee
 * @param {number} parentsCount - count of multi-parents
 * @returns {number} the chain fee
 */
const calculateDirectInscriptionTransactionFees = (
  totalFilesSize: number, 
  inscriptionsCount: number, 
  feePerByte: number, 
  parentsCount: number = 0
): number => {
  txFeeSanityChecks(totalFilesSize, inscriptionsCount, feePerByte);

  // new method
  const chainFeeFiles = calculateOrdEnvelopeSize(parentsCount, totalFilesSize) * feePerByte;

  // reveal tx could be multiple input because multiple parents and number of inscriptions as output + 1 for the service fee
  // reveal tx with parent should be length of parent inscription as input + 1 funding input and number of inscriptions as output + length of parents for return parent inscription + 1 for the service fee
  const outputsCount = inscriptionsCount + parentsCount + 1;

  const revealTxFees = calculateTxFees(parentsCount + 1, outputsCount, feePerByte);

  return revealTxFees + chainFeeFiles;
};

const calculateRuneEtchingTransactionFees = (feePerByte: number, opReturnData: string): number => {
  // TODO: Need to add commitment tx fees as well as soon as the details on that become clear

  // Two outputs
  const {
    txVBytes,
  } = calculateTxVBytes(2, 2, 'P2TR', 'P2TR');

  // Op return data
  const dataLength = Buffer.from(opReturnData, 'utf8').length;
  const opReturnSize = 1 + getSizeOfVarInt(dataLength) + dataLength;
  const txSize = txVBytes + opReturnSize;

  return Math.ceil(txSize * feePerByte);
};

interface WitnessUtxo {
  script: Buffer;
  value: number;
}

interface PsbtInput {
  witnessUtxo?: WitnessUtxo;
  nonWitnessUtxo?: Buffer;
  redeemScript?: Buffer | string;
  witnessScript?: Buffer | string;
  // Using Record instead of any for additional properties
  [key: string]: Buffer | string | WitnessUtxo | undefined;
}

/**
 * Given a list of unsigned inputs returns the amount of vBytes the signature adds to the psbt
 * @param {Array} inputs - inputs extracted from the psbt
 * @returns {number} number of vBytes introduced by signatures
 */
const extraSignaturevBytes = (inputs: PsbtInput[]): number => {
  let totalExtraVBytes = 0;

  inputs.forEach((input) => {
    if (input.witnessUtxo) {
      const { script } = input.witnessUtxo;

      if (script.length === 22 && script[0] === bitcoinjs.opcodes.OP_0) {
        // P2WPKH
        // Max witness: 73 (sig) + 33 (pubkey) = 106 bytes
        totalExtraVBytes += Math.ceil(106 / 4); // 26.5 vBytes
      } else if (script.length === 34 && script[0] === bitcoinjs.opcodes.OP_1) {
        // P2TR key-path: <sig>
        // Schnorr sig: 64 bytes
        totalExtraVBytes += 64 / 4; // 16 vBytes
      } else if (script.length === 34 && script[0] === bitcoinjs.opcodes.OP_0) {
        // P2WSH
        const witnessBytes = 73 + script.length;
        totalExtraVBytes += Math.ceil(witnessBytes / 4);
        // TODO: Multisig needs input-specific witnessScript calculations
      }
    } else if (input.nonWitnessUtxo) {
      if (!input.redeemScript) {
        // P2PKH
        // Max: 73 + 1 + 33 + 1 = 108 bytes
        totalExtraVBytes += 108;
      } else {
        const redeemScript = Buffer.isBuffer(input.redeemScript)
          ? input.redeemScript
          : Buffer.from(input.redeemScript as string, 'hex');

        if (redeemScript.length === 22 && redeemScript[0] === bitcoinjs.opcodes.OP_0) {
          // P2SH-P2WPKH
          totalExtraVBytes += 22 + Math.ceil(106 / 4); // 48.5 vBytes
        } else if (redeemScript[0] >= bitcoinjs.opcodes.OP_2 && redeemScript[0] <= bitcoinjs.opcodes.OP_16) {
          // P2SH multisig
          const sigCount = redeemScript[0] - 0x50; // OP_2 = 0x52 → 2 sigs
          const scriptSigBytes = 1 + (73 * sigCount) + redeemScript.length + 1; // OP_0, sigs, script
          totalExtraVBytes += scriptSigBytes;
        } else {
          // P2SH
          totalExtraVBytes += 108 + redeemScript.length + 1;
        }
      }
    }
  });

  return totalExtraVBytes;
};

const getOutputSize = (address: string, networkStr: string): number => {
  const network = getBitcoinLibNetwork(networkStr);
  const script = bitcoinjs.address.toOutputScript(address, network);
  return 8 + 1 + script.length; // value + varint + scriptPubKey length
};

export {
  calculateTxSize,
  calculateTxFees,
  calculateTxVBytes,
  calculateInscriptionTransactionFees,
  calculateDirectInscriptionTransactionFees,
  calculateRuneEtchingTransactionFees,
  extraSignaturevBytes,
  getOutputSize,
};
