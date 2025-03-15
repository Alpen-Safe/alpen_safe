import { expect } from "jsr:@std/expect";
import { Buffer } from "node:buffer";
import { networks } from "bitcoinjs-lib";
import * as bitcoin from "bitcoinjs-lib";
import { TxOutput, UTXO } from "../model/multiSigWallet.ts";
import { SupabaseClient } from "@supabase/supabase-js";
import Supabase from "../model/supabase.ts";
import MultiSigWallet from "../model/multiSigWallet.ts";

// Helper function to access private methods for testing
const accessPrivateMethod = <T>(instance: any, methodName: string): T => {
  return instance[methodName].bind(instance);
};

// Setup function to create a new wallet instance
function setupWallet() {
  // Use a predictable seed
  const seed = Buffer.from(
    "5eb00bbddcf069084889a8ab9155568165f5c453ccb85e70811aaed6f6da5fc19a5ac40b389cd370d086206dec8aa6c43daea6690f20ad3d8d48b2d2ce9e38e4",
    "hex",
  );
  const network = networks.testnet;
  const supabase = new Supabase({ supabase: {} as SupabaseClient });
  return new MultiSigWallet({ supabase, seed, network });
}

// Test suite for validateAccountIndex
Deno.test("validateAccountIndex - valid indices", () => {
  const wallet = setupWallet();
  const validateAccountIndex = accessPrivateMethod<(index: number) => boolean>(
    wallet,
    "validateAccountIndex",
  );

  expect(validateAccountIndex(0)).toBe(true);
  expect(validateAccountIndex(1)).toBe(true);
  expect(validateAccountIndex(2147483647)).toBe(true);
});

Deno.test("validateAccountIndex - negative indices", () => {
  const wallet = setupWallet();
  const validateAccountIndex = accessPrivateMethod<(index: number) => boolean>(
    wallet,
    "validateAccountIndex",
  );

  expect(validateAccountIndex(-1)).toBe(false);
});

Deno.test("validateAccountIndex - non-integer indices", () => {
  const wallet = setupWallet();
  const validateAccountIndex = accessPrivateMethod<(index: number) => boolean>(
    wallet,
    "validateAccountIndex",
  );

  expect(validateAccountIndex(1.5)).toBe(false);
});

Deno.test("validateAccountIndex - indices beyond max", () => {
  const wallet = setupWallet();
  const validateAccountIndex = accessPrivateMethod<(index: number) => boolean>(
    wallet,
    "validateAccountIndex",
  );

  expect(validateAccountIndex(2147483648)).toBe(false);
});

// Test suite for deriveAccountNode
Deno.test("deriveAccountNode - derives node successfully", () => {
  const wallet = setupWallet();
  const deriveAccountNode = accessPrivateMethod<(accountId: number) => any>(
    wallet,
    "deriveAccountNode",
  );

  const accountNode = deriveAccountNode(0);
  expect(accountNode).toBeDefined();
  expect(accountNode.publicKey).toBeDefined();
  expect(accountNode.privateKey).toBeDefined();
});

Deno.test("deriveAccountNode - different nodes for different accounts", () => {
  const wallet = setupWallet();
  const deriveAccountNode = accessPrivateMethod<(accountId: number) => any>(
    wallet,
    "deriveAccountNode",
  );

  const accountNode0 = deriveAccountNode(0);
  const accountNode1 = deriveAccountNode(1);

  const pubKey0 = Buffer.from(accountNode0.publicKey).toString("hex");
  const pubKey1 = Buffer.from(accountNode1.publicKey).toString("hex");

  expect(pubKey0).not.toBe(pubKey1);
});

Deno.test("deriveAccountNode - throws on invalid account index", () => {
  const wallet = setupWallet();
  const deriveAccountNode = accessPrivateMethod<(accountId: number) => any>(
    wallet,
    "deriveAccountNode",
  );

  expect(() => deriveAccountNode(-1)).toThrow("Account index must be between");
});

// Test suite for getServerKeyPair
Deno.test("getServerKeyPair - derives key pair for receive address", () => {
  const wallet = setupWallet();
  const getServerKeyPair = accessPrivateMethod<
    (accountId: number, addressIndex: number, change?: boolean) => any
  >(wallet, "getServerKeyPair");

  const keyPair = getServerKeyPair(0, 0, false);

  expect(keyPair.publicKey).toBeDefined();
  expect(keyPair.privateKey).toBeDefined();
  expect(keyPair.derivationPath).toBe("m/84'/1'/0'/0/0");
});

Deno.test("getServerKeyPair - derives key pair for change address", () => {
  const wallet = setupWallet();
  const getServerKeyPair = accessPrivateMethod<
    (accountId: number, addressIndex: number, change?: boolean) => any
  >(wallet, "getServerKeyPair");

  const keyPair = getServerKeyPair(0, 0, true);

  expect(keyPair.publicKey).toBeDefined();
  expect(keyPair.privateKey).toBeDefined();
  expect(keyPair.derivationPath).toBe("m/84'/1'/0'/1/0");
});

Deno.test("getServerKeyPair - different keys for different indices", () => {
  const wallet = setupWallet();
  const getServerKeyPair = accessPrivateMethod<
    (accountId: number, addressIndex: number, change?: boolean) => any
  >(wallet, "getServerKeyPair");

  const keyPair0 = getServerKeyPair(0, 0, false);
  const keyPair1 = getServerKeyPair(0, 1, false);

  const pubKey0 = Buffer.from(keyPair0.publicKey).toString("hex");
  const pubKey1 = Buffer.from(keyPair1.publicKey).toString("hex");

  expect(pubKey0).not.toBe(pubKey1);
});

Deno.test("getServerKeyPair - throws on invalid address index", () => {
  const wallet = setupWallet();
  const getServerKeyPair = accessPrivateMethod<
    (accountId: number, addressIndex: number, change?: boolean) => any
  >(wallet, "getServerKeyPair");

  expect(() => getServerKeyPair(0, -1, false)).toThrow(
    "Address index must be between",
  );
});

// Test suite for getServerAccountXpub
Deno.test("getServerAccountXpub - returns valid xpub", () => {
  const wallet = setupWallet();
  const xpub = wallet.getServerAccountXpub(0);

  expect(xpub).toBeDefined();
  expect(xpub.startsWith("tpub")).toBe(true); // Should be testnet pub key
});

Deno.test("getServerAccountXpub - different xpubs for different accounts", () => {
  const wallet = setupWallet();
  const xpub0 = wallet.getServerAccountXpub(0);
  const xpub1 = wallet.getServerAccountXpub(1);

  expect(xpub0).not.toBe(xpub1);
});

Deno.test("getServerAccountXpub - throws on invalid account index", () => {
  const wallet = setupWallet();

  expect(() => wallet.getServerAccountXpub(-1)).toThrow(
    "Account index must be between",
  );
});

// Test suite for createWalletDescriptor
Deno.test("createWalletDescriptor - creates valid descriptor with user xpubs", () => {
  const wallet = setupWallet();
  // Use a testnet xpub for testing
  const userXpub =
    "tpubDC5FSnBiZDMmhiuCmWAYsLwgLYrrT9rAqvTySfuCCrgsWz8wxMXUS9Tb9iVMvcRbvFcAHGkMD5Kx8koh4GquNGNTfohfk7pgjhaPCdXpoba";
  const descriptor = wallet.createWalletDescriptor(0, 2, [userXpub]);

  const serverXpub = wallet.getServerAccountXpub(0);
  const expectedFormat = `wsh(multi(2,${serverXpub}/0/*,${userXpub}/0/*))`;

  expect(descriptor).toBe(expectedFormat);
});

Deno.test("createWalletDescriptor - handles multiple user xpubs", () => {
  const wallet = setupWallet();
  const userXpubs = [
    "tpubDC5FSnBiZDMmhiuCmWAYsLwgLYrrT9rAqvTySfuCCrgsWz8wxMXUS9Tb9iVMvcRbvFcAHGkMD5Kx8koh4GquNGNTfohfk7pgjhaPCdXpoba",
    "tpubDCcsjmHgBmMhNvPnnBYb71dNo2PEHipgTxHBDtZxPGA8bEofZjQrHptxftbpHDCNAMHNdMSFxFd9aYAZpQKwofLr5kf2HoQM6hSzYBRgM1R",
  ];

  const descriptor = wallet.createWalletDescriptor(0, 2, userXpubs);

  // Should contain all xpubs
  for (const xpub of userXpubs) {
    expect(descriptor).toContain(xpub);
  }

  // Should have correct number of commas (number of xpubs)
  const commas = descriptor.match(/,/g) || [];
  expect(commas.length - 1).toBe(userXpubs.length);
  expect(descriptor).toBe(
    "wsh(multi(2,tpubDC8msFGeGuwnKG9Upg7DM2b4DaRqg3CUZa5g8v2SRQ6K4NSkxUgd7HsL2XVWbVm39yBA4LAxysQAm397zwQSQoQgewGiYZqrA9DsP4zbQ1M/0/*,tpubDC5FSnBiZDMmhiuCmWAYsLwgLYrrT9rAqvTySfuCCrgsWz8wxMXUS9Tb9iVMvcRbvFcAHGkMD5Kx8koh4GquNGNTfohfk7pgjhaPCdXpoba/0/*,tpubDCcsjmHgBmMhNvPnnBYb71dNo2PEHipgTxHBDtZxPGA8bEofZjQrHptxftbpHDCNAMHNdMSFxFd9aYAZpQKwofLr5kf2HoQM6hSzYBRgM1R/0/*))",
  );
});

// Test suite for deriveWalletFromXpubs
Deno.test("deriveWalletFromXpubs - derives receive address from xpubs", () => {
  const wallet = setupWallet();
  // Mock user xpub for testnet
  const userXpub =
    "tpubDC5FSnBiZDMmhiuCmWAYsLwgLYrrT9rAqvTySfuCCrgsWz8wxMXUS9Tb9iVMvcRbvFcAHGkMD5Kx8koh4GquNGNTfohfk7pgjhaPCdXpoba";

  const addressInfo = wallet.deriveWalletFromXpubs(0, 2, [userXpub], 0, false);

  expect(addressInfo.address).toBeDefined();
  expect(addressInfo.address.startsWith("tb1")).toBe(true); // Testnet bech32 address
  expect(addressInfo.witnessScript).toBeDefined();
  expect(addressInfo.serverKeyDerivationPath).toBe("m/84'/1'/0'/0/0");
  expect(addressInfo.serverPublicKey).toBeDefined();
});

Deno.test("deriveWalletFromXpubs - derives change address from xpubs", () => {
  const wallet = setupWallet();
  // Mock user xpub for testnet
  const userXpub =
    "tpubDC5FSnBiZDMmhiuCmWAYsLwgLYrrT9rAqvTySfuCCrgsWz8wxMXUS9Tb9iVMvcRbvFcAHGkMD5Kx8koh4GquNGNTfohfk7pgjhaPCdXpoba";

  const addressInfo = wallet.deriveWalletFromXpubs(0, 2, [userXpub], 0, true);

  expect(addressInfo.address).toBeDefined();
  expect(addressInfo.witnessScript).toBeDefined();
  expect(addressInfo.serverKeyDerivationPath).toBe("m/84'/1'/0'/1/0");
});

Deno.test("deriveWalletFromXpubs - different addresses for different indices", () => {
  const wallet = setupWallet();
  const userXpub =
    "tpubDC5FSnBiZDMmhiuCmWAYsLwgLYrrT9rAqvTySfuCCrgsWz8wxMXUS9Tb9iVMvcRbvFcAHGkMD5Kx8koh4GquNGNTfohfk7pgjhaPCdXpoba";

  const address0 = wallet.deriveWalletFromXpubs(0, 2, [userXpub], 0, false);
  const address1 = wallet.deriveWalletFromXpubs(0, 2, [userXpub], 1, false);

  expect(address0.address).not.toBe(address1.address);
});

Deno.test("deriveWalletFromXpubs - handles multiple xpubs for multisig", () => {
  const wallet = setupWallet();
  const userXpubs = [
    "tpubDC5FSnBiZDMmhiuCmWAYsLwgLYrrT9rAqvTySfuCCrgsWz8wxMXUS9Tb9iVMvcRbvFcAHGkMD5Kx8koh4GquNGNTfohfk7pgjhaPCdXpoba",
    "tpubDCugpgy2nPkNo7sUE63qo4Z5FUyYqyJx1N6b3inPojJNdSn9Sd52aqiP4N2Afq8C1p8zRtATz2WMsmGkjyaLDBfB6y4pxTWaXEFL3z1Tb9J",
  ];

  const addressInfo = wallet.deriveWalletFromXpubs(0, 2, userXpubs, 0, false);

  expect(addressInfo.address).toBeDefined();
  expect(addressInfo.witnessScript).toBeDefined();
});

Deno.test("deriveWalletFromXpubs - throws on invalid address index", () => {
  const wallet = setupWallet();
  const userXpub =
    "tpubDC5FSnBiZDMmhiuCmWAYsLwgLYrrT9rAqvTySfuCCrgsWz8wxMXUS9Tb9iVMvcRbvFcAHGkMD5Kx8koh4GquNGNTfohfk7pgjhaPCdXpoba";

  expect(() => wallet.deriveWalletFromXpubs(0, 2, [userXpub], -1, false))
    .toThrow("Address index must be between");
});

Deno.test("deriveWalletFromXpubs - throws on invalid xpub", () => {
  const wallet = setupWallet();
  const invalidXpub = "invalid-xpub";

  expect(() => wallet.deriveWalletFromXpubs(0, 2, [invalidXpub], 0, false))
    .toThrow("Failed to derive key from xpub");
});

// Test suite for generateAddresses
Deno.test("generateAddresses - generates multiple receive addresses", () => {
  const wallet = setupWallet();
  const userXpub =
    "tpubDC5FSnBiZDMmhiuCmWAYsLwgLYrrT9rAqvTySfuCCrgsWz8wxMXUS9Tb9iVMvcRbvFcAHGkMD5Kx8koh4GquNGNTfohfk7pgjhaPCdXpoba";
  const count = 3;

  const addresses = wallet.generateAddresses(0, 2, [userXpub], 0, count, false);

  expect(addresses).toHaveLength(count);
  for (let i = 0; i < count; i++) {
    expect(addresses[i].serverKeyDerivationPath).toBe(`m/84'/1'/0'/0/${i}`);
  }

  // Each address should be unique
  const uniqueAddresses = new Set(addresses.map((info) => info.address));
  expect(uniqueAddresses.size).toBe(count);
});

Deno.test("generateAddresses - generates multiple change addresses", () => {
  const wallet = setupWallet();
  const userXpub =
    "tpubDC5FSnBiZDMmhiuCmWAYsLwgLYrrT9rAqvTySfuCCrgsWz8wxMXUS9Tb9iVMvcRbvFcAHGkMD5Kx8koh4GquNGNTfohfk7pgjhaPCdXpoba";
  const count = 3;

  const addresses = wallet.generateAddresses(0, 2, [userXpub], 0, count, true);

  expect(addresses).toHaveLength(count);
  for (let i = 0; i < count; i++) {
    expect(addresses[i].serverKeyDerivationPath).toBe(`m/84'/1'/0'/1/${i}`);
    expect(addresses[i].address.startsWith("tb1")).toBe(true);
  }
});

Deno.test("generateAddresses - generates addresses with custom start index", () => {
  const wallet = setupWallet();
  const userXpub =
    "tpubDC5FSnBiZDMmhiuCmWAYsLwgLYrrT9rAqvTySfuCCrgsWz8wxMXUS9Tb9iVMvcRbvFcAHGkMD5Kx8koh4GquNGNTfohfk7pgjhaPCdXpoba";
  const startIndex = 5;
  const count = 2;

  const addresses = wallet.generateAddresses(
    0,
    2,
    [userXpub],
    startIndex,
    count,
    false,
  );

  expect(addresses).toHaveLength(count);
  for (let i = 0; i < count; i++) {
    expect(addresses[i].serverKeyDerivationPath).toBe(
      `m/84'/1'/0'/0/${startIndex + i}`,
    );
  }
});

Deno.test("generateAddresses - generates addresses for different accounts", () => {
  const wallet = setupWallet();
  const userXpub =
    "tpubDC5FSnBiZDMmhiuCmWAYsLwgLYrrT9rAqvTySfuCCrgsWz8wxMXUS9Tb9iVMvcRbvFcAHGkMD5Kx8koh4GquNGNTfohfk7pgjhaPCdXpoba";

  const addresses1 = wallet.generateAddresses(0, 2, [userXpub], 0, 1, false);
  const addresses2 = wallet.generateAddresses(1, 2, [userXpub], 0, 1, false);

  expect(addresses1[0].serverKeyDerivationPath).toBe("m/84'/1'/0'/0/0");
  expect(addresses2[0].serverKeyDerivationPath).toBe("m/84'/1'/1'/0/0");

  // Addresses should be different
  expect(addresses1[0].address).not.toBe(addresses2[0].address);
});

// Test suite for createUnsignedTransaction
Deno.test("createUnsignedTransaction - creates valid transaction with sufficient funds", () => {
  const wallet = setupWallet();

  // Create mock witnessScript
  const witnessScript = bitcoin.script.compile([
    2, // m value (2-of-n)
    Buffer.from(
      "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
      "hex",
    ), // dummy pubkey 1
    Buffer.from(
      "02c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5",
      "hex",
    ), // dummy pubkey 2
    Buffer.from(
      "02f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9",
      "hex",
    ), // dummy pubkey 3
    3, // n value (3 total keys)
    bitcoin.script.OPS.OP_CHECKMULTISIG,
  ]);

  // Mock UTXOs
  const utxos: UTXO[] = [
    {
      txid: "0000000000000000000000000000000000000000000000000000000000000001",
      vout: 0,
      value: 1000000, // 0.01 BTC
      address: "tb1qcmurq55dzwvmwjljkhs79xawaw4gz35mtw9pet",
      witnessScript,
      derivationPath: "m/84'/1'/0'/0/0",
    },
  ];

  // Mock outputs
  const outputs: TxOutput[] = [
    {
      address: "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx",
      value: 500000, // 0.005 BTC
    },
  ];

  // Create transaction
  const unsignedTx = wallet.createUnsignedTransaction(utxos, outputs, 10);

  // Verify transaction was created correctly
  expect(unsignedTx).toBeDefined();
  expect(unsignedTx.psbtBase64).toBeDefined();
  expect(unsignedTx.fee).toBeGreaterThan(0);

  // Verify fee is reasonable
  expect(unsignedTx.fee).toBeLessThan(100000); // Less than 0.001 BTC

  // Total input should be greater than total output + fee
  expect(1000000).toBeGreaterThanOrEqual(500000 + unsignedTx.fee);
});

Deno.test("createUnsignedTransaction - throws error with insufficient funds", () => {
  const wallet = setupWallet();

  // Create mock witnessScript
  const witnessScript = bitcoin.script.compile([
    2, // m value
    Buffer.from(
      "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
      "hex",
    ),
    Buffer.from(
      "02c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5",
      "hex",
    ),
    2, // n value
    bitcoin.script.OPS.OP_CHECKMULTISIG,
  ]);

  // Mock UTXOs with small amount
  const utxos: UTXO[] = [
    {
      txid: "0000000000000000000000000000000000000000000000000000000000000001",
      vout: 0,
      value: 1000, // Very small amount
      address: "tb1qcmurq55dzwvmwjljkhs79xawaw4gz35mtw9pet",
      witnessScript,
      derivationPath: "m/84'/1'/0'/0/0",
    },
  ];

  // Mock outputs with larger amount
  const outputs: TxOutput[] = [
    {
      address: "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx",
      value: 5000, // More than available
    },
  ];

  // Should throw error for insufficient funds
  expect(() => wallet.createUnsignedTransaction(utxos, outputs, 10)).toThrow(
    "Insufficient funds",
  );
});

Deno.test("createUnsignedTransaction - throws error with no UTXOs", () => {
  const wallet = setupWallet();

  // Empty UTXOs array
  const utxos: UTXO[] = [];

  // Mock outputs
  const outputs: TxOutput[] = [
    {
      address: "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx",
      value: 5000,
    },
  ];

  // Should throw error for no UTXOs
  expect(() => wallet.createUnsignedTransaction(utxos, outputs, 10)).toThrow(
    "No UTXOs provided",
  );
});

Deno.test("createUnsignedTransaction - throws error with no outputs", () => {
  const wallet = setupWallet();

  // Create mock witnessScript
  const witnessScript = bitcoin.script.compile([
    2, // m value
    Buffer.from(
      "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
      "hex",
    ),
    Buffer.from(
      "02c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5",
      "hex",
    ),
    2, // n value
    bitcoin.script.OPS.OP_CHECKMULTISIG,
  ]);

  // Mock UTXOs
  const utxos: UTXO[] = [
    {
      txid: "0000000000000000000000000000000000000000000000000000000000000001",
      vout: 0,
      value: 100000,
      address: "tb1qcmurq55dzwvmwjljkhs79xawaw4gz35mtw9pet",
      witnessScript,
      derivationPath: "m/84'/1'/0'/0/0",
    },
  ];

  // Empty outputs array
  const outputs: TxOutput[] = [];

  // Should throw error for no outputs
  expect(() => wallet.createUnsignedTransaction(utxos, outputs, 10)).toThrow(
    "No outputs provided",
  );
});

Deno.test("createUnsignedTransaction - creates transaction with multiple inputs and outputs", () => {
  const wallet = setupWallet();

  // Create mock witnessScript
  const witnessScript = bitcoin.script.compile([
    2, // m value
    Buffer.from(
      "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
      "hex",
    ),
    Buffer.from(
      "02c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5",
      "hex",
    ),
    2, // n value
    bitcoin.script.OPS.OP_CHECKMULTISIG,
  ]);

  // Mock multiple UTXOs
  const utxos: UTXO[] = [
    {
      txid: "0000000000000000000000000000000000000000000000000000000000000001",
      vout: 0,
      value: 500000,
      address: "tb1qcmurq55dzwvmwjljkhs79xawaw4gz35mtw9pet",
      witnessScript,
      derivationPath: "m/84'/1'/0'/0/0",
    },
    {
      txid: "0000000000000000000000000000000000000000000000000000000000000002",
      vout: 1,
      value: 300000,
      address: "tb1qsh3y9q3kw2vz45rmw9l5hnswy96qnghmktk6dk",
      witnessScript,
      derivationPath: "m/84'/1'/0'/0/1",
    },
  ];

  // Mock multiple outputs
  const outputs: TxOutput[] = [
    {
      address: "tb1q8pknw0rdfuwwrzmr85aehhsecx2wfj0ca8j7hd",
      value: 400000,
    },
    {
      address: "tb1qytfsqjk04v9e8fus2xnmmzr083q9k7c7ra8vts",
      value: 300000,
    },
  ];

  // Create transaction
  const unsignedTx = wallet.createUnsignedTransaction(utxos, outputs, 10);

  // Verify transaction was created correctly
  expect(unsignedTx).toBeDefined();
  expect(unsignedTx.psbtBase64).toBeDefined();
  expect(unsignedTx.fee).toBeGreaterThan(0);
  expect(unsignedTx.fee).toBeLessThan(100000); // Less than 0.001 BTC
});

// Test suite for signTransactionWithServer
Deno.test("signTransactionWithServer - adds server signature to PSBT", () => {
  const accountIndex = 0;
  const userXpubs = [
    "tpubDCugpgy2nPkNo7sUE63qo4Z5FUyYqyJx1N6b3inPojJNdSn9Sd52aqiP4N2Afq8C1p8zRtATz2WMsmGkjyaLDBfB6y4pxTWaXEFL3z1Tb9J",
    "tpubDDpybz5Toi7KGYgyZXtsjxWFBgjVjFrrNeNPuMALvDQLAexWkz6UV8gQjQmDrngmkxLpm6tDWejubcFNQMuVpeCuxJD1ALphBM53CLqfAUf",
  ];
  const m = 2;

  const wallet = setupWallet();
  const { address, witnessScript, serverKeyDerivationPath } = wallet
    .deriveWalletFromXpubs(
      accountIndex,
      m,
      userXpubs,
      0,
      false,
    );

  // Mock UTXOs
  const utxos: UTXO[] = [
    {
      address,
      txid: "0000000000000000000000000000000000000000000000000000000000000001",
      vout: 0,
      value: 1000000, // 0.01 BTC
      witnessScript,
      derivationPath: serverKeyDerivationPath,
    },
  ];

  // Mock outputs
  const outputs: TxOutput[] = [
    {
      address: "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx",
      value: 500000, // 0.005 BTC
    },
  ];

  // Create unsigned transaction
  const unsignedTx = wallet.createUnsignedTransaction(utxos, outputs, 10);

  // Sign transaction with server key
  const signedTx = wallet.signTransactionWithServer(
    unsignedTx.psbtBase64,
    accountIndex,
    m,
  );

  // Verify signature was added
  expect(signedTx).toBeDefined();
  expect(signedTx.psbtBase64).toBeDefined();
  expect(signedTx.signaturesAdded).toBeGreaterThan(0);
  expect(signedTx.totalSignaturesRequired).toBe(2);
  expect(signedTx.isComplete).toBe(false); // Should not be complete as it needs more signatures
});
