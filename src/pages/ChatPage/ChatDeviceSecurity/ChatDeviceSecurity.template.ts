module.exports = `
<section class="chat-device-security" aria-labelledby="chat-security-title">
  <header class="chat-device-security-header">
    <div>
      <h2 id="chat-security-title">Chat security</h2>
      <p>Messages use keys held by this browser. Your node receives public keys and encrypted messages only.</p>
    </div>
    <md-button class="md-icon-button" @click="$emit('close')" aria-label="Close chat security" title="Close">
      <md-icon>close</md-icon>
    </md-button>
  </header>

  <md-progress-bar v-if="loading" md-mode="indeterminate"></md-progress-bar>
  <div v-if="error" class="chat-device-security-error" role="alert">{{error}}</div>

  <section v-if="!loading && !localDevice" class="chat-device-security-primary">
    <h3>Secure this browser</h3>
    <p>Create a device key and download its encrypted recovery file. The passphrase is never sent to your node.</p>

    <md-field>
      <label>Recovery passphrase</label>
      <md-input v-model="recoveryPassphrase" type="password" autocomplete="new-password"></md-input>
    </md-field>
    <md-field>
      <label>Confirm recovery passphrase</label>
      <md-input v-model="recoveryPassphraseConfirmation" type="password" autocomplete="new-password"></md-input>
    </md-field>
    <p class="chat-device-security-hint">Use at least 12 characters. Losing both browser data and the recovery file means this device cannot be recovered.</p>

    <md-button class="md-raised md-accent" @click="createDevice" :disabled="!canCreate" aria-label="Create secure chat device">
      <md-icon>enhanced_encryption</md-icon>
      Create device
    </md-button>
  </section>

  <section v-else-if="!loading" class="chat-device-security-current">
    <div class="chat-device-security-status"
         :class="{'is-revoked': currentRevoked, 'needs-registration': !currentRegistered && !currentRevoked}">
      <md-icon>{{currentRevoked ? 'block' : (currentRegistered ? 'verified_user' : 'warning')}}</md-icon>
      <div>
        <h3>{{currentRevoked ? 'This device was revoked' : (currentRegistered ? 'This browser is ready' : 'Registration needed')}}</h3>
        <p>Fingerprint {{fingerprintValue(localDevice)}}</p>
      </div>
    </div>
    <div class="chat-device-security-actions">
      <md-button v-if="currentRevoked" class="md-raised md-accent" @click="removeCurrentDevice" :disabled="busy">
        <md-icon>refresh</md-icon>
        Create a new device
      </md-button>
      <md-button v-else-if="!currentRegistered" class="md-raised md-accent" @click="registerCurrentDevice" :disabled="busy">
        <md-icon>how_to_reg</md-icon>
        Register device
      </md-button>
      <md-button class="md-raised" @click="downloadRecoveryBundle" :disabled="busy || !localDevice.recoveryBundle" aria-label="Download chat recovery file">
        <md-icon>download</md-icon>
        Download recovery
      </md-button>
    </div>
  </section>

  <details class="chat-device-security-details">
    <summary>Restore from recovery file</summary>
    <div class="chat-device-security-detail-body">
      <input ref="recoveryFile" type="file" accept="application/json,.json" class="chat-device-security-file" @change="readRecoveryFile">
      <md-button class="md-raised" @click="selectRecoveryFile" :disabled="busy">
        <md-icon>upload_file</md-icon>
        Choose recovery file
      </md-button>
      <span v-if="restoreFilename">{{restoreFilename}}</span>
      <md-field>
        <label>Recovery passphrase</label>
        <md-input v-model="restorePassphrase" type="password" autocomplete="current-password"></md-input>
      </md-field>
      <md-button class="md-raised md-accent" @click="restoreDevice" :disabled="!canRestore" aria-label="Restore secure chat device">
        <md-icon>restore</md-icon>
        Restore device
      </md-button>
    </div>
  </details>

  <details v-if="devices.length" class="chat-device-security-details">
    <summary>Devices and fingerprints ({{activeDevices.length}} active)</summary>
    <div class="chat-device-security-device-list">
      <div v-for="device in activeDevices" :key="device.keyId" class="chat-device-security-device">
        <div>
          <strong>{{isCurrentDevice(device) ? 'This browser' : 'Other browser'}}</strong>
          <span>{{fingerprintValue(device)}}</span>
          <small>{{device.deviceId}}</small>
        </div>
        <md-button class="md-icon-button" @click="revokeDevice(device)" :disabled="busy" :aria-label="'Revoke chat device ' + shortKeyId(device.keyId)" title="Revoke device">
          <md-icon>delete_forever</md-icon>
        </md-button>
      </div>
      <div v-if="revokedDevices.length" class="chat-device-security-revoked">
        {{revokedDevices.length}} revoked {{revokedDevices.length === 1 ? 'device' : 'devices'}}
      </div>
    </div>
  </details>
</section>
`;
