module.exports = `
<div>
  <div style="display: flex; justify-content: space-between; align-items: center;">
    <h3>Pin services</h3>

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
    </md-card-content>

    <md-card-actions>
      <md-button @click="cancelPinAccount" class="md-raised">Cancel</md-button>
      <md-button @click="savePinAccount" class="md-raised md-accent" :disabled="isSaveDisabled">Save</md-button>
    </md-card-actions>
  </md-card>

  <md-table>
    <md-table-row>
      <md-table-head>Name</md-table-head>
      <md-table-head>Service</md-table-head>
      <md-table-head>Endpoint</md-table-head>
      <md-table-head>Encrypted</md-table-head>
      <md-table-head></md-table-head>
    </md-table-row>

    <md-table-row v-if="!loading && !pinAccounts.length">
      <md-table-cell colspan="5">No pin services configured.</md-table-cell>
    </md-table-row>

    <md-table-row v-for="item in pinAccounts" :key="item.id">
      <md-table-cell>{{item.name}}</md-table-cell>
      <md-table-cell>{{item.service | prettyName}}</md-table-cell>
      <md-table-cell>{{item.endpoint || 'Default Pinata endpoint'}}</md-table-cell>
      <md-table-cell>{{item.isEncrypted ? 'Yes' : 'No'}}</md-table-cell>
      <md-table-cell>
        <md-button class="md-accent md-icon-button" @click="editPinAccount(item)" :aria-label="'Edit pin service ' + item.name">
          <md-icon>edit</md-icon>
        </md-button>
        <md-button class="md-accent md-icon-button" @click="deletePinAccount(item)" :disabled="deletingId === item.id" :aria-label="'Delete pin service ' + item.name">
          <md-icon>delete</md-icon>
        </md-button>
      </md-table-cell>
    </md-table-row>
  </md-table>

  <md-card style="margin-top: 24px;">
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
