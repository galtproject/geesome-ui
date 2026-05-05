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
        <md-button class="md-accent md-icon-button" @click="editPinAccount(item)">
          <md-icon>edit</md-icon>
        </md-button>
      </md-table-cell>
    </md-table-row>
  </md-table>
</div>
`;
