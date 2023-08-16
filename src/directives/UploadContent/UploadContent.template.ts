module.exports = `
<div class="upload-content">
  <div class="md-layout" v-if="!mode">
    <div class="md-layout-item md-xsmall-size-50" v-if="!isHideEnterText">
      <md-button class="md-raised huge-button md-accent" @click="setMode('enter_text')">
        <md-icon class="fas fa-edit"></md-icon>

        <div>Enter Text</div>
      </md-button>
    </div>
    <div class="md-layout-item md-xsmall-size-50" v-if="!isHideUploadNew">
      <md-button class="md-raised huge-button md-accent" @click="setMode('upload_new')">
        <md-icon class="fas fa-upload"></md-icon>

        <div>Upload new</div>
      </md-button>
    </div>
    <div class="md-layout-item md-xsmall-size-50" v-if="!isHideUploadLink">
      <md-button class="md-raised huge-button md-accent" @click="setMode('upload_link')">
        <md-icon class="fas fa-link"></md-icon>

        <div>Upload by link</div>
      </md-button>
    </div>
    <div class="md-layout-item md-xsmall-size-50" v-if="!isHideChooseUploaded">
      <md-button class="md-raised huge-button md-accent" @click="chooseUploaded()">
        <md-icon class="fas fa-cloud"></md-icon>

        <div>Choose uploaded</div>
      </md-button>
    </div>
  </div>

  <div v-if="mode === 'enter_text'" class="text-editor">
    <div>
      <vue-editor v-model="localValue" :disabled="saving" :class="{'disabled': saving}"></vue-editor>
    </div>

    <md-button class="md-accent" @click="setMode(null)" :disabled="saving">
      <md-icon class="fas fa-times"></md-icon>
      Cancel
    </md-button>

    <md-button class="md-raised md-accent" @click="saveText()" :disabled="saving">
      <md-icon class="fas fa-save"></md-icon>
      Save text
    </md-button>
  </div>

  <div v-if="mode === 'upload_new'" class="file-upload">
    <div class="dropbox">
      <input type="file" multiple="multiple" @change="uploadFiles($event.target.files)">
      <p>Drop or choose file</p>
    </div>

    <md-button class="md-accent" @click="setMode(null)" :disabled="saving">
      <md-icon class="fas fa-times"></md-icon>
      Cancel
    </md-button>
  </div>

  <div v-if="mode === 'upload_link'" class="file-upload">
    <div class="md-layout">
      <div class="md-layout-item md-size-60">
        <md-field>
          <label>Url</label>
          <md-input v-model="localValue"></md-input>
        </md-field>
      </div>
      <div class="md-layout-item md-size-5">
      </div>
      <div class="md-layout-item md-size-35">
        <md-field>
          <label>Resource type</label>
          <md-select v-model="driver">
            <md-option value="none">Link to file</md-option>
            <md-option value="youtubeVideo">Youtube video</md-option>
          </md-select>
        </md-field>
      </div>
    </div>

    <md-button class="md-accent" @click="setMode(null)" :disabled="saving">
      <md-icon class="fas fa-times"></md-icon>
      Cancel
    </md-button>

    <md-button class="md-raised md-accent" @click="saveLink()" :disabled="saving">
      <md-icon class="fas fa-save"></md-icon>
      Save
    </md-button>
  </div>

  <md-progress-bar class="md-accent" md-mode="indeterminate" v-if="saving"></md-progress-bar>
</div>
`;