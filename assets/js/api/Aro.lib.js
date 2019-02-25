const sha512 = require('js-sha512');
const baseX = require('base-x');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');
const crypto = require('crypto');
const randomBytes = require('random-bytes');
const KeyEncoder = require('key-encoder');

const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const Base58 = baseX(BASE58);
const keyEncoder = new KeyEncoder('secp256k1');

function sha256(msg, format) {
  var enc = format ? format : 'base64';
  if (enc === 'raw') {
    enc = null;
  }
  return crypto.createHash('sha256').update(msg).digest(enc);
}

function encryptWithIv(text, password, iv) {
  var pw = sha256(password, 'raw');
  var cipher = crypto.createCipheriv('aes-256-cbc', pw, iv)
  var crypted = cipher.update(text, 'utf8', 'base64')
  crypted += cipher.final('base64');
  var combined = Buffer.concat([iv, Buffer.from(crypted)]);
  console.log("PW: " + password);
  console.log("DATA: " + combined.toString('base64'));
  console.log(decryptWithIv(combined.toString('base64'), password));
  return combined.toString('base64');
}

function splitString(string, size) {
  var re = new RegExp('.{1,' + size + '}', 'g');
  return string.match(re);
}

function decryptWithIv(text, password) {
  console.log("======================");
  console.log("PW: " + password);
  console.log("DATA: " + text);
  console.log("======================");
  var raw = Buffer(text, 'base64');
  var iv = raw.slice(0, 16);
  var remain = raw.slice(16);
  var text = raw.slice(16).toString('utf8');
  var pw = sha256(password, 'raw');
  var decipher = crypto.createDecipheriv('aes-256-cbc', pw, iv)
  var dec = decipher.update(text, 'base64', 'utf8')
  dec += decipher.final('utf8');
  return dec;
}

function looksEncrypted(work) {
  return work.substr(0, 8) !== 'arionum:';
}

function pem2coin(pem) {
  var key64 = pem.replace(/^-.*\n?/mg, '').replace(/\n/mg, '');
  var buf = Buffer.from(key64, 'base64');
  return Base58.encode(buf);
}

function coin2pem(coin, priv) {
  var buf = Buffer.from(Base58.decode(coin));
  var key64 = buf.toString('base64');
  var formattedKey = splitString(key64, 64).join('\n');

  if (priv) {
    return `-----BEGIN EC PRIVATE KEY-----\n${formattedKey}\n-----END EC PRIVATE KEY-----\n`
  }
  return `-----BEGIN PUBLIC KEY-----\n${formattedKey}\n-----END PUBLIC KEY-----\n`;
}


let aro = class aro {

  constructor() {

  }

  static getAddress(getadr) {
    var bytes = sha512.array(getadr);
    for (var i = 0; i < 8; i++) {
      bytes = sha512.array(bytes);
    }
    return Base58.encode(Buffer.from(bytes));
  }

  static encodeBase58(getadr) {
    var buf = Buffer.from(getadr, 'utf8');
    return Base58.encode(buf);
  }

  static decodeBase58(getadr) {
    const bytes = Base58.decode(getadr)
    return bytes;
  }

  static encryptAro(aro, pw) {
    return randomBytes(16)
      .then(iv => {
        return encryptWithIv(aro, pw, iv);
      });
  }

  static decodeKeypair(encoded, pw) {
    if (looksEncrypted(encoded)) {
      if (!pw) {
        throw new Error('KEY NOT GIVEN ! Cannot decrypt without valid password');
      }
      try {
        var work = decryptWithIv(encoded, pw);
        console.log("DONE WITH IV");
        return aro.decodeKeypair(work, null);
      } catch (e) {
        console.log(e.stack);
      }
    }
    var parts = encoded.split(':');
    if (parts.length !== 3 || parts[0] !== 'arionum') {
      throw new TypeError('Invalid encoded key, expecting arionum format');
    }
    var pri58 = parts[1];
    var pub58 = parts[2];
    var priPem = coin2pem(pri58, true);
    var hex = keyEncoder.encodePrivate(priPem, 'pem', 'raw')
    var key = ec.keyFromPrivate(hex, 'hex');

    return {
      pem: priPem,
      encoded: encoded,
      privateCoin: pri58,
      publicCoin: pub58,
      key: key
    };
  }
  static encodeKeypair(key) {
    var keypair = key ? key : ec.genKeyPair();

    var priKey = keypair.getPrivate();
    var pubKey = keypair.getPublic();
    var priHex = priKey.toJSON();
    var priPem = keyEncoder.encodePrivate(priKey.toJSON(), 'raw', 'pem');
    var pubPem = keyEncoder.encodePublic(pubKey.encode('hex'), 'raw', 'pem');
    var pri58 = pem2coin(priPem);
    var pub58 = pem2coin(pubPem);

    return {
      pem: priPem,
      encoded: `arionum:${pri58}:${pub58}`,
      privateCoin: pri58,
      publicCoin: pub58,
      key: keypair
    }
  }
};