/*
 * Copyright ©️ 2018-2020 Galt•Project Society Construction and Terraforming Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka)
 *
 * Copyright ©️ 2018-2020 Galt•Core Blockchain Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka) by
 * [Basic Agreement](ipfs/QmaCiXUmSrP16Gz8Jdzq6AJESY1EAANmmwha15uR3c1bsS)).
 */

export default {
  template: require('./StorageSpacePage.template'),
  components: {},
  props: [],
  async created() {
    await this.refreshStorageSpace();
  },
  methods: {
    async refreshStorageSpace() {
      this.loading = true;
      this.errorMessage = null;

      try {
        const listParams = getListParams(this.pageLimit);
        const results = await Promise.all([
          this.$geesome.adminGetStorageSpaceOverview(),
          this.$geesome.adminGetStorageSpaceTypeBreakdown(listParams),
          this.$geesome.adminGetStorageSpaceTopContents(listParams),
          this.$geesome.adminGetStorageSpaceTopFileCatalogItems(listParams),
          this.$geesome.adminGetStorageSpaceTopGroups(listParams),
          this.$geesome.adminGetStorageSpaceAvailabilitySignals(listParams),
          this.$geesome.adminGetStorageSpaceAvailabilityNetworkSamples(listParams)
        ]);

        this.overview = results[0] || {};
        this.typeBreakdown = results[1] || [];
        this.topContents = results[2] || [];
        this.topFileCatalogItems = results[3] || [];
        this.topGroups = results[4] || [];
        this.availabilitySignals = results[5] || [];
        this.availabilitySampleRows = results[6] || [];
      } catch (e) {
        this.errorMessage = getErrorMessage(e);
      }

      this.loading = false;
    },
    async inspectAvailabilitySignals(storageId = null) {
      this.inspectingAvailability = true;
      this.availabilityErrorMessage = null;

      try {
        const listParams = getAvailabilityInspectionParams(this.pageLimit, storageId);
        const result = await this.$geesome.adminRefreshStorageSpaceAvailabilityNetworkSamples(listParams);
        const rows = getAvailabilitySampleRows(result);
        this.mergeAvailabilityInspectionRows(rows || []);
        this.mergeAvailabilitySampleRows(rows || []);
      } catch (e) {
        this.availabilityErrorMessage = getErrorMessage(e);
      }

      this.inspectingAvailability = false;
    },
    mergeAvailabilityInspectionRows(rows) {
      this.availabilityInspectionRows = mergeAvailabilityRowsByStorageId(this.availabilityInspectionRows, rows);
    },
    mergeAvailabilitySampleRows(rows) {
      this.availabilitySampleRows = mergeAvailabilityRowsByStorageId(this.availabilitySampleRows, rows);
    },
    setActiveTable(tabName) {
      this.activeTable = tabName;
    },
    getContentName(item) {
      return getName(item && item.name, `Content #${item && item.id}`);
    },
    getCatalogName(item) {
      return getName(item && item.name, `Catalog item #${item && item.id}`);
    },
    getGroupName(item) {
      return getName(item && (item.title || item.name), `Group #${item && item.id}`);
    },
    getTypeLabel(item) {
      const typeParts = [item && item.mimeType, item && item.extension].filter(Boolean);
      return typeParts.length ? typeParts.join(' / ') : 'unknown';
    },
    getUsageWidth(value, total) {
      return `${getUsagePercent(value, total)}%`;
    },
    getPercentText(value, total) {
      return `${getUsagePercent(value, total)}%`;
    },
    getLogicalTotal() {
      return readNumber(this.overview && this.overview.logicalContentBytes);
    },
    getRowsText(value) {
      return getCountText(value, 'row');
    },
    getStorageObjectsText(value) {
      return getCountText(value, 'object');
    },
    getAvailabilityRefsText(item) {
      const refs = readNumber(item && item.contentRowsCount)
        + readNumber(item && item.activeFileCatalogRefsCount)
        + readNumber(item && item.groupPostRefsCount)
        + readNumber(item && item.generatedOutputRefsCount);
      return getCountText(refs, 'ref');
    },
    getAvailabilityPinsText(item) {
      const localPins = readNumber(item && item.localPinRefsCount);
      const remotePins = readNumber(item && item.remotePinsCount);
      return `${localPins.toLocaleString()} local / ${remotePins.toLocaleString()} remote`;
    },
    getProviderCountText(row) {
      const count = readNumber(row && row.providersCount);
      const suffix = count === 1 ? 'provider' : 'providers';
      const truncated = row && row.providersTruncated ? '+' : '';
      return `${count.toLocaleString()}${truncated} ${suffix}`;
    },
    getProviderSampleText(row) {
      const providers = row && Array.isArray(row.providers) ? row.providers : [];
      const sample = providers
        .map(provider => provider && provider.id)
        .filter(Boolean)
        .slice(0, 2);
      return sample.length ? sample.join(', ') : '';
    },
    getRetrievalText(row) {
      if (!row) {
        return '-';
      }
      if (!row.retrievalStatOk) {
        return row.retrievalErrorMessage || 'stat failed';
      }
      return row.retrievalType || 'ok';
    },
    getSampledAtText(row) {
      if (!row) {
        return '-';
      }
      if (!row.sampledAt) {
        return 'Live';
      }
      return formatUtcDateTime(row.sampledAt);
    }
  },
  watch: {
    pageLimit() {
      this.refreshStorageSpace();
    }
  },
  computed: {
    overviewReady() {
      return !!this.overview && Object.keys(this.overview).length > 0;
    },
    duplicateRowsText() {
      const duplicates = readNumber(this.overview && this.overview.duplicateContentRowsCount);
      const storageIds = readNumber(this.overview && this.overview.duplicateStorageIdsCount);
      return `${duplicates.toLocaleString()} rows / ${storageIds.toLocaleString()} storage IDs`;
    },
    physicalSavingsBytes() {
      return Math.max(0, readNumber(this.overview && this.overview.logicalContentBytes) - readNumber(this.overview && this.overview.physicalContentBytes));
    },
    availabilityNetworkRowsByStorageId() {
      const rowsByStorageId = {};
      this.availabilitySampleRows.forEach((row) => {
        rowsByStorageId[row.storageId] = row;
      });
      this.availabilityInspectionRows.forEach((row) => {
        rowsByStorageId[row.storageId] = row;
      });
      return rowsByStorageId;
    }
  },
  data() {
    return {
      localeKey: 'storage_space_page',
      overview: {},
      typeBreakdown: [],
      topContents: [],
      topFileCatalogItems: [],
      topGroups: [],
      availabilitySignals: [],
      availabilitySampleRows: [],
      availabilityInspectionRows: [],
      activeTable: 'contents',
      pageLimit: 20,
      loading: false,
      inspectingAvailability: false,
      availabilityErrorMessage: null,
      errorMessage: null
    };
  }
}

function getListParams(limit) {
  return {
    limit,
    offset: 0
  };
}

function getAvailabilityInspectionParams(limit, storageId = null) {
  const params: any = {
    limit: storageId ? 1 : limit,
    offset: 0,
    providerLimit: 10,
    providerAddressLimit: 2,
    providerTimeoutMs: 5000,
    statTimeoutMs: 5000,
    statWithLocal: false
  };

  if (storageId) {
    params.storageId = storageId;
  }

  return params;
}

function getAvailabilitySampleRows(result) {
  if (Array.isArray(result)) {
    return result;
  }
  if (result && Array.isArray(result.rows)) {
    return result.rows;
  }
  return [];
}

function mergeAvailabilityRowsByStorageId(existingRows, nextRows) {
  const rowsByStorageId = {};
  (existingRows || []).forEach((row) => {
    rowsByStorageId[row.storageId] = row;
  });
  (nextRows || []).forEach((row) => {
    rowsByStorageId[row.storageId] = row;
  });
  return Object.keys(rowsByStorageId).map((storageId) => rowsByStorageId[storageId]);
}

function getName(value, fallback) {
  if (value) {
    return value;
  }

  return fallback;
}

function readNumber(value) {
  const result = Number(value || 0);
  if (Number.isFinite(result)) {
    return result;
  }

  return 0;
}

function getUsagePercent(value, total) {
  const numericTotal = readNumber(total);
  if (!numericTotal) {
    return 0;
  }

  return Math.min(100, Math.round(readNumber(value) / numericTotal * 100));
}

function getCountText(value, label) {
  const count = readNumber(value);
  const suffix = count === 1 ? label : `${label}s`;
  return `${count.toLocaleString()} ${suffix}`;
}

function formatUtcDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return [
    `${date.getUTCFullYear()}-${padDatePart(date.getUTCMonth() + 1)}-${padDatePart(date.getUTCDate())}`,
    `${padDatePart(date.getUTCHours())}:${padDatePart(date.getUTCMinutes())} UTC`
  ].join(' ');
}

function padDatePart(value) {
  return String(value).padStart(2, '0');
}

function getErrorMessage(error) {
  if (error && error.message) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }

  return 'Could not load storage space data';
}
