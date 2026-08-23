export type BytesOrB64 = Uint8Array | string;

export interface EncryptedBox {
    encryptedData: BytesOrB64;
    nonce: BytesOrB64;
}

export interface EncryptedBoxB64 {
    encryptedData: string;
    nonce: string;
}

export interface EncryptedBlob {
    encryptedData: BytesOrB64;
    decryptionHeader: BytesOrB64;
}

export interface EncryptedBlobBytes {
    encryptedData: Uint8Array<ArrayBuffer>;
    decryptionHeader: Uint8Array<ArrayBuffer>;
}

export interface EncryptedBlobB64 {
    encryptedData: string;
    decryptionHeader: string;
}

export interface DerivedKey {
    key: string;
    salt: string;
    opsLimit: number;
    memLimit: number;
}

