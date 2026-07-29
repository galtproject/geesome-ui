import Dexie from 'dexie';

const databaseName = 'geesome-chat-device-trust';

class ChatDeviceTrustStore {
  db;

  constructor() {
    this.db = new Dexie(databaseName);
    this.db.version(1).stores({
      trustedDevices: '&keyId, ownerId, deviceId, trustedAt'
    });
  }

  async list(ownerId) {
    return this.db.table('trustedDevices')
      .where('ownerId')
      .equals(ownerId)
      .toArray();
  }

  async save(fingerprint) {
    if (
      !fingerprint ||
      !fingerprint.keyId ||
      !fingerprint.ownerId ||
      !fingerprint.deviceId ||
      !fingerprint.version ||
      !fingerprint.algorithm ||
      !fingerprint.value
    ) {
      throw new Error('chat_device_fingerprint_invalid');
    }
    const record = {
      keyId: fingerprint.keyId,
      ownerId: fingerprint.ownerId,
      deviceId: fingerprint.deviceId,
      version: fingerprint.version,
      algorithm: fingerprint.algorithm,
      value: fingerprint.value,
      trustedAt: new Date().toISOString()
    };
    await this.db.table('trustedDevices').put(record);
    return record;
  }

  async remove(keyId) {
    await this.db.table('trustedDevices').delete(keyId);
  }

  async clearOwner(ownerId) {
    await this.db.table('trustedDevices').where('ownerId').equals(ownerId).delete();
  }
}

export {ChatDeviceTrustStore, databaseName};
export default new ChatDeviceTrustStore();
