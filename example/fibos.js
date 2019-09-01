require("babel-polyfill"); // problem of TransportNodeHid
const TransportNodeHid = require("@ledgerhq/hw-transport-node-hid").default;
const HwAppEosio = require("@qiushaoxi/hw-app-eosio").default;
//const HwAppEosio = require("../lib/index").default;


async function getPublicKey(index = 0) {
    const transport = await TransportNodeHid.open("");
    const instance = new HwAppEosio(transport);
    const path = `44'/194'/0'/0/${index}`
    const publicKey = await instance.getPublicKey(path, "FO");
    console.log(publicKey);
    await transport.close()
}

async function transaction(index = 0) {
    const transport = await TransportNodeHid.open("");
    const instance = new HwAppEosio(transport);
    const path = `44'/194'/0'/0/${index}`

    const Eos = require('eosjs')
    const config = {
        chainId: "6aa7bd33b6b45192465afa3553dedb531acaaff8928cf64b70bd4c5e49b7ec6a",
        httpEndpoint: "http://api.fibos.rocks",
        verbose: false,
        keyPrefix: "FO"
    }
    config.signProvider = async function ({ buf, sign, transaction }) {
        console.log(buf, sign, transaction)
        const sig = await instance.signTransaction(path, transaction, config)
        console.log('sign result:', sig)
        return [sig]
    }

    const eos = Eos(config)

    const txResult = await eos.transaction(tr => {
        tr.transfer('testledger12', 'rockrockrock', '0.0001 FO', 'test');
        tr.transfer('testledger12', 'rockrockrock', '0.0002 FO', 'test');
    })
    console.log(txResult)

    await transport.close()

}

getPublicKey(100)
// transaction(100)