import {discoverDesktopClient} from '../../services/desktopClientRelease';

export default {
  template: require('./DesktopClientPage.template'),
  data() { return {release: null, loading: false, error: '', copyMessage: '', setupText: '', generation: 0}; },
  computed: {
    nodeUrl() { return this.$store.state.serverAddress || window.location.origin; },
    agentPrompt() {
      if (!this.release || !this.release.guideUrl) { return ''; }
      return `Install the native Windows x64 GeeSome Client from ${this.release.guideUrl}. Read that guide and follow its release discovery, complete-file verification and EXE installation steps. Do not install the remote website as a Firefox web app, PWA or browser shortcut. Verify http://localhost:7347/api/health reports product geesome-client and the installed release version, the local Posting page opens, the per-user login task exists, and GeeSome Client appears in Windows Installed Apps. Report each failed or unavailable check; opening the remote website is not successful installation. Preserve existing user data and never force-kill active publications. After installation, explain Settings and the optional AI agent connection block. Do not enable access or request social credentials unless the user asks.`;
    }
  },
  created() { this.load(); },
  beforeDestroy() { this.generation++; },
  watch: {nodeUrl() { this.load(); }},
  methods: {
    async load() {
      const generation = ++this.generation;
      this.loading = true; this.error = ''; this.release = null; this.setupText = ''; this.copyMessage = '';
      try {
        const release = await discoverDesktopClient(this.nodeUrl);
        if (generation === this.generation) { this.release = release; }
      } catch (_) {
        if (generation === this.generation) { this.error = 'Could not load a valid desktop release from this node. Check the connection or ask the node owner to enable client downloads.'; }
      } finally { if (generation === this.generation) { this.loading = false; } }
    },
    async copyInstructions() {
      this.copyMessage = ''; this.setupText = '';
      try { await navigator.clipboard.writeText(this.agentPrompt); this.copyMessage = 'Installation instructions copied.'; }
      catch (_) { this.setupText = this.agentPrompt; this.copyMessage = 'Copy the instructions below and give them to your desktop agent.'; }
    }
  }
};
