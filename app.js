const STORAGE_KEYS = {
  reports: "netaid.reports.v1",
  contacts: "netaid.contacts.v1",
};

const syncEndpoint = document.querySelector('meta[name="netaid-sync-endpoint"]')?.content?.trim();
const reportForm = document.querySelector("#incident-form");
const contactForm = document.querySelector("#contact-form");
const feedback = document.querySelector("#form-feedback");
const reportList = document.querySelector("#report-list");
const contactList = document.querySelector("#contact-list");
const savedCount = document.querySelector("#saved-count");
const connectivityMessage = document.querySelector("#connectivity-message");
let reports = readStoredArray(STORAGE_KEYS.reports);
let contacts = readStoredArray(STORAGE_KEYS.contacts);
let syncInProgress = false;

function readStoredArray(key) {
  try {
    const stored = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

function persist(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function setConnectivityMessage() {
  if (!navigator.onLine) {
    connectivityMessage.textContent = "You’re offline. NetAid is available and new reports will be saved on this device.";
  } else if (syncEndpoint) {
    connectivityMessage.textContent = "You’re online. Saved reports will sync automatically when the configured service is reachable.";
  } else {
    connectivityMessage.textContent = "You’re online. Reports are saved locally; cloud sync is not configured for this demo.";
  }
}

function renderReports() {
  savedCount.textContent = String(reports.length);
  if (!reports.length) {
    reportList.innerHTML = '<div class="empty-state">No reports saved yet.<br>Reports you create will appear here on this device.</div>';
    return;
  }

  reportList.replaceChildren(...reports.map((report) => {
    const item = document.createElement("article");
    item.className = "report-item";
    const priority = document.createElement("span");
    priority.className = `report-priority ${report.priority}`;
    priority.setAttribute("aria-hidden", "true");
    const content = document.createElement("div");
    content.className = "report-summary";
    const title = document.createElement("strong");
    title.textContent = report.type;
    const details = document.createElement("p");
    details.textContent = `${report.location}${report.details ? ` · ${report.details}` : ""}`;
    const date = document.createElement("small");
    date.textContent = new Date(report.createdAt).toLocaleString();
    content.append(title, details, date);
    const status = document.createElement("span");
    status.className = "report-status";
    status.textContent = report.status === "synced" ? "Synced" : "On device";
    item.append(priority, content, status);
    return item;
  }));
}

function renderContacts() {
  if (!contacts.length) {
    contactList.innerHTML = '<li class="empty-state">Your contact list is empty.<br>Add trusted people or verified local services.</li>';
    return;
  }

  contactList.replaceChildren(...contacts.map((contact) => {
    const item = document.createElement("li");
    item.className = "contact-item";
    const avatar = document.createElement("span");
    avatar.className = "contact-avatar";
    avatar.textContent = contact.name.trim().charAt(0).toUpperCase();
    avatar.setAttribute("aria-hidden", "true");
    const details = document.createElement("div");
    details.className = "contact-details";
    const name = document.createElement("strong");
    name.textContent = contact.name;
    const phone = document.createElement("a");
    phone.href = `tel:${contact.phone.replace(/[^\d+*#]/g, "")}`;
    phone.textContent = contact.phone;
    details.append(name, phone);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove-contact";
    remove.textContent = "Remove";
    remove.setAttribute("aria-label", `Remove ${contact.name}`);
    remove.addEventListener("click", () => {
      contacts = contacts.filter((entry) => entry.id !== contact.id);
      if (!persist(STORAGE_KEYS.contacts, contacts)) {
        contacts.push(contact);
        window.alert("Could not save this change. Check available storage on your device.");
        return;
      }
      renderContacts();
    });
    item.append(avatar, details, remove);
    return item;
  }));
}

async function syncPendingReports() {
  if (!syncEndpoint || !navigator.onLine || syncInProgress) return;
  const pending = reports.filter((report) => report.status !== "synced");
  if (!pending.length) return;
  syncInProgress = true;

  try {
    for (const report of pending) {
      const response = await fetch(syncEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report),
      });
      if (!response.ok) throw new Error(`Sync service returned ${response.status}`);
      report.status = "synced";
      if (!persist(STORAGE_KEYS.reports, reports)) throw new Error("Could not save the sync status locally");
    }
    renderReports();
    setConnectivityMessage();
  } catch (error) {
    connectivityMessage.textContent = `Reports remain saved on this device. Sync could not complete: ${error.message}`;
  } finally {
    syncInProgress = false;
  }
}

reportForm.addEventListener("submit", (event) => {
  event.preventDefault();
  feedback.textContent = "";
  const data = new FormData(reportForm);
  const report = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type: String(data.get("type") || ""),
    priority: String(data.get("priority") || "normal"),
    location: String(data.get("location") || "").trim(),
    details: String(data.get("details") || "").trim(),
    createdAt: new Date().toISOString(),
    status: "pending",
  };
  if (!report.type || !report.location) {
    feedback.textContent = "Choose an incident type and add a location.";
    return;
  }
  reports.unshift(report);
  if (!persist(STORAGE_KEYS.reports, reports)) {
    reports.shift();
    feedback.textContent = "This report could not be saved. Check available storage on your device.";
    return;
  }
  reportForm.reset();
  document.querySelector("#incident-priority").value = "normal";
  feedback.textContent = "Report saved on this device.";
  renderReports();
  syncPendingReports();
});

contactForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(contactForm);
  const contact = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: String(data.get("name") || "").trim(),
    phone: String(data.get("phone") || "").trim(),
  };
  if (!contact.name || !contact.phone) return;
  contacts.push(contact);
  if (!persist(STORAGE_KEYS.contacts, contacts)) {
    contacts.pop();
    window.alert("This contact could not be saved. Check available storage on your device.");
    return;
  }
  contactForm.reset();
  renderContacts();
});

document.querySelectorAll(".app-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".app-tab").forEach((button) => {
      const active = button === tab;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });
    document.querySelectorAll(".tab-panel").forEach((panel) => {
      panel.hidden = panel.id !== `panel-${tab.dataset.panel}`;
    });
  });
});

document.querySelector("#clear-reports").addEventListener("click", () => {
  if (!reports.length || !window.confirm("Remove all reports saved on this device?")) return;
  const previousReports = reports;
  reports = [];
  if (!persist(STORAGE_KEYS.reports, reports)) {
    reports = previousReports;
    window.alert("Could not clear reports. Check available storage on your device.");
    return;
  }
  renderReports();
});

window.addEventListener("online", () => {
  setConnectivityMessage();
  syncPendingReports();
});
window.addEventListener("offline", setConnectivityMessage);
window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEYS.reports) {
    reports = readStoredArray(STORAGE_KEYS.reports);
    renderReports();
  }
  if (event.key === STORAGE_KEYS.contacts) {
    contacts = readStoredArray(STORAGE_KEYS.contacts);
    renderContacts();
  }
});

document.querySelector("#year").textContent = String(new Date().getFullYear());
renderReports();
renderContacts();
setConnectivityMessage();
syncPendingReports();

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("NetAid could not register offline support:", error);
    });
  });
}
