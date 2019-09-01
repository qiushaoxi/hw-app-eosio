const bippath = require('bip32-path')
const asn1 = require('asn1-ber');
const fcbuffer = require('fcbuffer');

const serialize = (chainId: string, transaction: any, types: any) => {
  const writer = new asn1.BerWriter();

  encode(writer, fcbuffer.toBuffer(types.checksum256(), chainId));
  encode(writer, fcbuffer.toBuffer(types.time(), transaction.expiration));
  encode(writer, fcbuffer.toBuffer(types.uint16(), transaction.ref_block_num));
  encode(writer, fcbuffer.toBuffer(types.uint32(), transaction.ref_block_prefix));
  encode(writer, fcbuffer.toBuffer(types.unsigned_int(), 0));
  encode(writer, fcbuffer.toBuffer(types.uint8(), transaction.max_cpu_usage_ms));
  encode(writer, fcbuffer.toBuffer(types.unsigned_int(), transaction.delay_sec));
  encode(writer, fcbuffer.toBuffer(types.unsigned_int(), 0));
  encode(writer, fcbuffer.toBuffer(types.unsigned_int(), transaction.actions.length));

  for (let i = 0; i < transaction.actions.length; i += 1) {
    const action = transaction.actions[i];

    encode(writer, fcbuffer.toBuffer(types.account_name(), action.account));
    encode(writer, fcbuffer.toBuffer(types.action_name(), action.name));
    encode(writer, fcbuffer.toBuffer(types.unsigned_int(), action.authorization.length));

    for (let i = 0; i < action.authorization.length; i += 1) {
      const authorization = action.authorization[i];
      encode(writer, fcbuffer.toBuffer(types.account_name(), authorization.actor));
      encode(writer, fcbuffer.toBuffer(types.permission_name(), authorization.permission));
    }

    if (action.data) {
      const data = Buffer.from(action.data, 'hex');
      encode(writer, fcbuffer.toBuffer(types.unsigned_int(), data.length));
      encode(writer, data);
    }
    else {
      try {
        encode(writer, fcbuffer.toBuffer(types.unsigned_int(), 0))
        encode(writer, new Buffer(0));
      } catch (e) {
        //console.log('err', e);
      }
    }
  }

  encode(writer, fcbuffer.toBuffer(types.unsigned_int(), 0));
  encode(writer, fcbuffer.toBuffer(types.checksum256(), Buffer.alloc(32, 0)));

  return writer.buffer;
}

const encode = (writer: any, buffer: any) => {
  writer.writeBuffer(buffer, asn1.Ber.OctetString);
}

const foreachBuffer = (arr: any[], callback: any) => {
  function iterate(index: any, array: any, result: any) {
    if (index >= array.length) {
      return result;
    } return callback(array[index], index).then((res: any) => {
      result.push(res);
      return iterate(index + 1, array, result);
    });
  }
  return Promise.resolve().then(() => iterate(0, arr, []));
}

const convertPathToBuffer = function (path: string) {
  const paths = bippath.fromString(path).toPathArray();
  const buffer = Buffer.alloc(1 + paths.length * 4);
  buffer[0] = paths.length;
  paths.forEach((element: any, index: number) => buffer.writeUInt32BE(element, 1 + 4 * index));
  return buffer;
}

export {
  convertPathToBuffer, encode, foreachBuffer, serialize
}