import {
  assertEquals,
  assertExists,
  assertNotEquals,
  assertThrows,
} from "jsr:@std/assert";
import { Buffer } from "node:buffer";
import { networks } from "bitcoinjs-lib";
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

  assertEquals(validateAccountIndex(0), true);
  assertEquals(validateAccountIndex(1), true);
  assertEquals(validateAccountIndex(2147483647), true);
});

Deno.test("validateAccountIndex - negative indices", () => {
  const wallet = setupWallet();
  const validateAccountIndex = accessPrivateMethod<(index: number) => boolean>(
    wallet,
    "validateAccountIndex",
  );

  assertEquals(validateAccountIndex(-1), false);
});

Deno.test("validateAccountIndex - non-integer indices", () => {
  const wallet = setupWallet();
  const validateAccountIndex = accessPrivateMethod<(index: number) => boolean>(
    wallet,
    "validateAccountIndex",
  );

  assertEquals(validateAccountIndex(1.5), false);
});

Deno.test("validateAccountIndex - indices beyond max", () => {
  const wallet = setupWallet();
  const validateAccountIndex = accessPrivateMethod<(index: number) => boolean>(
    wallet,
    "validateAccountIndex",
  );

  assertEquals(validateAccountIndex(2147483648), false);
});

// Test suite for deriveAccountNode
Deno.test("deriveAccountNode - derives node successfully", () => {
  const wallet = setupWallet();
  const deriveAccountNode = accessPrivateMethod<(accountId: number) => any>(
    wallet,
    "deriveAccountNode",
  );

  const accountNode = deriveAccountNode(0);
  assertExists(accountNode);
  assertExists(accountNode.publicKey);
  assertExists(accountNode.privateKey);
});

Deno.test("deriveAccountNode - different nodes for different accounts", () => {
  const wallet = setupWallet();
  const deriveAccountNode = accessPrivateMethod<(accountId: number) => any>(
    wallet,
    "deriveAccountNode",
  );

  const accountNode0 = deriveAccountNode(0);
  const accountNode1 = deriveAccountNode(1);

  assertNotEquals(
    Buffer.from(accountNode0.publicKey).toString("hex"),
    Buffer.from(accountNode1.publicKey).toString("hex"),
  );
});

Deno.test("deriveAccountNode - throws on invalid account index", () => {
  const wallet = setupWallet();
  const deriveAccountNode = accessPrivateMethod<(accountId: number) => any>(
    wallet,
    "deriveAccountNode",
  );

  assertThrows(
    () => deriveAccountNode(-1),
    Error,
    "Account index must be between",
  );
});

// Test suite for getServerKeyPair
Deno.test("getServerKeyPair - derives key pair for receive address", () => {
  const wallet = setupWallet();
  const getServerKeyPair = accessPrivateMethod<
    (accountId: number, addressIndex: number, change?: boolean) => any
  >(wallet, "getServerKeyPair");

  const keyPair = getServerKeyPair(0, 0, false);

  assertExists(keyPair.publicKey);
  assertExists(keyPair.privateKey);
  assertEquals(keyPair.derivationPath, "m/84'/1'/0'/0/0");
});

Deno.test("getServerKeyPair - derives key pair for change address", () => {
  const wallet = setupWallet();
  const getServerKeyPair = accessPrivateMethod<
    (accountId: number, addressIndex: number, change?: boolean) => any
  >(wallet, "getServerKeyPair");

  const keyPair = getServerKeyPair(0, 0, true);

  assertExists(keyPair.publicKey);
  assertExists(keyPair.privateKey);
  assertEquals(keyPair.derivationPath, "m/84'/1'/0'/1/0");
});

Deno.test("getServerKeyPair - different keys for different indices", () => {
  const wallet = setupWallet();
  const getServerKeyPair = accessPrivateMethod<
    (accountId: number, addressIndex: number, change?: boolean) => any
  >(wallet, "getServerKeyPair");

  const keyPair0 = getServerKeyPair(0, 0, false);
  const keyPair1 = getServerKeyPair(0, 1, false);

  assertNotEquals(
    Buffer.from(keyPair0.publicKey).toString("hex"),
    Buffer.from(keyPair1.publicKey).toString("hex"),
  );
});

Deno.test("getServerKeyPair - throws on invalid address index", () => {
  const wallet = setupWallet();
  const getServerKeyPair = accessPrivateMethod<
    (accountId: number, addressIndex: number, change?: boolean) => any
  >(wallet, "getServerKeyPair");

  assertThrows(
    () => getServerKeyPair(0, -1, false),
    Error,
    "Address index must be between",
  );
});

// Test suite for getServerAccountXpub
Deno.test("getServerAccountXpub - returns valid xpub", () => {
  const wallet = setupWallet();
  const xpub = wallet.getServerAccountXpub(0);

  assertExists(xpub);
  assertEquals(xpub.startsWith("tpub"), true); // Should be testnet pub key
});

Deno.test("getServerAccountXpub - different xpubs for different accounts", () => {
  const wallet = setupWallet();
  const xpub0 = wallet.getServerAccountXpub(0);
  const xpub1 = wallet.getServerAccountXpub(1);

  assertNotEquals(xpub0, xpub1);
});

Deno.test("getServerAccountXpub - throws on invalid account index", () => {
  const wallet = setupWallet();

  assertThrows(
    () => wallet.getServerAccountXpub(-1),
    Error,
    "Account index must be between",
  );
});

// Test suite for createWalletDescriptor
Deno.test("createWalletDescriptor - creates valid descriptor with user xpubs", () => {
  const wallet = setupWallet();
  // Use a testnet xpub for testing
  const userXpub =
    "tpubDC5FSnBiZDMmhiuCmWAYsLwgLYrrT9rAqvTySfuCCrgsWz8wxMXUS9Tb9iVMvcRbvFcAHGkMD5Kx8koh4GquNGNTfohfk7pgjhaPCdXpoba";
  const descriptor = wallet.createWalletDescriptor(0, [userXpub]);

  const serverXpub = wallet.getServerAccountXpub(0);
  const expectedFormat = `wsh(multi(2,${serverXpub}/0/*,${userXpub}/0/*))`;

  assertEquals(descriptor, expectedFormat);
});

Deno.test("createWalletDescriptor - handles multiple user xpubs", () => {
  const wallet = setupWallet();
  const userXpubs = [
    "tpubDC5FSnBiZDMmhiuCmWAYsLwgLYrrT9rAqvTySfuCCrgsWz8wxMXUS9Tb9iVMvcRbvFcAHGkMD5Kx8koh4GquNGNTfohfk7pgjhaPCdXpoba",
    "tpubDCcsjmHgBmMhNvPnnBYb71dNo2PEHipgTxHBDtZxPGA8bEofZjQrHptxftbpHDCNAMHNdMSFxFd9aYAZpQKwofLr5kf2HoQM6hSzYBRgM1R",
  ];

  const descriptor = wallet.createWalletDescriptor(0, userXpubs);

  // Should contain all xpubs
  for (const xpub of userXpubs) {
    assertEquals(descriptor.includes(xpub), true);
  }

  // Should have correct number of commas (number of xpubs)
  const commas = descriptor.match(/,/g) || [];
  assertEquals(commas.length - 1, userXpubs.length); // server xpub + user xpubs - 1
});

// Test suite for deriveAddressFromXpubs
Deno.test("deriveAddressFromXpubs - derives receive address from xpubs", () => {
  const wallet = setupWallet();
  // Mock user xpub for testnet
  const userXpub =
    "tpubDC5FSnBiZDMmhiuCmWAYsLwgLYrrT9rAqvTySfuCCrgsWz8wxMXUS9Tb9iVMvcRbvFcAHGkMD5Kx8koh4GquNGNTfohfk7pgjhaPCdXpoba";

  const addressInfo = wallet.deriveAddressFromXpubs(0, [userXpub], 0, false);

  assertExists(addressInfo.address);
  assertEquals(addressInfo.address.startsWith("tb1"), true); // Testnet bech32 address
  assertExists(addressInfo.witnessScript);
  assertEquals(addressInfo.serverKeyDerivationPath, "m/84'/1'/0'/0/0");
  assertExists(addressInfo.serverPublicKey);
});

Deno.test("deriveAddressFromXpubs - derives change address from xpubs", () => {
  const wallet = setupWallet();
  // Mock user xpub for testnet
  const userXpub =
    "tpubDC5FSnBiZDMmhiuCmWAYsLwgLYrrT9rAqvTySfuCCrgsWz8wxMXUS9Tb9iVMvcRbvFcAHGkMD5Kx8koh4GquNGNTfohfk7pgjhaPCdXpoba";

  const addressInfo = wallet.deriveAddressFromXpubs(0, [userXpub], 0, true);

  assertExists(addressInfo.address);
  assertExists(addressInfo.witnessScript);
  assertEquals(addressInfo.serverKeyDerivationPath, "m/84'/1'/0'/1/0");
});

Deno.test("deriveAddressFromXpubs - different addresses for different indices", () => {
  const wallet = setupWallet();
  const userXpub =
    "tpubDC5FSnBiZDMmhiuCmWAYsLwgLYrrT9rAqvTySfuCCrgsWz8wxMXUS9Tb9iVMvcRbvFcAHGkMD5Kx8koh4GquNGNTfohfk7pgjhaPCdXpoba";

  const address0 = wallet.deriveAddressFromXpubs(0, [userXpub], 0, false);
  const address1 = wallet.deriveAddressFromXpubs(0, [userXpub], 1, false);

  assertNotEquals(address0.address, address1.address);
});

Deno.test("deriveAddressFromXpubs - handles multiple xpubs for multisig", () => {
  const wallet = setupWallet();
  const userXpubs = [
    "tpubDC5FSnBiZDMmhiuCmWAYsLwgLYrrT9rAqvTySfuCCrgsWz8wxMXUS9Tb9iVMvcRbvFcAHGkMD5Kx8koh4GquNGNTfohfk7pgjhaPCdXpoba",
    "tpubDCugpgy2nPkNo7sUE63qo4Z5FUyYqyJx1N6b3inPojJNdSn9Sd52aqiP4N2Afq8C1p8zRtATz2WMsmGkjyaLDBfB6y4pxTWaXEFL3z1Tb9J",
  ];

  const addressInfo = wallet.deriveAddressFromXpubs(0, userXpubs, 0, false);

  assertExists(addressInfo.address);
  assertExists(addressInfo.witnessScript);
});

Deno.test("deriveAddressFromXpubs - throws on invalid address index", () => {
  const wallet = setupWallet();
  const userXpub =
    "tpubDC5FSnBiZDMmhiuCmWAYsLwgLYrrT9rAqvTySfuCCrgsWz8wxMXUS9Tb9iVMvcRbvFcAHGkMD5Kx8koh4GquNGNTfohfk7pgjhaPCdXpoba";

  assertThrows(
    () => wallet.deriveAddressFromXpubs(0, [userXpub], -1, false),
    Error,
    "Address index must be between",
  );
});

Deno.test("deriveAddressFromXpubs - throws on invalid xpub", () => {
  const wallet = setupWallet();
  const invalidXpub = "invalid-xpub";

  assertThrows(
    () => wallet.deriveAddressFromXpubs(0, [invalidXpub], 0, false),
    Error,
    "Failed to derive key from xpub",
  );
});

// Test suite for generateAddresses
Deno.test("generateAddresses - generates multiple receive addresses", () => {
  const wallet = setupWallet();
  const userXpub =
    "tpubDC5FSnBiZDMmhiuCmWAYsLwgLYrrT9rAqvTySfuCCrgsWz8wxMXUS9Tb9iVMvcRbvFcAHGkMD5Kx8koh4GquNGNTfohfk7pgjhaPCdXpoba";
  const count = 3;

  const addresses = wallet.generateAddresses(0, [userXpub], 0, count, false);

  assertEquals(addresses.length, count);
  for (let i = 0; i < count; i++) {
    assertEquals(addresses[i].serverKeyDerivationPath, `m/84'/1'/0'/0/${i}`);
  }

  // Each address should be unique
  const uniqueAddresses = new Set(addresses.map((info) => info.address));
  assertEquals(uniqueAddresses.size, count);
});

Deno.test("generateAddresses - generates multiple change addresses", () => {
  const wallet = setupWallet();
  const userXpub =
    "tpubDC5FSnBiZDMmhiuCmWAYsLwgLYrrT9rAqvTySfuCCrgsWz8wxMXUS9Tb9iVMvcRbvFcAHGkMD5Kx8koh4GquNGNTfohfk7pgjhaPCdXpoba";
  const count = 2;

  const addresses = wallet.generateAddresses(0, [userXpub], 0, count, true);

  assertEquals(addresses.length, count);
  for (let i = 0; i < count; i++) {
    assertEquals(addresses[i].serverKeyDerivationPath, `m/84'/1'/0'/1/${i}`);
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
    [userXpub],
    startIndex,
    count,
    false,
  );

  assertEquals(addresses.length, count);
  for (let i = 0; i < count; i++) {
    assertEquals(
      addresses[i].serverKeyDerivationPath,
      `m/84'/1'/0'/0/${startIndex + i}`,
    );
  }
});

Deno.test("generateAddresses - generates addresses for different accounts", () => {
  const wallet = setupWallet();
  const userXpub =
    "tpubDC5FSnBiZDMmhiuCmWAYsLwgLYrrT9rAqvTySfuCCrgsWz8wxMXUS9Tb9iVMvcRbvFcAHGkMD5Kx8koh4GquNGNTfohfk7pgjhaPCdXpoba";

  const addresses1 = wallet.generateAddresses(0, [userXpub], 0, 1, false);
  const addresses2 = wallet.generateAddresses(1, [userXpub], 0, 1, false);

  assertEquals(addresses1[0].serverKeyDerivationPath, "m/84'/1'/0'/0/0");
  assertEquals(addresses2[0].serverKeyDerivationPath, "m/84'/1'/1'/0/0");

  // Addresses should be different
  assertNotEquals(addresses1[0].address, addresses2[0].address);
});
