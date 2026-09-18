"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.weapiBody = weapiBody;
const node_crypto_1 = require("node:crypto");
/**
 * 网易云 weapi 参数加密（公开算法，官方网页使用的接口族）：
 * 明文 → AES-128-CBC(nonce) → AES-128-CBC(随机 secKey) → params；secKey → RSA → encSecKey。
 * 说明：明文接口族 /api/... 会被服务端判为「不支持的旧客户端」（8821），weapi 是官方网页 surface。
 */
const NONCE = '0CoJUm6Qyw8W8jud';
const IV = '0102030405060708';
const MODULUS = '00e0b509f6259df8642dbc35662901477df22677ec152b5ff68ace615bb7b725152b3ab17a876aea8a5aa76d2e417629ec4ee341f56135fccf695280104e0312ecbda92557c93870114af6c9d05c4f7f0c3685b7a46bee255932575cce10b424d813cfe4875d3e82047b97ddef52741d546b8e289dc6935b3ece0462db0a22b8e7';
const EXPONENT = '010001';
function aesEncrypt(text, key) {
    const cipher = (0, node_crypto_1.createCipheriv)('aes-128-cbc', Buffer.from(key, 'utf8'), Buffer.from(IV, 'utf8'));
    return Buffer.concat([cipher.update(Buffer.from(text, 'utf8')), cipher.final()]).toString('base64');
}
function modPow(base, exponent, modulus) {
    let result = 1n;
    let value = base % modulus;
    let power = exponent;
    while (power > 0n) {
        if (power & 1n) {
            result = (result * value) % modulus;
        }
        value = (value * value) % modulus;
        power >>= 1n;
    }
    return result;
}
function rsaEncrypt(text) {
    const reversed = text.split('').reverse().join('');
    const hex = Buffer.from(reversed, 'utf8').toString('hex');
    const encrypted = modPow(BigInt(`0x${hex}`), BigInt(`0x${EXPONENT}`), BigInt(`0x${MODULUS}`));
    return encrypted.toString(16).padStart(256, '0');
}
/** 生成 weapi 的 form body：params=<双层 AES> & encSecKey=<RSA(secKey)>。 */
function weapiBody(payload) {
    const secKey = (0, node_crypto_1.randomBytes)(8).toString('hex').slice(0, 16);
    const params = aesEncrypt(aesEncrypt(JSON.stringify(payload), NONCE), secKey);
    return `params=${encodeURIComponent(params)}&encSecKey=${encodeURIComponent(rsaEncrypt(secKey))}`;
}
