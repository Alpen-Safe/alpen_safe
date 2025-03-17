import MultiSigWallet from "../model/multiSigWallet.ts";
import BaseController from "./baseController.ts";

class WalletController extends BaseController {
    private multiSigWallet: MultiSigWallet;
    
    constructor({ multiSigWallet }: { multiSigWallet: MultiSigWallet }) {
        super();
        this.multiSigWallet = multiSigWallet;
    }

    
}

export default WalletController;