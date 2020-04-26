import { convertPathToBuffer, serialize, foreachBuffer } from './utils';
const bippath = require('bip32-path')
const ecc = require('eosjs-ecc')

const LEDGER_CODES = {
  CLA: 0xD4,
  INFO: 0x06,
  PK: 0x02,
  SIGN: 0x04,
  SIGN_HASH: 0x08,
  YES: 0x01,
  NO: 0x00,
  FIRST: 0x00,
  MORE: 0x80
}

const VALID_STATUS = 0x9000;
const MSG_TOO_BIG = 0x6d08;
const APP_CLOSED = 0x6e00;
const TX_DENIED = 0x6985;
const TX_PARSE_ERR = 0x6d07;


export default class HwAppEosio {
  transport: any
  constructor(transport: any, scrambleKey = '"e0s"') {
    this.transport = transport;
    // transport.decorateAppAPIMethods(this, ['getPublicKey', 'signMessage'], scrambleKey);
  }

  async getPublicKey(path: string, keyPrefix = "EOS") {
    try {
      const pathBuffer = convertPathToBuffer(path);
      const result = await this.transport.send(LEDGER_CODES.CLA, LEDGER_CODES.PK, LEDGER_CODES.NO, LEDGER_CODES.NO, pathBuffer, [VALID_STATUS]);
      const publicKeyLength = result[0];
      const addressLength = result[1 + publicKeyLength];
      const publicKey = result.slice(
        1 + publicKeyLength + 1,
        1 + publicKeyLength + 1 + addressLength
      ).toString("ascii")
      if (!(keyPrefix === "EOS")) {
        return (keyPrefix + publicKey.slice(3))
      }
      return publicKey
    } catch (error) {
      console.error(error)
      throw this._convertTransportError(error);
    }
  }

  async signTransaction(path: string, transaction: any, eosjsConfig: any, Eos = require('eosjs')) {

    const paths = bippath.fromString(path).toPathArray();
    let offset = 0;

    let rawTx;
    try {
      const { fc } = Eos({ httpEndpoint: eosjsConfig.httpEndpoint, chainId: eosjsConfig.chainId });
      rawTx = Buffer.from(serialize(
        eosjsConfig.chainId,
        transaction,
        fc.types
      ).toString('hex'), "hex");
    } catch (e) {
      console.error('e', e);
      // throw new Error('Ledger Action Not Supported , Looks like this action isn\'t supported by the Ledger App')
      return null;
    }

    const toSend = [];
    let response: any;
    while (offset !== rawTx.length) {
      const maxChunkSize = offset === 0 ? 150 - 1 - paths.length * 4 : 150;
      const chunkSize = offset + maxChunkSize > rawTx.length ? rawTx.length - offset : maxChunkSize;
      const buffer = Buffer.alloc(offset === 0 ? 1 + paths.length * 4 + chunkSize : chunkSize);
      if (offset === 0) {
        buffer[0] = paths.length;
        paths.forEach((element: any, index: number) => buffer.writeUInt32BE(element, 1 + 4 * index));
        rawTx.copy(buffer, 1 + 4 * paths.length, offset, offset + chunkSize);
      } else rawTx.copy(buffer, 0, offset, offset + chunkSize)
      toSend.push(buffer);
      offset += chunkSize;
    }

    return foreachBuffer(toSend, (data: any, i: number) =>
      this.transport
        .send(LEDGER_CODES.CLA, LEDGER_CODES.SIGN, i === 0 ? LEDGER_CODES.FIRST : LEDGER_CODES.MORE, 0x00, data, [VALID_STATUS])
        .then((apduResponse: any) => response = apduResponse)
    ).then(() => {
      const v = response.slice(0, 1).toString("hex");
      const r = response.slice(1, 1 + 32).toString("hex");
      const s = response.slice(1 + 32, 1 + 32 + 32).toString("hex");
      return ecc.Signature.fromHex(v + r + s).toString();
    }).catch(err => {
      console.error('err', err);
      return null;
    })
  }

  // async sign(path: string, data: any, encoding?: any) {
  //   Ledger eos app do not support sign hash
  // }

  _convertTransportError(error: any) {
    switch (error.statusCode) {
      case APP_CLOSED:
        error.message = 'Your ledger app is closed! Please login.';
        break;
      case MSG_TOO_BIG:
        error.message = 'Your transaction is too big for the ledger to sign!';
        break;
      case TX_DENIED:
        error.message = 'You have denied the transaction on your ledger.';
        break;
      case TX_PARSE_ERR:
        error.message =
          'Error parsing transaction. Make sure your ledger app version is up to date.';
        break;
    }
    return error;
  }
}