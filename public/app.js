const el = (id) => document.getElementById(id);

function renderStats(data) {
  el("mode-badge").textContent = data.mode || "dev";
  el("total-requests").textContent = data.totalRequests ?? 0;
  el("errors-502").textContent = data.errors502 ?? 0;
  el("errors-503").textContent = data.errors503 ?? 0;
  el("last-updated").textContent = new Date().toLocaleTimeString();

  const disabledSet = new Set(data.disabledPorts || []);
  const upstreams = data.upstreams || [];

  el("upstreams-grid").innerHTML = upstreams
    .map((u) => {
      const isKilled = disabledSet.has(u.port);
      const isUp = u.status === "UP" && !isKilled;
      const label = isKilled ? `Restore :${u.port}` : `Kill :${u.port}`;
      return `
        <div class="card">
          <div class="upstream-top">
            <span class="upstream-port">:${u.port}</span>
            <span class="status-txt ${isUp ? "text-ok" : "text-err"}">${isUp ? "UP" : "DOWN"}</span>
          </div>
          <div class="muted-sm">Hits: ${u.hits ?? 0}</div>
          <button class="btn-asym-mirror toggle-port-btn" type="button" data-port="${u.port}">${label}</button>
        </div>
      `;
    })
    .join("");

  const recent = data.recent || [];
  el("requests-body").innerHTML = recent
    .map((r) => {
      const ok = r.status >= 200 && r.status < 300;
      return `
        <tr>
          <td>${r.time}</td>
          <td>${r.method}</td>
          <td>${r.path}</td>
          <td>${r.port ? `:${r.port}` : "-"}</td>
          <td class="${ok ? "text-ok" : "text-err"}">${r.status}</td>
          <td>${r.durationMs}ms</td>
        </tr>
      `;
    })
    .join("");
}

async function loadStats() {
  const res = await fetch("/api/stats", { cache: "no-store" });
  if (!res.ok) return;
  const data = await res.json();
  renderStats(data);
}

async function sendTraffic(count) {
  const jobs = Array.from({ length: count }, () =>
    fetch("/", { cache: "no-store" }).catch(() => null)
  );
  await Promise.all(jobs);
  await loadStats();
}

el("upstreams-grid").addEventListener("click", async (event) => {
  const btn = event.target.closest(".toggle-port-btn");
  if (!btn) return;
  const targetPort = btn.getAttribute("data-port");
  if (!targetPort) return;
  btn.disabled = true;
  try {
    await fetch(`/api/upstreams/${targetPort}/toggle`, { method: "POST" });
    await loadStats();
  } finally {
    btn.disabled = false;
  }
});

el("send-one-btn")?.addEventListener("click", () => sendTraffic(1));
el("send-burst-btn")?.addEventListener("click", () => sendTraffic(6));
el("refresh-btn")?.addEventListener("click", loadStats);

loadStats();
setInterval(loadStats, 1500);