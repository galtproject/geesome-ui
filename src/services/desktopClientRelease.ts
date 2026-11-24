// Public release discovery intentionally bypasses the authenticated service client.
export async function discoverDesktopClient(nodeUrl, fetchImpl = fetch) {
  const root = new URL(nodeUrl);
  const publicUrl = value => {
    const url = new URL(value);
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (url.origin !== root.origin || url.username || url.password || url.search || url.hash ||
        (url.protocol !== 'https:' && !(loopback && url.protocol === 'http:'))) {
      throw new Error('The node returned an unsafe client download address.');
    }
    return url.href.replace(/\/$/, '');
  };
  publicUrl(root.href);
  const read = async url => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetchImpl(url, {credentials: 'omit', redirect: 'error', signal: controller.signal});
      if (response.status === 404) { return null; }
      if (!response.ok) { throw new Error('Client download information is unavailable. Try again later.'); }
      if (Number(response.headers.get('content-length')) > 65536 || !response.body) { throw new Error('Invalid release information.'); }
      const reader = response.body.getReader(), chunks = [];
      let size = 0;
      try {
        while (true) {
          const {done, value} = await reader.read();
          if (done) { break; }
          size += value.length;
          if (size > 65536) { throw new Error('Invalid release information.'); }
          chunks.push(value);
        }
      } finally { await reader.cancel(); }
      const bytes = new Uint8Array(size); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      return JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes));
    } finally { clearTimeout(timer); }
  };
  let discovery = await read(new URL('/.well-known/geesome', root).href);
  if (!discovery) { discovery = await read(new URL('/api/.well-known/geesome', root).href); }
  const capability = discovery && discovery.capabilities && discovery.capabilities.clientReleases;
  if (!capability) { return {status: 'unsupported'}; }
  if (capability.schemaVersion !== 1 || !Array.isArray(capability.platforms) || !capability.platforms.includes('windows-x64')) {
    throw new Error('This node does not advertise a supported Windows client release.');
  }
  const api = publicUrl(discovery.apiBaseUrl), gateway = publicUrl(discovery.gatewayBaseUrl);
  const guideUrl = publicUrl(capability.installGuideUrl), stableUrl = publicUrl(capability.stableUrl);
  if (guideUrl !== api + '/client-releases/install' || stableUrl !== api + '/client-releases/stable/windows-x64') {
    throw new Error('Client download links do not match this node’s API.');
  }
  const envelope = await read(stableUrl);
  if (!envelope) { return {status: 'unpublished', guideUrl}; }
  const base64 = value => {
    if (typeof value !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) { throw new Error('Invalid release metadata.'); }
    const decoded = atob(value);
    if (btoa(decoded) !== value) { throw new Error('Invalid release metadata.'); }
    return decoded;
  };
  if (base64(envelope.signature).length !== 64) { throw new Error('Invalid release signature format.'); }
  const bytes = Uint8Array.from(base64(envelope.manifest), value => value.charCodeAt(0));
  const manifest = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes));
  if (!manifest || Object.keys(manifest).sort().join(',') !== 'cid,platform,schemaVersion,sha256,size,version' ||
      manifest.schemaVersion !== 1 || manifest.platform !== 'windows-x64' ||
      typeof manifest.version !== 'string' || typeof manifest.cid !== 'string' || typeof manifest.sha256 !== 'string' ||
      !/^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/.test(manifest.version) ||
      !/^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{20,120})$/.test(manifest.cid) ||
      !/^[a-f0-9]{64}$/.test(manifest.sha256) || !Number.isSafeInteger(manifest.size) || manifest.size < 1 || manifest.size > 536870912) {
    throw new Error('Invalid Windows release metadata.');
  }
  return {status: 'available', guideUrl, manifest, installerUrl: `${gateway}/ipfs/${manifest.cid}`};
}
