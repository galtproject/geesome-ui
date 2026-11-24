module.exports = `
<section class="desktop-client-page" data-testid="desktop-client-page">
  <h1>Download desktop client</h1>
  <p class="intro">Install GeeSome Client on your Windows PC to publish through your connected social accounts and keep the local client running after login.</p>
  <p>This is a Windows EXE application with a local browser interface at <code>http://localhost:7347</code>. Installing this website as a Firefox web app or PWA does not install the local client.</p>
  <p v-if="loading" role="status">Checking Windows downloads…</p>
  <p v-if="error" role="alert" data-testid="desktop-client-error">{{error}}</p>
  <p v-if="release && release.status === 'unsupported'" data-testid="desktop-client-unavailable">This node does not provide desktop client downloads. Ask its owner to enable client releases.</p>
  <p v-if="release && release.status === 'unpublished'" data-testid="desktop-client-unpublished">This node supports desktop downloads, but no Windows installer has been published yet.</p>
  <template v-if="release && release.status === 'available'">
    <h2>Windows x64 · Version {{release.manifest.version}}</h2>
    <p>For Windows 10 or later on Intel/AMD x64 PCs. Installs for the current user without administrator access.</p>
    <a class="desktop-client-download" data-testid="desktop-client-download" :href="release.installerUrl" :download="'GeeSomeClient-' + release.manifest.version + '-windows-x64-Setup.exe'">Download Windows x64 installer (.exe)</a>
    <p>Save the EXE, verify it using the installation guide, then run it. A download or website shortcut alone is not an installation.</p>
    <details><summary>Download checksum</summary><p>Size: {{release.manifest.size.toLocaleString()}} bytes</p><p>SHA-256: <code class="desktop-client-hash">{{release.manifest.sha256}}</code></p><p>Release information comes from this node. Follow the guide to verify the complete file and establish publisher trust before running it.</p></details>
  </template>
  <div v-if="release && release.guideUrl" class="desktop-client-actions">
    <a data-testid="desktop-client-guide" :href="release.guideUrl">Read installation guide</a>
    <button type="button" data-testid="desktop-client-copy" @click="copyInstructions">Copy instructions for your agent</button>
  </div>
  <p v-if="copyMessage" role="status">{{copyMessage}}</p>
  <label v-if="setupText">Installation instructions<textarea data-testid="desktop-client-instructions" :value="setupText" readonly rows="8"></textarea></label>
  <button v-if="error || (release && release.status !== 'available')" type="button" :disabled="loading" @click="load">Check again</button>
  <h2>After installation</h2>
  <ol><li>Open GeeSome Client from the Start menu. Its browser page uses <code>localhost:7347</code>.</li><li>Connect your own GeeSome node and social accounts in Settings.</li><li>Create posts and manage schedules, queue, history and statistics. The PC must stay awake to send scheduled posts.</li><li>To connect a local AI agent, open Settings → AI agent. The client generates a separate local access key.</li></ol>
</section>
`;
