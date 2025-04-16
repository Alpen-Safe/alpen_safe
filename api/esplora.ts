import { FeeEstimation, Transaction, TransactionStatusResponse, TxOutspend, AddressUtxo } from './esploraTypes';
import BaseApi from './baseApi';

class Esplora extends BaseApi {
  getTransaction = async (txid: string): Promise<Transaction> => this.get<Transaction>(`tx/${txid}`);

  getTransactionStatus = async (txid: string): Promise<TransactionStatusResponse> => this.get<TransactionStatusResponse>(`tx/${txid}/status`);

  getRawTransaction = async (txid: string): Promise<string> => this.get<string>(`tx/${txid}/hex`);

  getAddressUtxos = async (address: string): Promise<AddressUtxo[]> => this.get<AddressUtxo[]>(`address/${address}/utxo`);

  getRawBlock = async (blockHash: string): Promise<Buffer> => this.get(`block/${blockHash}/raw`, 'arraybuffer');

  postTransaction = async (txId: string): Promise<string> => this.post<string, string>('tx', txId);

  getFeeEstimation = async (): Promise<FeeEstimation> => this.get<FeeEstimation>('v1/fees/recommended');

  getTxOutspend = async (txid: string, vout: number) => this.get<TxOutspend>(`tx/${txid}/outspend/${vout}`);
}

export default Esplora;
