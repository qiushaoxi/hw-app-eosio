require("babel-polyfill"); // problem of TransportNodeHid
const TransportNodeHid = require("@ledgerhq/hw-transport-node-hid").default;
const HwAppEosio = require("@qiushaoxi/hw-app-eosio").default;
//const HwAppEosio = require("../lib/index").default;


async function getPublicKey(index = 0) {
    const transport = await TransportNodeHid.open("");
    const instance = new HwAppEosio(transport);
    const path = `44'/194'/0'/0/${index}`
    const publicKey = await instance.getPublicKey(path);
    console.log(publicKey);
    await transport.close()
}

async function transaction(index = 0) {
    const transport = await TransportNodeHid.open("");
    const instance = new HwAppEosio(transport);
    const path = `44'/194'/0'/0/${index}`

    const Eos = require('eosjs')
    const config = {
        chainId: "aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906",
        httpEndpoint: "https://public.eosinfra.io",
        verbose: false,
    }
    config.signProvider = async function ({ buf, sign, transaction }) {
        console.log(transaction)
        const sig = await instance.signTransaction(path, transaction, config)
        console.log('sign result:', sig)
        return [sig]
    }

    const eos = Eos(config)

    const txResult = await eos.transaction(tr => {
        tr.transfer('account1', 'account2', '0.0001 EOS', 'test');
        // tr.transfer('account1', 'account2', '0.0002 EOS', 'test');
    })
    console.log(txResult)

    await transport.close()

}

// getPublicKey(100)
transaction(100)
