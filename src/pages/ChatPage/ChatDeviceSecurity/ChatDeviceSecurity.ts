import browserE2eeHelper from 'geesome-libs-e2ee/src/browserE2eeHelper';
import fileSaver from 'file-saver';
import chatDeviceStore from '../../../services/chatDeviceStore';

export default {
  name: 'chat-device-security',
  template: require('./ChatDeviceSecurity.template'),
  props: {
    ownerId: {
      type: String,
      required: true
    }
  },
  async created() {
    this.deviceId = createDeviceId();
    await this.refresh();
  },
  methods: {
    async refresh() {
      this.loading = true;
      this.error = '';
      try {
        this.localDevice = await chatDeviceStore.getCurrent(this.ownerId);
        const response = await this.$geesome.getOwnChatDevices({includeRevoked: true});
        this.devices = response.list || [];
        await this.refreshFingerprints();
      } catch (error) {
        this.error = getErrorMessage(error, 'Chat device status is unavailable.');
      } finally {
        this.loading = false;
      }
    },
    async createDevice() {
      this.error = '';
      if (this.recoveryPassphrase !== this.recoveryPassphraseConfirmation) {
        this.error = 'Recovery passphrases do not match.';
        return;
      }

      this.busy = true;
      try {
        const device = await browserE2eeHelper.generateDeviceKeys({
          ownerId: this.ownerId,
          deviceId: this.deviceId,
          recoveryPassphrase: this.recoveryPassphrase
        });
        this.localDevice = await chatDeviceStore.save(device);
        await this.$geesome.registerChatDevice(device.publicBundle);
        this.downloadRecoveryBundle();
        this.clearPassphrases();
        await this.refresh();
        this.notify('success', 'Secure chat device created');
      } catch (error) {
        this.error = getErrorMessage(error, 'Secure chat device creation failed.');
      } finally {
        this.busy = false;
      }
    },
    selectRecoveryFile() {
      this.$refs.recoveryFile.click();
    },
    async readRecoveryFile(event) {
      this.error = '';
      const file = event.target.files && event.target.files[0];
      event.target.value = '';
      if (!file) {
        return;
      }
      try {
        const recoveryBundle = JSON.parse(await readFileText(file));
        if (!browserE2eeHelper.isDeviceRecoveryBundle(recoveryBundle)) {
          throw new Error('device_recovery_bundle_invalid');
        }
        if (recoveryBundle.publicBundle.ownerId !== this.ownerId) {
          throw new Error('device_recovery_owner_mismatch');
        }
        this.pendingRecoveryBundle = recoveryBundle;
        this.restoreFilename = file.name;
      } catch (error) {
        this.pendingRecoveryBundle = null;
        this.restoreFilename = '';
        this.error = getErrorMessage(error, 'The recovery file is invalid.');
      }
    },
    async restoreDevice() {
      if (!this.pendingRecoveryBundle) {
        this.error = 'Choose a recovery file first.';
        return;
      }
      if (this.localDevice && !confirm('Replace this browser chat device with the recovered device?')) {
        return;
      }

      this.busy = true;
      this.error = '';
      try {
        const restored = await browserE2eeHelper.restoreDeviceKeys(
          this.pendingRecoveryBundle,
          this.restorePassphrase
        );
        restored.recoveryBundle = this.pendingRecoveryBundle;
        const registered = await this.$geesome.registerChatDevice(restored.publicBundle);
        if (registered.revokedAt) {
          throw new Error('device_recovery_revoked');
        }
        await chatDeviceStore.clearOwner(this.ownerId);
        this.localDevice = await chatDeviceStore.save(restored);
        this.pendingRecoveryBundle = null;
        this.restoreFilename = '';
        this.restorePassphrase = '';
        await this.refresh();
        this.notify('success', 'Secure chat device restored');
      } catch (error) {
        this.error = getErrorMessage(error, 'Secure chat device recovery failed.');
      } finally {
        this.busy = false;
      }
    },
    async registerCurrentDevice() {
      if (!this.localDevice) {
        return;
      }
      this.busy = true;
      this.error = '';
      try {
        const registered = await this.$geesome.registerChatDevice(this.localDevice.publicBundle);
        if (registered.revokedAt) {
          throw new Error('device_recovery_revoked');
        }
        await this.refresh();
        this.notify('success', 'Chat device registered');
      } catch (error) {
        this.error = getErrorMessage(error, 'Chat device registration failed.');
      } finally {
        this.busy = false;
      }
    },
    async removeCurrentDevice() {
      if (!this.localDevice) {
        return;
      }
      this.error = '';
      this.busy = true;
      try {
        await chatDeviceStore.remove(this.localDevice.keyId);
        this.localDevice = null;
        this.notify('success', 'Create a new secure chat device');
      } catch (error) {
        this.error = getErrorMessage(error, 'The revoked device could not be removed.');
      } finally {
        this.busy = false;
      }
    },
    async revokeDevice(device) {
      if (!confirm(`Revoke chat device ${shortKeyId(device.keyId)}?`)) {
        return;
      }
      this.busy = true;
      this.error = '';
      try {
        await this.$geesome.revokeChatDevice(device.deviceId);
        if (this.localDevice && this.localDevice.keyId === device.keyId) {
          await chatDeviceStore.remove(this.localDevice.keyId);
          this.localDevice = null;
        }
        await this.refresh();
        this.notify('success', 'Chat device revoked');
      } catch (error) {
        this.error = getErrorMessage(error, 'Chat device revocation failed.');
      } finally {
        this.busy = false;
      }
    },
    downloadRecoveryBundle() {
      if (!this.localDevice || !this.localDevice.recoveryBundle) {
        return;
      }
      const blob = new Blob(
        [JSON.stringify(this.localDevice.recoveryBundle, null, 2)],
        {type: 'application/json'}
      );
      fileSaver.saveAs(blob, `geesome-chat-${this.localDevice.deviceId}-recovery.json`);
    },
    isCurrentDevice(device) {
      return !!this.localDevice && this.localDevice.keyId === device.keyId;
    },
    async refreshFingerprints() {
      const bundles = [
        this.localDevice && this.localDevice.publicBundle,
        ...this.devices.map(getPublicBundle)
      ].filter(bundle => !!bundle);
      const fingerprints = await Promise.all(
        bundles.map(bundle => browserE2eeHelper.getDeviceFingerprint(bundle))
      );
      this.deviceFingerprints = fingerprints.reduce((result, fingerprint) => ({
        ...result,
        [fingerprint.keyId]: fingerprint.value
      }), {});
    },
    fingerprintValue(device) {
      return this.deviceFingerprints[device && device.keyId] || shortKeyId(device && device.keyId);
    },
    shortKeyId,
    clearPassphrases() {
      this.recoveryPassphrase = '';
      this.recoveryPassphraseConfirmation = '';
    },
    notify(type, title) {
      if (this.$notify) {
        this.$notify({type, title});
      }
    }
  },
  computed: {
    activeDevices() {
      return this.devices.filter(device => !device.revokedAt);
    },
    revokedDevices() {
      return this.devices.filter(device => !!device.revokedAt);
    },
    currentRegistered() {
      return !!this.localDevice && this.activeDevices.some(device =>
        device.keyId === this.localDevice.keyId
      );
    },
    currentRevoked() {
      return !!this.localDevice && this.revokedDevices.some(device =>
        device.keyId === this.localDevice.keyId
      );
    },
    canCreate() {
      return !this.busy &&
        this.recoveryPassphrase.length >= 12 &&
        this.recoveryPassphrase === this.recoveryPassphraseConfirmation;
    },
    canRestore() {
      return !this.busy &&
        !!this.pendingRecoveryBundle &&
        this.restorePassphrase.length >= 12;
    }
  },
  data() {
    return {
      loading: false,
      busy: false,
      error: '',
      localDevice: null,
      devices: [],
      deviceId: '',
      recoveryPassphrase: '',
      recoveryPassphraseConfirmation: '',
      pendingRecoveryBundle: null,
      restoreFilename: '',
      restorePassphrase: '',
      deviceFingerprints: {}
    };
  }
};

function createDeviceId() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return `browser-${browserE2eeHelper.encodeBase64Url(bytes)}`;
}

function shortKeyId(value) {
  if (!value) {
    return 'unknown';
  }
  return value.length > 18 ? `${value.slice(0, 9)}...${value.slice(-6)}` : value;
}

function getPublicBundle(device) {
  if (!device) {
    return null;
  }
  if (device.publicBundle) {
    return device.publicBundle;
  }
  return {
    version: device.version,
    ownerId: device.ownerId,
    deviceId: device.deviceId,
    createdAt: device.createdAt,
    keyId: device.keyId,
    encryption: device.encryption,
    signing: device.signing,
    proof: device.proof
  };
}

function readFileText(file) {
  if (typeof file.text === 'function') {
    return file.text();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function getErrorMessage(error, fallback) {
  const code = error && (error.message || error.error || error.errorCode);
  const messages = {
    recovery_passphrase_too_short: 'Use at least 12 characters for the recovery passphrase.',
    device_recovery_decrypt_failed: 'The passphrase is wrong or the recovery file was changed.',
    device_recovery_bundle_invalid: 'The recovery file is invalid.',
    device_recovery_owner_mismatch: 'This recovery file belongs to another GeeSome account.',
    device_recovery_revoked: 'This device was revoked. Remove it from this browser and create a new device.'
  };
  return messages[code] || code || fallback;
}
