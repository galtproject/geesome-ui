module.exports = `
<div id="storage-space-page" class="container-page storage-space-page">
  <md-card>
    <md-card-header>
      <div class="md-title storage-space-title">
        <h1 class="md-title storage-space-heading">Storage space</h1>
        <md-button class="md-icon-button md-primary" @click="refreshStorageSpace" :disabled="loading" aria-label="Refresh storage analysis">
          <md-icon class="fas fa-sync-alt"></md-icon>
          <md-tooltip>Refresh</md-tooltip>
        </md-button>
      </div>
    </md-card-header>

    <md-card-content style="padding-top: 0;">
      <md-progress-bar md-mode="indeterminate" v-if="loading"></md-progress-bar>
      <div class="storage-space-error" v-if="errorMessage">{{errorMessage}}</div>

      <div class="storage-space-overview" v-if="overviewReady">
        <div class="storage-space-metric">
          <div class="metric-label">Logical content</div>
          <div class="metric-value">{{overview.logicalContentBytes | prettySize}}</div>
          <div class="metric-meta">{{getRowsText(overview.contentRowsCount)}}</div>
        </div>

        <div class="storage-space-metric">
          <div class="metric-label">Physical content</div>
          <div class="metric-value">{{overview.physicalContentBytes | prettySize}}</div>
          <div class="metric-meta">{{getStorageObjectsText(overview.contentStorageObjectsCount)}}</div>
        </div>

        <div class="storage-space-metric">
          <div class="metric-label">Shared savings</div>
          <div class="metric-value">{{physicalSavingsBytes | prettySize}}</div>
          <div class="metric-meta">{{duplicateRowsText}}</div>
        </div>

        <div class="storage-space-metric">
          <div class="metric-label">File catalog</div>
          <div class="metric-value">{{overview.fileCatalogLogicalBytes | prettySize}}</div>
          <div class="metric-meta">{{getRowsText(overview.fileCatalogItemsCount)}}</div>
        </div>

        <div class="storage-space-metric">
          <div class="metric-label">Groups</div>
          <div class="metric-value">{{overview.groupPostsLogicalBytes | prettySize}}</div>
          <div class="metric-meta">{{getRowsText(overview.groupPostsCount)}}</div>
        </div>

        <div class="storage-space-metric">
          <div class="metric-label">Pinned</div>
          <div class="metric-value">{{overview.pinnedPhysicalBytes | prettySize}}</div>
          <div class="metric-meta">{{getStorageObjectsText(overview.pinnedStorageObjectsCount)}}</div>
        </div>
      </div>
    </md-card-content>
  </md-card>

  <md-card>
    <md-card-content class="storage-space-controls">
      <md-tabs class="simple-tabs" @md-changed="setActiveTable">
        <md-tab id="contents" md-label="Largest files"></md-tab>
        <md-tab id="catalog" md-label="Catalog files"></md-tab>
        <md-tab id="groups" md-label="Groups"></md-tab>
        <md-tab id="types" md-label="File types"></md-tab>
      </md-tabs>

      <md-field class="storage-space-limit-field">
        <label>Rows</label>
        <md-select v-model="pageLimit" :disabled="loading">
          <md-option :value="10">10</md-option>
          <md-option :value="20">20</md-option>
          <md-option :value="50">50</md-option>
        </md-select>
      </md-field>
    </md-card-content>

    <md-card-content style="padding-top: 0;" v-if="activeTable === 'contents'">
      <md-table>
        <md-table-row>
          <md-table-head>Name</md-table-head>
          <md-table-head>Type</md-table-head>
          <md-table-head>Size</md-table-head>
          <md-table-head>Share</md-table-head>
          <md-table-head>Storage ID</md-table-head>
        </md-table-row>

        <md-table-row v-for="item in topContents" :key="item.id">
          <md-table-cell>{{getContentName(item)}}</md-table-cell>
          <md-table-cell>{{getTypeLabel(item)}}</md-table-cell>
          <md-table-cell>{{item.size | prettySize}}</md-table-cell>
          <md-table-cell>
            <div class="storage-space-bar">
              <span :style="{width: getUsageWidth(item.size, getLogicalTotal())}"></span>
            </div>
            <small>{{getPercentText(item.size, getLogicalTotal())}}</small>
          </md-table-cell>
          <md-table-cell>
            <pretty-hex :hex="item.storageId"></pretty-hex>
          </md-table-cell>
        </md-table-row>
      </md-table>
    </md-card-content>

    <md-card-content style="padding-top: 0;" v-if="activeTable === 'catalog'">
      <md-table>
        <md-table-row>
          <md-table-head>Name</md-table-head>
          <md-table-head>Type</md-table-head>
          <md-table-head>Size</md-table-head>
          <md-table-head>Group</md-table-head>
          <md-table-head>Storage ID</md-table-head>
        </md-table-row>

        <md-table-row v-for="item in topFileCatalogItems" :key="item.id">
          <md-table-cell>{{getCatalogName(item)}}</md-table-cell>
          <md-table-cell>{{getTypeLabel(item)}}</md-table-cell>
          <md-table-cell>{{item.size | prettySize}}</md-table-cell>
          <md-table-cell>{{item.groupId || '-'}}</md-table-cell>
          <md-table-cell>
            <pretty-hex :hex="item.storageId"></pretty-hex>
          </md-table-cell>
        </md-table-row>
      </md-table>
    </md-card-content>

    <md-card-content style="padding-top: 0;" v-if="activeTable === 'groups'">
      <md-table>
        <md-table-row>
          <md-table-head>Group</md-table-head>
          <md-table-head>Posts</md-table-head>
          <md-table-head>Size</md-table-head>
          <md-table-head>Share</md-table-head>
        </md-table-row>

        <md-table-row v-for="item in topGroups" :key="item.id">
          <md-table-cell>{{getGroupName(item)}}</md-table-cell>
          <md-table-cell>{{item.availablePostsCount}}</md-table-cell>
          <md-table-cell>{{item.size | prettySize}}</md-table-cell>
          <md-table-cell>
            <div class="storage-space-bar">
              <span :style="{width: getUsageWidth(item.size, overview.groupPostsLogicalBytes)}"></span>
            </div>
            <small>{{getPercentText(item.size, overview.groupPostsLogicalBytes)}}</small>
          </md-table-cell>
        </md-table-row>
      </md-table>
    </md-card-content>

    <md-card-content style="padding-top: 0;" v-if="activeTable === 'types'">
      <md-table>
        <md-table-row>
          <md-table-head>Type</md-table-head>
          <md-table-head>Rows</md-table-head>
          <md-table-head>Logical</md-table-head>
          <md-table-head>Physical</md-table-head>
          <md-table-head>Share</md-table-head>
        </md-table-row>

        <md-table-row v-for="item in typeBreakdown" :key="item.mimeType + item.extension">
          <md-table-cell>{{getTypeLabel(item)}}</md-table-cell>
          <md-table-cell>{{item.contentRowsCount}}</md-table-cell>
          <md-table-cell>{{item.logicalBytes | prettySize}}</md-table-cell>
          <md-table-cell>{{item.physicalBytes | prettySize}}</md-table-cell>
          <md-table-cell>
            <div class="storage-space-bar">
              <span :style="{width: getUsageWidth(item.logicalBytes, getLogicalTotal())}"></span>
            </div>
            <small>{{getPercentText(item.logicalBytes, getLogicalTotal())}}</small>
          </md-table-cell>
        </md-table-row>
      </md-table>
    </md-card-content>
  </md-card>
</div>
`;
