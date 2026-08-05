const TOKEN_KEY = "psychevidhya-admin-token";
const ADMIN_KEY = "psychevidhya-admin-info";

const getToken = () => localStorage.getItem(TOKEN_KEY);
const setSession = (token, admin) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ADMIN_KEY, JSON.stringify(admin || {}));
};
const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ADMIN_KEY);
};

async function apiFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (res.status === 401) {
    clearSession();
    window.location.href = "login.html";
    throw new Error("Not authenticated");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

// ---------- Login page ----------
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  const statusMsg = document.getElementById("statusMsg");
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const submitBtn = loginForm.querySelector("button[type=submit]");

    statusMsg.textContent = "";
    submitBtn.disabled = true;
    submitBtn.textContent = "Signing in…";

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        statusMsg.textContent = data.error || "Sign in failed.";
        return;
      }

      setSession(data.token, data.admin);
      window.location.href = "dashboard.html";
    } catch {
      statusMsg.textContent = "Network error — please try again.";
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Sign in";
    }
  });
}

// ---------- Dashboard page ----------
const bookingsContent = document.getElementById("bookingsContent");
if (bookingsContent) {
  if (!getToken()) {
    window.location.href = "login.html";
  } else {
    const adminInfo = JSON.parse(localStorage.getItem(ADMIN_KEY) || "{}");
    const whoAmI = document.getElementById("whoAmI");
    if (whoAmI) whoAmI.textContent = adminInfo.name || adminInfo.email || "";

    document.getElementById("logoutBtn").addEventListener("click", () => {
      clearSession();
      window.location.href = "login.html";
    });

    const tabBookingsBtn = document.getElementById("tabBookingsBtn");
    const tabMessagesBtn = document.getElementById("tabMessagesBtn");
    const bookingsPanel = document.getElementById("bookingsPanel");
    const messagesPanel = document.getElementById("messagesPanel");

    const showTab = (tab) => {
      const isBookings = tab === "bookings";
      bookingsPanel.classList.toggle("active", isBookings);
      messagesPanel.classList.toggle("active", !isBookings);
      tabBookingsBtn.classList.toggle("active", isBookings);
      tabMessagesBtn.classList.toggle("active", !isBookings);
      tabBookingsBtn.setAttribute("aria-selected", String(isBookings));
      tabMessagesBtn.setAttribute("aria-selected", String(!isBookings));
    };
    tabBookingsBtn.addEventListener("click", () => showTab("bookings"));
    tabMessagesBtn.addEventListener("click", () => showTab("messages"));

    const fmtDate = (iso) => new Date(iso).toLocaleString();
    const esc = (s = "") =>
      String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

    const STATUSES = ["pending", "confirmed", "completed", "cancelled"];

    async function loadBookings() {
      bookingsContent.innerHTML = '<div class="loading-state">Loading…</div>';
      try {
        const { bookings } = await apiFetch("/api/bookings");
        if (!bookings.length) {
          bookingsContent.innerHTML = '<div class="empty-state">No session requests yet. New bookings from the website will show up here.</div>';
          return;
        }

        const rows = bookings
          .map(
            (b) => `
          <tr data-id="${b._id}">
            <td>${fmtDate(b.createdAt)}</td>
            <td>${esc(b.name)}<br><span style="opacity:.65">${esc(b.email)}${b.phone ? " · " + esc(b.phone) : ""}</span></td>
            <td>${esc(b.service)}</td>
            <td>${esc(b.preferredDate || "—")} ${esc(b.preferredTime || "")}</td>
            <td>${esc(b.message || "—")}</td>
            <td>
              <span class="badge badge-${b.status}">${b.status}</span><br>
              <select class="status-select" data-id="${b._id}">
                ${STATUSES.map((s) => `<option value="${s}" ${s === b.status ? "selected" : ""}>${s}</option>`).join("")}
              </select>
              <button class="icon-btn" data-delete="${b._id}">Delete</button>
            </td>
          </tr>`
          )
          .join("");

        bookingsContent.innerHTML = `
          <table>
            <thead><tr><th>Received</th><th>Client</th><th>Service</th><th>Preferred</th><th>Message</th><th>Status</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>`;

        bookingsContent.querySelectorAll(".status-select").forEach((sel) => {
          sel.addEventListener("change", async () => {
            sel.disabled = true;
            try {
              await apiFetch(`/api/bookings/${sel.dataset.id}`, {
                method: "PATCH",
                body: JSON.stringify({ status: sel.value }),
              });
              loadBookings();
            } catch (err) {
              alert(err.message);
              sel.disabled = false;
            }
          });
        });

        bookingsContent.querySelectorAll("[data-delete]").forEach((btn) => {
          btn.addEventListener("click", async () => {
            if (!confirm("Delete this booking request permanently?")) return;
            try {
              await apiFetch(`/api/bookings/${btn.dataset.delete}`, { method: "DELETE" });
              loadBookings();
            } catch (err) {
              alert(err.message);
            }
          });
        });
      } catch (err) {
        bookingsContent.innerHTML = `<div class="empty-state">Couldn't load session requests: ${esc(err.message)}</div>`;
      }
    }

    async function loadMessages() {
      const messagesContent = document.getElementById("messagesContent");
      messagesContent.innerHTML = '<div class="loading-state">Loading…</div>';
      try {
        const { messages } = await apiFetch("/api/contact");
        if (!messages.length) {
          messagesContent.innerHTML = '<div class="empty-state">No messages yet.</div>';
          return;
        }

        const rows = messages
          .map(
            (m) => `
          <tr data-id="${m._id}">
            <td>${fmtDate(m.createdAt)}</td>
            <td>${m.read ? "" : '<span class="unread-dot" title="Unread"></span>'}${esc(m.name)}<br><span style="opacity:.65">${esc(m.email)}</span></td>
            <td>${m.type === "screener-share" ? `Check-in shared (score ${m.screenerScore ?? "—"}/27)` : "Contact"}</td>
            <td>${esc(m.message)}</td>
            <td>${m.read ? "" : `<button class="icon-btn" data-read="${m._id}">Mark read</button>`}</td>
          </tr>`
          )
          .join("");

        messagesContent.innerHTML = `
          <table>
            <thead><tr><th>Received</th><th>From</th><th>Type</th><th>Message</th><th></th></tr></thead>
            <tbody>${rows}</tbody>
          </table>`;

        messagesContent.querySelectorAll("[data-read]").forEach((btn) => {
          btn.addEventListener("click", async () => {
            try {
              await apiFetch(`/api/contact/${btn.dataset.read}/read`, { method: "PATCH" });
              loadMessages();
            } catch (err) {
              alert(err.message);
            }
          });
        });
      } catch (err) {
        document.getElementById("messagesContent").innerHTML = `<div class="empty-state">Couldn't load messages: ${esc(err.message)}</div>`;
      }
    }

    loadBookings();
    loadMessages();
  }
}
