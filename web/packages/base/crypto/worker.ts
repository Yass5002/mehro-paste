import { expose } from "comlink";
import * as libsodium from "./libsodium";

// Keep these as direct proxies; crypto logic belongs in libsodium.ts.
export class CryptoWorker {
    toB64 = libsodium.toB64;
    fromB64 = libsodium.fromB64;
    toB64URLSafe = libsodium.toB64URLSafe;
    toB64URLSafeNoPadding = libsodium.toB64URLSafeNoPadding;
    fromB64URLSafeNoPadding = libsodium.fromB64URLSafeNoPadding;
    toHex = libsodium.toHex;
    fromHex = libsodium.fromHex;
    generateKey = libsodium.generateKey;
    encryptBox = libsodium.encryptBox;
    encryptBlob = libsodium.encryptBlob;
    encryptBlobBytes = libsodium.encryptBlobBytes;
    encryptMetadataJSON = libsodium.encryptMetadataJSON;
    decryptBox = libsodium.decryptBox;
    decryptBoxBytes = libsodium.decryptBoxBytes;
    decryptBlob = libsodium.decryptBlob;
    decryptBlobBytes = libsodium.decryptBlobBytes;
    decryptMetadataJSON = libsodium.decryptMetadataJSON;
    generateDeriveKeySalt = libsodium.generateDeriveKeySalt;
    deriveKey = libsodium.deriveKey;
    deriveInteractiveKey = libsodium.deriveInteractiveKey;
    deriveModerateKey = libsodium.deriveModerateKey;
}

expose(CryptoWorker);
