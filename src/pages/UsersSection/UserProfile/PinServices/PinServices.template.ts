module.exports = `
<div>
  <div style="display: flex; justify-content: space-between; align-items: center;">
    <h3>{{sectionTitle}}</h3>

    <md-button class="md-primary" @click="addPinAccount">Add pin service</md-button>
  </div>

  <md-card v-if="isFormVisible">
    <md-card-content>
      <md-field>
        <label>Account name</label>
        <md-input v-model="form.name"></md-input>
      </md-field>

      <md-field>
        <label>Service</label>
        <md-select v-model="form.service">
          <md-option value="pinata">Pinata</md-option>
        </md-select>
      </md-field>

      <md-field>
        <label>Endpoint</label>
        <md-input v-model="form.endpoint" placeholder="https://api.pinata.cloud/pinning/pinByHash"></md-input>
      </md-field>

      <md-field>
        <label>API key</label>
        <md-input v-model="form.apiKey"></md-input>
      </md-field>

      <md-field>
        <label>{{form.id ? 'New secret API key' : 'Secret API key'}}</label>
        <md-input v-model="form.secretApiKey" type="password"></md-input>
      </md-field>

      <md-checkbox v-model="form.isEncrypted" class="md-primary">Encrypt secret on this node</md-checkbox>

      <md-switch v-model="form.autoPinEnabled" class="md-primary">{{automaticPinLabel}}</md-switch>

      <div v-if="isGroupMode && form.autoPinEnabled" aria-label="Automatic group pin targets">
        <md-checkbox v-model="form.autoPinPostManifest" class="md-primary">Post manifests</md-checkbox>
        <md-checkbox v-model="form.autoPinContents" class="md-primary">Attachments and content</md-checkbox>
        <div v-if="hasInvalidAutoPinTargets" class="md-error">Select at least one automatic pin target.</div>
      </div>

      <details v-if="form.autoPinEnabled" style="margin-top: 12px;">
        <summary>Automatic pin settings</summary>

        <md-field>
          <label>Retry attempts</label>
          <md-input v-model.number="form.autoPinAttempts" type="number" min="1" max="10"></md-input>
        </md-field>

        <div v-for="(row, index) in form.autoPinMetadataRows" :key="index" class="md-layout md-gutter" style="align-items: center;">
          <div class="md-layout-item md-size-40 md-small-size-40">
            <md-field>
              <label>Metadata key</label>
              <md-input v-model="row.key"></md-input>
            </md-field>
          </div>
          <div class="md-layout-item md-size-40 md-small-size-40">
            <md-field>
              <label>Metadata value</label>
              <md-input v-model="row.value"></md-input>
            </md-field>
          </div>
          <div class="md-layout-item md-size-20 md-small-size-20">
            <md-button class="md-icon-button" @click="removeAutoPinMetadataRow(index)" aria-label="Remove automatic pin metadata">
              <md-icon>delete</md-icon>
            </md-button>
          </div>
        </div>

        <md-button class="md-primary" @click="addAutoPinMetadataRow" aria-label="Add automatic pin metadata">
          <md-icon>add</md-icon>
          Add metadata
        </md-button>
      </details>
    </md-card-content>

    <md-card-actions>
      <md-button @click="cancelPinAccount" class="md-raised">Cancel</md-button>
      <md-button @click="savePinAccount" class="md-raised md-accent" :disabled="isSaveDisabled">Save</md-button>
    </md-card-actions>
  </md-card>

  <div class="pin-services-account-list">
    <div v-if="!loading && !pinAccounts.length" class="pin-services-empty">
      {{isGroupMode ? 'No group pin services configured.' : 'No pin services configured.'}}
    </div>

    <section v-for="item in pinAccounts" :key="item.id" class="pin-services-account">
      <div class="pin-services-account-main">
        <div class="pin-services-account-identity">
          <div class="pin-services-account-title">
            <strong>{{item.name}}</strong>
            <span
              class="pin-services-status"
              :class="'pin-services-status-' + getAccountHealthState(item).key"
            >{{getAccountHealthState(item).label}}</span>
          </div>
          <div class="pin-services-account-summary">{{getAccountHealthSummary(item)}}</div>
          <small v-if="reconcileResultsById[item.id]" class="pin-services-reconcile-result">
            {{getQueuedChecksLabel(reconcileResultsById[item.id])}}
          </small>
          <small>
            {{item.service | prettyName}} ·
            <span>{{item.autoPinEnabled ? (isGroupMode ? 'Auto pin: ' + item.autoPinTargetsLabel : 'Auto pin enabled') : 'Automatic pinning off'}}</span>
          </small>
          <small>{{item.endpoint || 'Default Pinata endpoint'}} · {{item.isEncrypted ? 'Secret encrypted' : 'Secret stored as entered'}}</small>
        </div>

        <div class="pin-services-account-actions">
          <md-button
            class="md-primary md-icon-button"
            @click="reconcilePinAccount(item)"
            :disabled="reconcilingId === item.id"
            :aria-label="'Reconcile pin service ' + item.name"
            title="Reconcile pin account"
          >
            <md-icon>sync</md-icon>
          </md-button>
          <md-button class="md-accent md-icon-button" @click="editPinAccount(item)" :aria-label="'Edit pin service ' + item.name" title="Edit pin account">
            <md-icon>edit</md-icon>
          </md-button>
          <md-button class="md-accent md-icon-button" @click="deletePinAccount(item)" :disabled="deletingId === item.id" :aria-label="'Delete pin service ' + item.name" title="Delete pin account">
            <md-icon>delete</md-icon>
          </md-button>
        </div>
      </div>

      <details class="pin-services-diagnostics">
        <summary>Diagnostics and history</summary>

        <div class="pin-services-diagnostics-actions">
          <md-button
            class="md-raised"
            @click="testPinAccountCredentials(item)"
            :disabled="credentialTestingId === item.id"
            :aria-label="'Test credentials for pin service ' + item.name"
          >
            <md-icon>verified_user</md-icon>
            Test credentials
          </md-button>
          <md-button
            class="md-icon-button"
            @click="loadPinAccountHealth(item)"
            :disabled="healthLoadingById[item.id]"
            :aria-label="'Refresh status for pin service ' + item.name"
            title="Refresh account status"
          >
            <md-icon>refresh</md-icon>
          </md-button>
        </div>

        <div
          v-if="credentialResultsById[item.id]"
          class="pin-services-credential-result"
          :class="credentialResultsById[item.id].ok ? 'success' : 'error'"
        >
          {{credentialResultsById[item.id].ok
            ? 'Credentials verified ' + formatPinDate(credentialResultsById[item.id].checkedAt)
            : credentialResultsById[item.id].message}}
        </div>

        <div v-if="getAccountHealth(item)" class="pin-services-metrics" aria-label="Pin account status counts">
          <div><span>Total</span><strong>{{getAccountHealth(item).totalCount}}</strong></div>
          <div><span>Confirmed</span><strong>{{getStatusCount(getAccountHealth(item), 'confirmed')}}</strong></div>
          <div><span>Provider accepted</span><strong>{{getStatusCount(getAccountHealth(item), 'accepted')}}</strong></div>
          <div><span>Queued</span><strong>{{getStatusCount(getAccountHealth(item), 'requested')}}</strong></div>
          <div><span>Stale</span><strong>{{getAccountHealth(item).dueReconciliationCount}}</strong></div>
          <div><span>Failed or missing</span><strong>{{getFailureCount(getAccountHealth(item))}}</strong></div>
        </div>

        <div v-if="getAccountHealth(item)" class="pin-services-check-summary">
          <span>Last confirmed check: {{formatPinDate(getAccountHealth(item).lastSuccessfulCheckAt)}}</span>
          <span>Last provider check: {{formatPinDate(getAccountHealth(item).lastCheckedAt)}}</span>
        </div>

        <div v-if="getAccountHealth(item) && getAccountHealth(item).lastError" class="pin-services-last-error">
          <strong>Latest error</strong>
          <span>{{getAccountHealth(item).lastError.message || getAccountHealth(item).lastError.code || 'Unknown provider error'}}</span>
          <small>{{getAccountHealth(item).lastError.storageId}} · {{formatPinDate(getAccountHealth(item).lastError.failedAt)}}</small>
        </div>

        <div v-if="getAccountHealth(item) && getAccountHealth(item).recent.length" class="pin-services-history">
          <h4>Recent pin checks</h4>
          <div v-for="entry in getAccountHealth(item).recent" :key="entry.storageId" class="pin-services-history-row">
            <div class="pin-services-history-identity">
              <strong class="pin-services-storage-id">{{entry.storageId}}</strong>
              <small>Checked {{formatPinDate(entry.checkedAt || entry.lastReconcileAt || entry.lastAttemptAt)}}</small>
            </div>
            <div class="pin-services-history-actions">
              <span class="pin-services-status" :class="'pin-services-status-' + getPinEntryStatusKey(entry.status)">
                {{getPinEntryStatusLabel(entry.status)}}
              </span>
              <md-button
                v-if="canRetryPinEntry(entry.status)"
                class="md-primary md-icon-button"
                @click="reconcilePinAccount(item, {storageId: entry.storageId})"
                :disabled="reconcilingId === item.id"
                :aria-label="'Retry pin check ' + entry.storageId"
                title="Retry this pin check"
              >
                <md-icon>replay</md-icon>
              </md-button>
            </div>
          </div>
        </div>
        <div v-else-if="getAccountHealth(item)" class="pin-services-empty-history">No pin checks recorded yet.</div>
      </details>
    </section>
  </div>

  <md-card v-if="!isGroupMode" style="margin-top: 24px;">
    <md-card-header>
      <div class="md-title">Pin uploaded content</div>
    </md-card-header>

    <md-card-content>
      <md-field>
        <label>Pin service</label>
        <md-select v-model="pinAccountName" :disabled="!pinAccounts.length">
          <md-option v-for="item in pinAccounts" :key="item.id" :value="item.name">{{item.name}} ({{item.service | prettyName}})</md-option>
        </md-select>
      </md-field>

      <upload-content @uploaded="handleUploaded" :hide-methods="['enter_text', 'upload_link', 'choose_uploaded']"></upload-content>

      <md-field>
        <label>Storage id</label>
        <md-input v-model="pinStorageId" placeholder="CID from an uploaded Geesome file"></md-input>
      </md-field>

      <div v-if="uploadedContent && uploadedContent.id">
        Uploaded content #{{uploadedContent.id}}
      </div>

      <div v-if="lastPinResult">
        Last pin status: {{lastPinResult.status || 'ok'}} {{lastPinResult.statusText || ''}}
      </div>
    </md-card-content>

    <md-card-actions>
      <md-button class="md-raised md-accent" @click="pinUploadedContent" :disabled="isPinDisabled" aria-label="Pin uploaded content">
        <md-icon>cloud_upload</md-icon>
        Pin content
      </md-button>
    </md-card-actions>
  </md-card>
</div>
`;
