const el = (id) => document.getElementById(id);

function renderStats(data) {
  el("total-requests").textContent = data.totalRequests ?? 0;
  el("errors-502").textContent = data.errors502 ?? 0;
  el("errors-503").textContent = data.errors503 ?? 0;
  el("mode-badge").textContent = data.mode ?? "development";
  el("last-updated").textContent = new Date().toLocaleTimeString();

  const upstreams = data.upstreams || [];
  const grid = el("upstreams-grid");
  if (upstreams.length === 0) {
    grid.innerHTML = `<div class="card"><span class="label">No upstream stats</span></div>`;
  } else {
    grid.innerHTML = upstreams
      .map((u) => {
        const healthy = u.status !== "DOWN";
        return `
          <article class="card">
            <div class="upstream-top">
              <span class="upstream-port">:${u.port}</span>
              <span class="status-txt ${healthy ? "text-ok" : "text-err"}">${u.status || "UP"}</span>
            </div>
            <p class="label" style="margin-top:0.5rem">Hits: <span class="mono">${u.hits ?? 0}</span></p>
          </article>
        `;
      })
      .join("");
  }

  const recent = data.recent || [];
  const tbody = el("requests-body");
  if (recent.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">No requests recorded yet</td></tr>`;
    return;
  }

  tbody.innerHTML = recent
    .map((r) => {
      const isOk = r.status >= 200 && r.status < 400;
      return `
        <tr>
          <td class="mono">${r.time || "-"}</td>
          <td class="mono">${r.method || "GET"}</td>
          <td class="mono">${r.path || "/"}</td>
          <td class="mono">${r.port ? `:${r.port}` : "-"}</td>
          <td class="mono ${isOk ? "text-ok" : "text-err"}">${r.status ?? "-"}</td>
          <td class="mono">${r.durationMs != null ? `${r.durationMs}ms` : "-"}</td>
        </tr>
      `;
    })
    .join("");
}

async function loadStats() {
  try {
    const res = await fetch("/api/stats", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    renderStats(data);
  } catch {
    // Keep last rendered state if a poll fails
  }
}

async function sendTraffic(count) {
  const jobs = Array.from({ length: count }, () =>
    fetch("/", { cache: "no-store" }).catch(() => null)
  );
  await Promise.all(jobs);
  await loadStats();
}

el("send-one-btn").addEventListener("click", () => sendTraffic(1));
el("send-burst-btn").addEventListener("click", () => sendTraffic(6));
el("refresh-btn").addEventListener("click", loadStats);
loadStats();
setInterval(loadStats, 1500);