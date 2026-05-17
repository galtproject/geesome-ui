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
          this.$geesome.adminGetStorageSpaceTopGroups(listParams)
        ]);

        this.overview = results[0] || {};
        this.typeBreakdown = results[1] || [];
        this.topContents = results[2] || [];
        this.topFileCatalogItems = results[3] || [];
        this.topGroups = results[4] || [];
      } catch (e) {
        this.errorMessage = getErrorMessage(e);
      }

      this.loading = false;
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
      activeTable: 'contents',
      pageLimit: 20,
      loading: false,
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

function getErrorMessage(error) {
  if (error && error.message) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }

  return 'Could not load storage space data';
}
