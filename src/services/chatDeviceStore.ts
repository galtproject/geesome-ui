import Dexie from 'dexie';

const databaseName = 'geesome-chat-device-keys';

class ChatDeviceStore {
  db;

  constructor() {
    this.db = new Dexie(databaseName);
    this.db.version(1).stores({
      devices: '&keyId, ownerId, deviceId, updatedAt'
    });
  }

  async getCurrent(ownerId) {
    const devices = await this.db.table('devices')
      .where('ownerId')
      .equals(ownerId)
      .toArray();
    devices.sort((left, right) =>
      String(right.updatedAt).localeCompare(String(left.updatedAt))
    );
    return devices[0] || null;
  }

  async save(device) {
    const publicBundle = device && device.publicBundle;
    if (!publicBundle || !device.privateKeys || !publicBundle.keyId) {
      throw new Error('chat_device_keys_invalid');
    }
    const now = new Date().toISOString();
    const record = {
      keyId: publicBundle.keyId,
      ownerId: publicBundle.ownerId,
      deviceId: publicBundle.deviceId,
      publicBundle,
      privateKeys: device.privateKeys,
      recoveryBundle: device.recoveryBundle || null,
      createdAt: publicBundle.createdAt || now,
      updatedAt: now
    };
    await this.db.table('devices').put(record);
    return record;
  }

  async remove(keyId) {
    await this.db.table('devices').delete(keyId);
  }

  async clearOwner(ownerId) {
    await this.db.table('devices').where('ownerId').equals(ownerId).delete();
  }
}

export {ChatDeviceStore, databaseName};
export default new ChatDeviceStore();
