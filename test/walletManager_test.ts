import { SupabaseClient } from "@supabase/supabase-js";
import Supabase from "../model/supabase";
import BitcoinWallet from "../model/wallet/bitcoin/bitcoinWalletModel";
import { Buffer } from "node:buffer";
import { networks, Psbt } from "bitcoinjs-lib";
import WalletManager from "../model/wallet/walletManager";
import BitcoinMonitor from "../model/monitoring/bitcoinMonitor";
import Esplora from "../api/esplora";
import sinon from "sinon";
import { expect } from "chai";


// Setup function to create a new wallet instance
function setupWalletManager() {
  // Use a predictable seed
  const seed = Buffer.from(
    "6ceb52ac2f3d06613de91b0bca164e156254975930b3002ec3ded39ddd0b99df",
    "hex",
  );
  const network = networks.testnet;
  const supabase = new Supabase({ supabase: {} as SupabaseClient });
  const bitcoinWallet = new BitcoinWallet({ seed, network });
  const esplora = new Esplora('https://test.io');
  const bitcoinMonitor = new BitcoinMonitor({ supabase, esplora, network });
  const walletManager = new WalletManager({
    bitcoinWallet,
    supabase,
    bitcoinMonitor,
  });

  return walletManager;
}


describe("WalletManager", () => {
  let walletManager: WalletManager;

  beforeEach(() => {
    walletManager = setupWalletManager();
  });

  describe("buildWalletSpendPsbt", () => {
    const walletId = "123";
    let getWalletUtxosStub: sinon.SinonStub;
    let getWalletDataStub: sinon.SinonStub;
    let handoutAddressesStub: sinon.SinonStub;

    beforeEach(() => {
      getWalletUtxosStub = sinon.stub(walletManager.supabase, "getWalletUtxos");
      getWalletDataStub = sinon.stub(walletManager.supabase, "getWalletData");
      handoutAddressesStub = sinon.stub(walletManager, "handoutAddresses");

      getWalletUtxosStub.resolves([
        {
          utxo: "1d1aea914c74f8c1d19621635f3bdf1a96458ce893b96af1f7c02ff599fcebde:0",
          value: 1000,
          is_spent: false,
          confirmed: true,
          address: "tb1q5tkthrfk3kalrdfgrz4jvk6mp4z55xtdthmkevqyv793uwst0szs7nyr36",
          address_index: 0,
          change: false,
        },
        {
          utxo: "cd3d14968916cfa84e6ba1117fe9eeff2337092d9ac8a5085dbe0626e0ef67c2:1",
          value: 1000,
          is_spent: false,
          confirmed: true,
          address: "tb1q5tkthrfk3kalrdfgrz4jvk6mp4z55xtdthmkevqyv793uwst0szs7nyr36",
          address_index: 0,
          change: false,
        },
        {
          utxo: "577e76eaf2c0adaab38510a8a761604c7738740d62d2dcdf93ef93527a59ae50:1",
          value: 3000,
          is_spent: false,
          confirmed: true,
          address: "tb1q5tkthrfk3kalrdfgrz4jvk6mp4z55xtdthmkevqyv793uwst0szs7nyr36",
          address_index: 0,
          change: false,
        },
        {
          utxo: "066372c6f4c5960f95801c1679b7c67336ff8199181257f263945e2846cca51e:1",
          value: 1000,
          is_spent: false,
          confirmed: true,
          address: "tb1q5tkthrfk3kalrdfgrz4jvk6mp4z55xtdthmkevqyv793uwst0szs7nyr36",
          address_index: 0,
          change: false,
        },
        {
          utxo: "b0eebedacc12db8a1398755b6099f2d25ebf0d912c892dea2512d98359573fc3:0",
          value: 10000,
          is_spent: false,
          confirmed: true,
          address: "tb1q5tkthrfk3kalrdfgrz4jvk6mp4z55xtdthmkevqyv793uwst0szs7nyr36",
          address_index: 0,
          change: false,
        },
        {
          utxo: "c8849492a8dd02482ff7fec2d9add974f153c67e5e82880560f5f1571a00c157:1",
          value: 1000,
          is_spent: false,
          confirmed: true,
          address: "tb1q5tkthrfk3kalrdfgrz4jvk6mp4z55xtdthmkevqyv793uwst0szs7nyr36",
          address_index: 0,
          change: false,
        },
        {
          utxo: "20a2a3773549fbe2d00edf431b85652c1a925ec48c635a27355e852b58b33cc6:0",
          value: 1000,
          is_spent: false,
          confirmed: true,
          address: "tb1q5tkthrfk3kalrdfgrz4jvk6mp4z55xtdthmkevqyv793uwst0szs7nyr36",
          address_index: 0,
          change: false,
        },
        {
          utxo: "196ce2cdfab3ccbb6591cb6ac32f04912ec906271664c4b223997b0b0928d14d:0",
          value: 10000,
          is_spent: false,
          confirmed: true,
          address: "tb1q5tkthrfk3kalrdfgrz4jvk6mp4z55xtdthmkevqyv793uwst0szs7nyr36",
          address_index: 0,
          change: false,
        },
        {
          utxo: "6c10fbf137bc5725c71a41d8c65b4d33814a733ad3dec97dde95b5c2616e8602:0",
          value: 1000,
          is_spent: false,
          confirmed: true,
          address: "tb1q5tkthrfk3kalrdfgrz4jvk6mp4z55xtdthmkevqyv793uwst0szs7nyr36",
          address_index: 0,
          change: false,
        },
        {
          utxo: "c55bb3164731be1294ceb88d606ac1689c41642e466dd2d19f9737c33445364e:1",
          value: 1000,
          is_spent: false,
          confirmed: true,
          address: "tb1q5tkthrfk3kalrdfgrz4jvk6mp4z55xtdthmkevqyv793uwst0szs7nyr36",
          address_index: 0,
          change: false,
        },
        {
          utxo: "1e1b78007f9966dd427020e1f6370f1afba76db9ac12deb89eb25d3d93940d34:1",
          value: 10000,
          is_spent: false,
          confirmed: true,
          address: "tb1q5tkthrfk3kalrdfgrz4jvk6mp4z55xtdthmkevqyv793uwst0szs7nyr36",
          address_index: 0,
          change: false,
        },
        {
          utxo: "802527190ad2cb130283b7aed50829b017c37a45a15a222bf4959cf43cb27c3e:0",
          value: 2000,
          is_spent: false,
          confirmed: true,
          address: "tb1qt9cjangckpysg37g58235k9ysphvnryhnv9dn6eea6ae8mtz3g5q8usv8w",
          address_index: 1,
          change: false,
        },
        {
          utxo: "577e76eaf2c0adaab38510a8a761604c7738740d62d2dcdf93ef93527a59ae50:2",
          value: 2000,
          is_spent: false,
          confirmed: true,
          address: "tb1qt9cjangckpysg37g58235k9ysphvnryhnv9dn6eea6ae8mtz3g5q8usv8w",
          address_index: 1,
          change: false,
        },
        {
          utxo: "6f2544e0b6caee72773c203cfdea01c190d615ba15b8e93b36869782d3d3e4db:0",
          value: 400,
          is_spent: false,
          confirmed: true,
          address: "tb1qsg4hjxx4jqmg53cxq7l3qfxugradxpprh3gll6c0ukde5fs4p7gqg7e75t",
          address_index: 2,
          change: false,
        },
      ]);

      getWalletDataStub.resolves({
        account_id: 1,
        m: 2,
        user_xpubs: [
          "tpubDFRzvugMc1gKy96y5Kt4fRN44aEgHTWEc4wH8Dt7wq5JkKVz4NyMW8Wut2WY2JX6fNYL5TuHBVywZwXBBreA75TE53QnLMHbuSEtAdxX1as",
          "tpubDEvN39G5h5VauvQpq3wvkzQo3fSvf1kbKvd9Y6JSVrKSsdAEXH7ysV2D1DGwdS6KSB7GeKXSmhFkHru3mugDgSJQ2eay5jnQmHHJfsgvafu",
        ],
      });

      handoutAddressesStub.resolves([
        {
          address: "tb1qxd52v87nsh73sr0qcfrxw258s45jwntlrm57n28m5prspsqhs0sqpu3psm",
          addressIndex: 8,
          change: true,
        }
      ]);
    });

    it("should build a PSBT for a wallet spend", async () => {
      const receivers = [
        { address: "tb1qe79uqluw0ctp4tnjvxltydea9mwmt0hq5yxuqg", value: 1000 },
      ];
      const feePerByte = 10;

      
      const res = await walletManager.buildWalletSpendPsbt(walletId, receivers, feePerByte);

      if ("error" in res) {
        throw new Error(res.error);
      }

      expect(res).to.be.an("object");
      expect(res.psbtBase64).to.be.a("string");
      
      // Decode the PSBT and verify structure
      const psbt = Psbt.fromBase64(res.psbtBase64, {network: networks.testnet});
      expect(psbt.data.inputs.length).to.be.greaterThan(0, "PSBT should have at least one input");
      expect(psbt.data.outputs.length).to.equal(2, "PSBT should have exactly two outputs (payment and change)");
    });

    it("should return an error if the wallet has insufficient funds", async () => {
      const receivers = [
        { address: "tb1qe79uqluw0ctp4tnjvxltydea9mwmt0hq5yxuqg", value: 100000000 },
      ];
      const feePerByte = 10;

      const res = await walletManager.buildWalletSpendPsbt(walletId, receivers, feePerByte);
      if ("psbtBase64" in res) {
        throw new Error("PSBT should not be returned");
      }

      expect(res.error).to.equal("Insufficient funds");
    });
  });
});