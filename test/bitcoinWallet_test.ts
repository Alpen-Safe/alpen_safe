/// <reference types="mocha" />
/// <reference types="chai" />

import { expect } from "chai";
import { Buffer } from "node:buffer";
import { networks } from "bitcoinjs-lib";
import * as bitcoin from "bitcoinjs-lib";
import { TxOutput, UTXO } from "../model/wallet/bitcoinWallet";
import BitcoinWallet from "../model/wallet/bitcoinWallet";

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
  return new BitcoinWallet({ seed, network });
}

describe("BitcoinWallet", () => {
  // Test suite for validateAccountIndex
  describe("validateAccountIndex", () => {
    it("should return true for valid indices", () => {
      const wallet = setupWallet();
      const validateAccountIndex = accessPrivateMethod<(index: number) => boolean>(
        wallet,
        "validateAccountIndex",
      );

      expect(validateAccountIndex(0)).to.be.true;
      expect(validateAccountIndex(1)).to.be.true;
      expect(validateAccountIndex(2147483647)).to.be.true;
    });

    it("should return false for negative indices", () => {
      const wallet = setupWallet();
      const validateAccountIndex = accessPrivateMethod<(index: number) => boolean>(
        wallet,
        "validateAccountIndex",
      );

      expect(validateAccountIndex(-1)).to.be.false;
    });

    it("should return false for non-integer indices", () => {
      const wallet = setupWallet();
      const validateAccountIndex = accessPrivateMethod<(index: number) => boolean>(
        wallet,
        "validateAccountIndex",
      );

      expect(validateAccountIndex(1.5)).to.be.false;
    });

    it("should return false for indices beyond max", () => {
      const wallet = setupWallet();
      const validateAccountIndex = accessPrivateMethod<(index: number) => boolean>(
        wallet,
        "validateAccountIndex",
      );

      expect(validateAccountIndex(2147483648)).to.be.false;
    });
  });

  // Test suite for deriveAccountNode
  describe("deriveAccountNode", () => {
    it("should derive node successfully", () => {
      const wallet = setupWallet();
      const deriveAccountNode = accessPrivateMethod<(accountId: number) => any>(
        wallet,
        "deriveAccountNode",
      );

      const { accountNode, path } = deriveAccountNode(0);
      expect(accountNode).to.exist;
      expect(accountNode.publicKey).to.exist;
      expect(accountNode.privateKey).to.exist;
      expect(path).to.equal("m/48'/1'/0'/2'");
    });

    it("should derive different nodes for different accounts", () => {
      const wallet = setupWallet();
      const deriveAccountNode = accessPrivateMethod<(accountId: number) => any>(
        wallet,
        "deriveAccountNode",
      );

      const { accountNode: accountNode0, path: path0 } = deriveAccountNode(0);
      const { accountNode: accountNode1, path: path1 } = deriveAccountNode(1);

      const pubKey0 = Buffer.from(accountNode0.publicKey).toString("hex");
      const pubKey1 = Buffer.from(accountNode1.publicKey).toString("hex");

      expect(pubKey0).to.not.equal(pubKey1);
      expect(path0).to.not.equal(path1);
      expect(path0).to.equal("m/48'/1'/0'/2'");
      expect(path1).to.equal("m/48'/1'/1'/2'");
    });

    it("should throw on invalid account index", () => {
      const wallet = setupWallet();
      const deriveAccountNode = accessPrivateMethod<(accountId: number) => any>(
        wallet,
        "deriveAccountNode",
      );

      expect(() => deriveAccountNode(-1)).to.throw("Account index must be between");
    });
  });

  // Test suite for getServerKeyPair
  describe("getServerKeyPair", () => {
    it("should derive key pair for receive address", () => {
      const wallet = setupWallet();
      const getServerKeyPair = accessPrivateMethod<
        (accountId: number, addressIndex: number, change?: boolean) => any
      >(wallet, "getServerKeyPair");

      const keyPair = getServerKeyPair(0, 0, false);

      expect(keyPair.publicKey).to.exist;
      expect(keyPair.privateKey).to.exist;
      expect(keyPair.derivationPath).to.equal("m/48'/1'/0'/2'/0/0");
    });

    it("should derive key pair for change address", () => {
      const wallet = setupWallet();
      const getServerKeyPair = accessPrivateMethod<
        (accountId: number, addressIndex: number, change?: boolean) => any
      >(wallet, "getServerKeyPair");

      const keyPair = getServerKeyPair(0, 0, true);

      expect(keyPair.publicKey).to.exist;
      expect(keyPair.privateKey).to.exist;
      expect(keyPair.derivationPath).to.equal("m/48'/1'/0'/2'/1/0");
    });

    it("should derive different keys for different indices", () => {
      const wallet = setupWallet();
      const getServerKeyPair = accessPrivateMethod<
        (accountId: number, addressIndex: number, change?: boolean) => any
      >(wallet, "getServerKeyPair");

      const keyPair0 = getServerKeyPair(0, 0, false);
      const keyPair1 = getServerKeyPair(0, 1, false);

      const pubKey0 = Buffer.from(keyPair0.publicKey).toString("hex");
      const pubKey1 = Buffer.from(keyPair1.publicKey).toString("hex");

      expect(pubKey0).to.not.equal(pubKey1);
    });

    it("should throw on invalid address index", () => {
      const wallet = setupWallet();
      const getServerKeyPair = accessPrivateMethod<
        (accountId: number, addressIndex: number, change?: boolean) => any
      >(wallet, "getServerKeyPair");

      expect(() => getServerKeyPair(0, -1, false)).to.throw(
        "Address index must be between",
      );
    });
  });

  // Test suite for getServerAccountXpub
  describe("getServerAccountXpub", () => {
    it("should return valid xpub", () => {
      const wallet = setupWallet();
      const { xpub, path } = wallet.getServerAccountXpub(0);

      expect(xpub).to.exist;
      expect(xpub.startsWith("tpub")).to.be.true; // Should be testnet pub key
    });

    it("should return different xpubs for different accounts", () => {
      const wallet = setupWallet();
      const xpub0 = wallet.getServerAccountXpub(0);
      const xpub1 = wallet.getServerAccountXpub(1);

      expect(xpub0).to.not.deep.equal(xpub1);
    });

    it("should throw on invalid account index", () => {
      const wallet = setupWallet();

      expect(() => wallet.getServerAccountXpub(-1)).to.throw(
        "Account index must be between",
      );
    });
  });

  // Test suite for createWalletDescriptor
  describe("createWalletDescriptor", () => {
    it("should create valid descriptor with user xpubs", () => {
      const wallet = setupWallet();
      // Use a testnet xpub for testing
      const userXpub =
        "tpubDC5FSnBiZDMmhiuCmWAYsLwgLYrrT9rAqvTySfuCCrgsWz8wxMXUS9Tb9iVMvcRbvFcAHGkMD5Kx8koh4GquNGNTfohfk7pgjhaPCdXpoba";
      const { walletDescriptor, serverDerivationPath } = wallet
        .createWalletDescriptor(0, 2, [userXpub]);

      const { xpub } = wallet.getServerAccountXpub(0);
      const expectedFormat = `wsh(multi(2,${xpub}/0/*,${userXpub}/0/*))`;

      expect(walletDescriptor).to.equal(expectedFormat);
      expect(serverDerivationPath).to.equal("m/48'/1'/0'/2'");
    });

    it("should handle multiple user xpubs", () => {
      const wallet = setupWallet();
      const userXpubs = [
        "tpubDC5FSnBiZDMmhiuCmWAYsLwgLYrrT9rAqvTySfuCCrgsWz8wxMXUS9Tb9iVMvcRbvFcAHGkMD5Kx8koh4GquNGNTfohfk7pgjhaPCdXpoba",
        "tpubDCcsjmHgBmMhNvPnnBYb71dNo2PEHipgTxHBDtZxPGA8bEofZjQrHptxftbpHDCNAMHNdMSFxFd9aYAZpQKwofLr5kf2HoQM6hSzYBRgM1R",
      ];

      const { walletDescriptor } = wallet.createWalletDescriptor(0, 2, userXpubs);

      // Should contain all xpubs
      for (const xpub of userXpubs) {
        expect(walletDescriptor).to.include(xpub);
      }

      // Should have correct number of commas (number of xpubs)
      const commas = walletDescriptor.match(/,/g) || [];
      expect(commas.length - 1).to.equal(userXpubs.length);
      expect(walletDescriptor).to.equal(
        "wsh(multi(2,tpubDFH9dgzveyD8zTbPUFuLrGmCydNvxehyNdUXKJAQN8x4aZ4j6UZqGfnqFrD4NqyaTVGKbvEW54tsvPTK2UoSbCC1PJY8iCNiwTL3RWZEheQ/0/*,tpubDC5FSnBiZDMmhiuCmWAYsLwgLYrrT9rAqvTySfuCCrgsWz8wxMXUS9Tb9iVMvcRbvFcAHGkMD5Kx8koh4GquNGNTfohfk7pgjhaPCdXpoba/0/*,tpubDCcsjmHgBmMhNvPnnBYb71dNo2PEHipgTxHBDtZxPGA8bEofZjQrHptxftbpHDCNAMHNdMSFxFd9aYAZpQKwofLr5kf2HoQM6hSzYBRgM1R/0/*))",
      );
    });
  });

  // Test suite for deriveWalletFromXpubs
  describe("deriveWalletFromXpubs", () => {
    it("should derive receive address from xpubs", () => {
      const wallet = setupWallet();
      // Mock user xpub for testnet
      const userXpub =
        "tpubDC5FSnBiZDMmhiuCmWAYsLwgLYrrT9rAqvTySfuCCrgsWz8wxMXUS9Tb9iVMvcRbvFcAHGkMD5Kx8koh4GquNGNTfohfk7pgjhaPCdXpoba";

      const addressInfo = wallet.deriveWalletFromXpubs(0, 2, [userXpub], 0, false);

      expect(addressInfo.address).to.exist;
      expect(addressInfo.address.startsWith("tb1")).to.be.true; // Testnet bech32 address
      expect(addressInfo.witnessScript).to.exist;
      expect(addressInfo.serverKeyDerivationPath).to.equal("m/48'/1'/0'/2'/0/0");
      expect(addressInfo.serverPublicKey).to.exist;
    });

    it("should derive change address from xpubs", () => {
      const wallet = setupWallet();
      // Mock user xpub for testnet
      const userXpub =
        "tpubDC5FSnBiZDMmhiuCmWAYsLwgLYrrT9rAqvTySfuCCrgsWz8wxMXUS9Tb9iVMvcRbvFcAHGkMD5Kx8koh4GquNGNTfohfk7pgjhaPCdXpoba";

      const addressInfo = wallet.deriveWalletFromXpubs(0, 2, [userXpub], 0, true);

      expect(addressInfo.address).to.exist;
      expect(addressInfo.witnessScript).to.exist;
      expect(addressInfo.serverKeyDerivationPath).to.equal("m/48'/1'/0'/2'/1/0");
    });

    it("should derive different addresses for different indices", () => {
      const wallet = setupWallet();
      const userXpub =
        "tpubDC5FSnBiZDMmhiuCmWAYsLwgLYrrT9rAqvTySfuCCrgsWz8wxMXUS9Tb9iVMvcRbvFcAHGkMD5Kx8koh4GquNGNTfohfk7pgjhaPCdXpoba";

      const address0 = wallet.deriveWalletFromXpubs(0, 2, [userXpub], 0, false);
      const address1 = wallet.deriveWalletFromXpubs(0, 2, [userXpub], 1, false);

      expect(address0.address).to.not.equal(address1.address);
    });

    it("should handle multiple xpubs for multisig", () => {
      const wallet = setupWallet();
      const userXpubs = [
        "tpubDC5FSnBiZDMmhiuCmWAYsLwgLYrrT9rAqvTySfuCCrgsWz8wxMXUS9Tb9iVMvcRbvFcAHGkMD5Kx8koh4GquNGNTfohfk7pgjhaPCdXpoba",
        "tpubDCugpgy2nPkNo7sUE63qo4Z5FUyYqyJx1N6b3inPojJNdSn9Sd52aqiP4N2Afq8C1p8zRtATz2WMsmGkjyaLDBfB6y4pxTWaXEFL3z1Tb9J",
      ];

      const addressInfo = wallet.deriveWalletFromXpubs(0, 2, userXpubs, 0, false);

      expect(addressInfo.address).to.exist;
      expect(addressInfo.witnessScript).to.exist;
    });

    it("should throw on invalid address index", () => {
      const wallet = setupWallet();
      const userXpub =
        "tpubDC5FSnBiZDMmhiuCmWAYsLwgLYrrT9rAqvTySfuCCrgsWz8wxMXUS9Tb9iVMvcRbvFcAHGkMD5Kx8koh4GquNGNTfohfk7pgjhaPCdXpoba";

      expect(() => wallet.deriveWalletFromXpubs(0, 2, [userXpub], -1, false))
        .to.throw("Address index must be between");
    });

    it("should throw on invalid xpub", () => {
      const wallet = setupWallet();
      const invalidXpub = "invalid-xpub";

      expect(() => wallet.deriveWalletFromXpubs(0, 2, [invalidXpub], 0, false))
        .to.throw("Failed to derive key from xpub");
    });
  });

  // Test suite for deriveAddresses
  describe("deriveAddresses", () => {
    it("should generate multiple receive addresses", () => {
      const wallet = setupWallet();
      const userXpub =
        "tpubDC5FSnBiZDMmhiuCmWAYsLwgLYrrT9rAqvTySfuCCrgsWz8wxMXUS9Tb9iVMvcRbvFcAHGkMD5Kx8koh4GquNGNTfohfk7pgjhaPCdXpoba";
      const count = 3;

      const addresses = wallet.deriveAddresses(0, 2, [userXpub], 0, count, false);

      expect(addresses).to.have.lengthOf(count);
      for (let i = 0; i < count; i++) {
        expect(addresses[i].serverKeyDerivationPath).to.equal(`m/48'/1'/0'/2'/0/${i}`);
      }

      // Each address should be unique
      const uniqueAddresses = new Set(addresses.map((info) => info.address));
      expect(uniqueAddresses.size).to.equal(count);
    });

    it("should generate multiple change addresses", () => {
      const wallet = setupWallet();
      const userXpub =
        "tpubDC5FSnBiZDMmhiuCmWAYsLwgLYrrT9rAqvTySfuCCrgsWz8wxMXUS9Tb9iVMvcRbvFcAHGkMD5Kx8koh4GquNGNTfohfk7pgjhaPCdXpoba";
      const count = 3;

      const addresses = wallet.deriveAddresses(0, 2, [userXpub], 0, count, true);

      expect(addresses).to.have.lengthOf(count);
      for (let i = 0; i < count; i++) {
        expect(addresses[i].serverKeyDerivationPath).to.equal(`m/48'/1'/0'/2'/1/${i}`);
        expect(addresses[i].address.startsWith("tb1")).to.be.true;
      }
    });

    it("should generate addresses with custom start index", () => {
      const wallet = setupWallet();
      const userXpub =
        "tpubDC5FSnBiZDMmhiuCmWAYsLwgLYrrT9rAqvTySfuCCrgsWz8wxMXUS9Tb9iVMvcRbvFcAHGkMD5Kx8koh4GquNGNTfohfk7pgjhaPCdXpoba";
      const startIndex = 5;
      const count = 2;

      const addresses = wallet.deriveAddresses(
        0,
        2,
        [userXpub],
        startIndex,
        count,
        false,
      );

      expect(addresses).to.have.lengthOf(count);
      for (let i = 0; i < count; i++) {
        expect(addresses[i].serverKeyDerivationPath).to.equal(
          `m/48'/1'/0'/2'/0/${startIndex + i}`,
        );
      }
    });

    it("should generate addresses for different accounts", () => {
      const wallet = setupWallet();
      const userXpub =
        "tpubDC5FSnBiZDMmhiuCmWAYsLwgLYrrT9rAqvTySfuCCrgsWz8wxMXUS9Tb9iVMvcRbvFcAHGkMD5Kx8koh4GquNGNTfohfk7pgjhaPCdXpoba";

      const addresses1 = wallet.deriveAddresses(0, 2, [userXpub], 0, 1, false);
      const addresses2 = wallet.deriveAddresses(1, 2, [userXpub], 0, 1, false);

      expect(addresses1[0].serverKeyDerivationPath).to.equal("m/48'/1'/0'/2'/0/0");
      expect(addresses2[0].serverKeyDerivationPath).to.equal("m/48'/1'/1'/2'/0/0");

      // Addresses should be different
      expect(addresses1[0].address).to.not.equal(addresses2[0].address);
    });
  });

  // Test suite for createUnsignedTransaction
  describe("createUnsignedTransaction", () => {
    it("should create valid transaction with sufficient funds", () => {
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
          derivationPath: "m/48'/1'/0'/2'/0/0",
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
      expect(unsignedTx).to.exist;
      expect(unsignedTx.psbtBase64).to.exist;
      expect(unsignedTx.fee).to.be.greaterThan(0);

      // Verify fee is reasonable
      expect(unsignedTx.fee).to.be.lessThan(100000); // Less than 0.001 BTC

      // Total input should be greater than total output + fee
      expect(1000000).to.be.at.least(500000 + unsignedTx.fee);
    });

    it("should throw error with insufficient funds", () => {
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
          derivationPath: "m/48'/1'/0'/2'/0/0",
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
      expect(() => wallet.createUnsignedTransaction(utxos, outputs, 10)).to.throw(
        "Insufficient funds",
      );
    });

    it("should throw error with no UTXOs", () => {
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
      expect(() => wallet.createUnsignedTransaction(utxos, outputs, 10)).to.throw(
        "No UTXOs provided",
      );
    });

    it("should throw error with no outputs", () => {
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
          derivationPath: "m/48'/1'/0'/2'/0/0",
        },
      ];

      // Empty outputs array
      const outputs: TxOutput[] = [];

      // Should throw error for no outputs
      expect(() => wallet.createUnsignedTransaction(utxos, outputs, 10)).to.throw(
        "No outputs provided",
      );
    });

    it("should create transaction with multiple inputs and outputs", () => {
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
          derivationPath: "m/48'/1'/0'/2'/0/0",
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
      expect(unsignedTx).to.exist;
      expect(unsignedTx.psbtBase64).to.exist;
      expect(unsignedTx.fee).to.be.greaterThan(0);
      expect(unsignedTx.fee).to.be.lessThan(100000); // Less than 0.001 BTC
    });
  });

  // Test suite for signTransactionWithServer
  describe("signTransactionWithServer", () => {
    it("should add server signature to PSBT", () => {
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
      );

      // Verify signature was added
      expect(signedTx).to.exist;
      expect(signedTx.psbtBase64).to.exist;
      expect(signedTx.signaturesAdded).to.be.greaterThan(0);
      expect(signedTx.isComplete).to.be.false; // Should not be complete as it needs more signatures
    });
  });
});
