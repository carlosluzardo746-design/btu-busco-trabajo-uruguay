const categories = [
  "Todas",
  "Administracion",
  "Gastronomia",
  "Ventas",
  "Logistica",
  "Limpieza",
  "Salud",
  "Construccion",
  "Tecnologia",
  "Otras"
];

const fallbackImage =
  "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80";

const state = {
  search: "",
  category: "Todas",
  jobs: [],
  adminLogged: false,
  csrfToken: "",
  adminUser: ""
};

const els = {
  navToggle: document.querySelector("#navToggle"),
  mainNav: document.querySelector("#mainNav"),
  searchInput: document.querySelector("#searchInput"),
  clearSearch: document.querySelector("#clearSearch"),
  categoryList: document.querySelector("#categoryList"),
  adminCategory: document.querySelector("#adminCategory"),
  adminJobList: document.querySelector("#adminJobList"),
  adminRequestList: document.querySelector("#adminRequestList"),
  subscriberList: document.querySelector("#subscriberList"),
  exportSubscribers: document.querySelector("#exportSubscribers"),
  jobFeed: document.querySelector("#jobFeed"),
  emptyState: document.querySelector("#emptyState"),
  resultCount: document.querySelector("#resultCount"),
  jobsCount: document.querySelector("#jobsCount"),
  siteVisitsCount: document.querySelector("#siteVisitsCount"),
  jobDetail: document.querySelector("#jobDetail"),
  adminModal: document.querySelector("#adminModal"),
  adminLoginForm: document.querySelector("#adminLoginForm"),
  adminLoginStatus: document.querySelector("#adminLoginStatus"),
  passwordForm: document.querySelector("#passwordForm"),
  passwordStatus: document.querySelector("#passwordStatus"),
  usernameForm: document.querySelector("#usernameForm"),
  usernameStatus: document.querySelector("#usernameStatus"),
  adminForm: document.querySelector("#adminForm"),
  auditLogList: document.querySelector("#auditLogList"),
  adminImage: document.querySelector("#adminImage"),
  adminImagePreview: document.querySelector("#adminImagePreview"),
  imageFileName: document.querySelector("#imageFileName"),
  companyImage: document.querySelector("#companyImage"),
  companyImagePreview: document.querySelector("#companyImagePreview"),
  companyImageFileName: document.querySelector("#companyImageFileName")
};

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function api(action, options = {}) {
  const method = options.method || "GET";
  const params = new URLSearchParams({ action, ...(options.params || {}) });
  const response = await fetch(`api.php?${params.toString()}`, {
    method,
    body: options.body,
    credentials: "same-origin"
  });
  const raw = await response.text();
  let data;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error("El servidor respondio con un formato inesperado. Recarga la pagina e intenta de nuevo.");
  }
  if (!response.ok || !data.ok) {
    throw new Error(data.error || "No se pudo completar la accion.");
  }
  return data;
}

function setFormBusy(form, isBusy) {
  const controls = form.querySelectorAll("button, input, select, textarea");
  controls.forEach((control) => {
    control.disabled = isBusy;
  });
}

function applyAdminSession(data) {
  state.csrfToken = data.csrf_token || state.csrfToken;
  state.adminUser = data.admin_user || state.adminUser;
  if (state.adminUser && els.usernameForm) {
    const input = els.usernameForm.querySelector("[name='new_user']");
    if (input) input.value = state.adminUser;
  }
}

function addCsrf(formData) {
  formData.set("csrf_token", state.csrfToken);
  return formData;
}

function showAdminModal() {
  if (!els.adminModal.open) {
    els.adminModal.showModal();
  }
}

function filteredJobs() {
  const term = state.search.trim().toLowerCase();
  return state.jobs
    .filter((job) => state.category === "Todas" || job.category === state.category)
    .filter((job) => {
      if (!term) return true;
      return [job.title, job.company, job.location, job.description, job.category]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
}

function renderCategories() {
  els.categoryList.innerHTML = categories
    .map((category) => {
      const count =
        category === "Todas" ? state.jobs.length : state.jobs.filter((job) => job.category === category).length;
      return `
        <button class="category-chip ${state.category === category ? "active" : ""}" data-category="${category}">
          <span>${esc(category)}</span>
          <span>${count}</span>
        </button>
      `;
    })
    .join("");

  els.adminCategory.innerHTML = categories
    .filter((category) => category !== "Todas")
    .map((category) => `<option value="${esc(category)}">${esc(category)}</option>`)
    .join("");
}

function renderJobs() {
  const jobs = filteredJobs();
  els.jobsCount.textContent = state.jobs.length;
  els.resultCount.textContent = `${jobs.length} ${jobs.length === 1 ? "resultado" : "resultados"}`;
  els.emptyState.hidden = jobs.length > 0;

  els.jobFeed.innerHTML = jobs
    .map(
      (job) => `
      <article class="job-card">
        <img src="${esc(job.image_url || fallbackImage)}" alt="Imagen de ${esc(job.title)}" loading="lazy" />
        <div class="job-body">
          <div class="job-meta">
            <span class="pill">${esc(job.category)}</span>
            <span class="pill">${esc(job.location)}</span>
            <span class="pill">${Number(job.views || 0)} visitas</span>
          </div>
          <h3>${esc(job.title)}</h3>
          <p><strong>${esc(job.company)}</strong></p>
          <p>${esc(job.description).slice(0, 155)}${job.description.length > 155 ? "..." : ""}</p>
          <div class="job-actions">
            <a class="apply" href="#oferta/${job.id}">Ver oferta</a>
            <a href="${whatsappShareUrl(job)}" target="_blank" rel="noreferrer">${platformIcon("whatsapp")} WhatsApp</a>
            <a href="${facebookShareUrl(job)}" target="_blank" rel="noreferrer">${platformIcon("facebook")} Facebook</a>
            <button type="button" data-copy="${job.id}">${platformIcon("instagram")} Instagram</button>
          </div>
        </div>
      </article>
    `
    )
    .join("");
}

async function renderDetail() {
  const match = location.hash.match(/^#oferta\/(.+)$/);
  if (!match) {
    els.jobDetail.hidden = true;
    return;
  }

  const data = await api("view_vacancy", { params: { id: match[1] } });
  const job = data.item;
  if (!job) {
    els.jobDetail.hidden = true;
    return;
  }

  els.jobDetail.hidden = false;
  els.jobDetail.innerHTML = `
    <article class="detail-card">
      <div class="detail-media">
        <img src="${esc(job.image_url || fallbackImage)}" alt="Imagen de ${esc(job.title)}" />
      </div>
      <div class="detail-copy">
        <p class="eyebrow">${esc(job.category)}</p>
        <h2>${esc(job.title)}</h2>
        <div class="job-meta">
          <span class="pill">${esc(job.company)}</span>
          <span class="pill">${esc(job.location)}</span>
          <span class="pill">${Number(job.views || 0)} visitas</span>
        </div>
        <p>${esc(job.description)}</p>
        <div class="detail-actions">
          <a class="apply" href="mailto:${esc(job.email)}?subject=Postulacion: ${encodeURIComponent(job.title)}">
            Postular por correo
          </a>
          <a href="https://wa.me/${String(job.whatsapp).replace(/\D/g, "")}" target="_blank" rel="noreferrer">WhatsApp</a>
          <a href="${whatsappShareUrl(job)}" target="_blank" rel="noreferrer">${platformIcon("whatsapp")} Compartir WhatsApp</a>
          <a href="${facebookShareUrl(job)}" target="_blank" rel="noreferrer">${platformIcon("facebook")} Compartir Facebook</a>
          <button type="button" data-copy="${job.id}">${platformIcon("instagram")} Instagram</button>
        </div>
      </div>
    </article>
  `;
  els.jobDetail.scrollIntoView({ behavior: "smooth", block: "start" });
  await loadJobs();
}

async function loadJobs() {
  const data = await api("list_vacancies");
  state.jobs = data.items || [];
  renderCategories();
  renderJobs();
}

async function loadSiteVisits() {
  const formData = new FormData();
  const shouldCount = sessionStorage.getItem("btu.siteVisitCounted") !== "1";
  formData.append("count", shouldCount ? "1" : "0");
  const data = await api("site_visit", { method: "POST", body: formData });
  if (shouldCount) {
    sessionStorage.setItem("btu.siteVisitCounted", "1");
  }
  els.siteVisitsCount.textContent = Number(data.visits || 0).toLocaleString("es-UY");
}

async function loadAdminData() {
  const data = await api("admin_data");
  applyAdminSession(data);
  renderAdminJobs(data.vacancies || []);
  renderAdminRequests(data.requests || []);
  renderSubscribers(data.subscribers || []);
  renderAuditLogs(data.audit_logs || []);
}

async function refreshAdminData(message) {
  try {
    await loadAdminData();
    if (message) {
      setAdminStatus(message);
    }
  } catch (error) {
    if (message) {
      setAdminStatus(`${message} Si no ves la lista actualizada, cerrá y volvé a entrar al panel admin.`);
      return;
    }
    throw error;
  }
}

function renderAdminJobs(jobs) {
  els.adminJobList.innerHTML = jobs.length
    ? jobs
        .map(
          (job) => `
            <article class="admin-job-item">
              <div>
                <strong>${esc(job.title)}</strong>
                <span>${esc(job.company)} · ${esc(job.location)} · ${esc(job.category)} · ${esc(job.status)}</span>
              </div>
              <div class="request-actions">
                <button class="approve-job" type="button" data-cover-job="${job.id}">Cubierta</button>
                <button class="delete-job" type="button" data-delete-job="${job.id}">Eliminar</button>
              </div>
            </article>
          `
        )
        .join("")
    : `<p class="form-status">No hay vacantes cargadas.</p>`;
}

function renderAdminRequests(requests) {
  els.adminRequestList.innerHTML = requests.length
    ? requests
        .map(
          (request) => `
            <article class="admin-job-item">
              <div>
                <strong>${esc(request.title)}</strong>
                <span>${esc(request.company)} · ${esc(request.location)} · ${esc(request.category)}</span>
                <span>${esc(request.description)}</span>
                ${request.image_url ? `<img class="request-preview" src="${esc(request.image_url)}" alt="Imagen propuesta" />` : ""}
              </div>
              <div class="request-actions">
                <button class="approve-job" type="button" data-approve-request="${request.id}">Aprobar</button>
                <button class="delete-job" type="button" data-reject-request="${request.id}">Rechazar</button>
              </div>
            </article>
          `
        )
        .join("")
    : `<p class="form-status">No hay solicitudes pendientes.</p>`;
}

function renderSubscribers(subscribers) {
  els.subscriberList.innerHTML = subscribers.length
    ? subscribers
        .map(
          (subscriber) => `
            <article class="admin-job-item">
              <div>
                <strong>${esc(subscriber.email)}</strong>
                <span>Alta: ${new Date(subscriber.created_at).toLocaleDateString("es-UY")}</span>
              </div>
            </article>
          `
        )
        .join("")
    : `<p class="form-status">Todavia no hay suscriptores.</p>`;
}

function renderAuditLogs(logs) {
  els.auditLogList.innerHTML = logs.length
    ? logs
        .map(
          (log) => `
            <article class="admin-job-item">
              <div>
                <strong>${esc(log.action)}</strong>
                <span>${esc(log.details || "Sin detalle")} · ${esc(log.ip_address)} · ${new Date(log.created_at).toLocaleString("es-UY")}</span>
              </div>
            </article>
          `
        )
        .join("")
    : `<p class="form-status">Todavia no hay actividad registrada.</p>`;
}

function setAdminStatus(message, isError = false) {
  const status = document.querySelector("#adminStatus");
  status.textContent = message;
  status.classList.toggle("error", isError);
}

function platformIcon(platform) {
  const icons = {
    whatsapp: `<svg class="share-icon whatsapp-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12.04 3.5a8.44 8.44 0 0 0-7.17 12.9l-1.02 3.71 3.8-1a8.43 8.43 0 1 0 4.39-15.61Zm0 1.7a6.73 6.73 0 0 1 5.72 10.27 6.72 6.72 0 0 1-8.56 2.34l-.27-.15-2.26.6.61-2.2-.18-.29A6.73 6.73 0 0 1 12.04 5.2Zm-2.6 3.62c-.15 0-.39.06-.59.28-.2.22-.77.75-.77 1.83 0 1.08.79 2.12.9 2.27.11.15 1.55 2.36 3.75 3.31 1.86.8 2.24.64 2.64.6.4-.04 1.29-.53 1.47-1.04.18-.51.18-.95.13-1.04-.05-.09-.2-.15-.42-.26-.22-.11-1.29-.64-1.49-.71-.2-.07-.35-.11-.5.11-.15.22-.57.71-.7.86-.13.15-.26.17-.48.06-.22-.11-.93-.34-1.77-1.09-.65-.58-1.09-1.3-1.22-1.52-.13-.22-.01-.34.1-.45.1-.1.22-.26.33-.39.11-.13.15-.22.22-.37.07-.15.04-.28-.02-.39-.06-.11-.5-1.2-.68-1.64-.18-.43-.36-.37-.5-.38h-.4Z"/></svg>`,
    facebook: `<svg class="share-icon facebook-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M13.46 20.5v-7.03h2.37l.36-2.74h-2.73V8.98c0-.79.22-1.33 1.36-1.33h1.45V5.2c-.25-.03-1.11-.1-2.11-.1-2.09 0-3.52 1.28-3.52 3.62v2.01H8.28v2.74h2.36v7.03h2.82Z"/></svg>`,
    instagram: `<svg class="share-icon instagram-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.38 4.75h7.24a3.64 3.64 0 0 1 3.63 3.63v7.24a3.64 3.64 0 0 1-3.63 3.63H8.38a3.64 3.64 0 0 1-3.63-3.63V8.38a3.64 3.64 0 0 1 3.63-3.63Zm0 1.7a1.94 1.94 0 0 0-1.93 1.93v7.24c0 1.06.87 1.93 1.93 1.93h7.24a1.94 1.94 0 0 0 1.93-1.93V8.38a1.94 1.94 0 0 0-1.93-1.93H8.38Zm3.62 2.3a3.25 3.25 0 1 1 0 6.5 3.25 3.25 0 0 1 0-6.5Zm0 1.7a1.55 1.55 0 1 0 0 3.1 1.55 1.55 0 0 0 0-3.1Zm3.44-1.95a.78.78 0 1 1 0 1.56.78.78 0 0 1 0-1.56Z"/></svg>`
  };
  return icons[platform] || "";
}

function jobUrl(job) {
  return `${location.origin}${location.pathname}#oferta/${job.id}`;
}

function whatsappShareUrl(job) {
  return `https://wa.me/?text=${encodeURIComponent(`${job.title} en ${job.company} - ${jobUrl(job)}`)}`;
}

function facebookShareUrl(job) {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(jobUrl(job))}`;
}

function copyJobLink(jobId) {
  const job = state.jobs.find((item) => String(item.id) === String(jobId));
  if (!job) return;
  navigator.clipboard.writeText(jobUrl(job));
}

function wireForms() {
  els.companyImage.addEventListener("change", () => {
    const file = els.companyImage.files?.[0];
    els.companyImagePreview.hidden = !file;
    els.companyImageFileName.textContent = file ? file.name : "Elegir imagen opcional";
    if (file) {
      els.companyImagePreview.src = URL.createObjectURL(file);
    }
  });

  document.querySelector("#companyForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (form.dataset.busy === "1") return;
    const formData = new FormData(form);
    formData.set("title", formData.get("role"));
    formData.set("email", formData.get("contact"));
    formData.set("description", formData.get("message"));
    if (els.companyImage.files[0]) {
      formData.set("image", els.companyImage.files[0]);
    }

    try {
      form.dataset.busy = "1";
      setFormBusy(form, true);
      await api("submit_request", { method: "POST", body: formData });
      form.reset();
      els.companyImagePreview.hidden = true;
      els.companyImagePreview.removeAttribute("src");
      els.companyImageFileName.textContent = "Elegir imagen opcional";
      document.querySelector("#companyStatus").textContent =
        "Solicitud recibida. Queda pendiente para aprobacion del administrador.";
    } catch (error) {
      document.querySelector("#companyStatus").textContent = error.message;
    } finally {
      form.dataset.busy = "0";
      setFormBusy(form, false);
    }
  });

  document.querySelector("#newsletterForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (form.dataset.busy === "1") return;
    const formData = new FormData(form);
    try {
      form.dataset.busy = "1";
      setFormBusy(form, true);
      await api("subscribe", { method: "POST", body: formData });
      form.reset();
      document.querySelector("#newsletterStatus").textContent = "Listo. Te sumamos a la newsletter BTU.";
    } catch (error) {
      document.querySelector("#newsletterStatus").textContent = error.message;
    } finally {
      form.dataset.busy = "0";
      setFormBusy(form, false);
    }
  });

  document.querySelector("#contactForm").addEventListener("submit", (event) => {
    event.preventDefault();
    event.currentTarget.reset();
    document.querySelector("#contactStatus").textContent = "Mensaje recibido. Gracias por contactar a BTU.";
  });
}

function wireAdmin() {
  async function openAdminPanel() {
    showAdminModal();
    if (state.adminLogged) {
      els.adminLoginForm.hidden = true;
      await loadAdminData();
      return;
    }
    els.adminLoginForm.hidden = false;
    els.adminLoginStatus.textContent = "";
    els.adminLoginStatus.classList.remove("error");
    els.adminLoginForm.querySelector("input")?.focus();
  }

  if (location.hash === "#admin-btu") {
    openAdminPanel();
  }

  window.addEventListener("hashchange", () => {
    if (location.hash === "#admin-btu") {
      openAdminPanel();
    }
  });

  els.adminLoginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (form.dataset.busy === "1") return;
    const formData = new FormData(form);
    try {
      form.dataset.busy = "1";
      setFormBusy(form, true);
      const data = await api("login", { method: "POST", body: formData });
      applyAdminSession(data);
      state.adminLogged = true;
      els.adminLoginForm.hidden = true;
      form.reset();
      await loadAdminData();
    } catch (error) {
      els.adminLoginStatus.textContent = error.message;
      els.adminLoginStatus.classList.add("error");
    } finally {
      form.dataset.busy = "0";
      setFormBusy(form, false);
    }
  });

  els.passwordForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (form.dataset.busy === "1") return;
    const formData = new FormData(form);
    try {
      form.dataset.busy = "1";
      setFormBusy(form, true);
      const data = await api("change_admin_password", { method: "POST", body: addCsrf(formData) });
      applyAdminSession(data);
      form.reset();
      els.passwordStatus.textContent = "Clave actualizada.";
      els.passwordStatus.classList.remove("error");
    } catch (error) {
      els.passwordStatus.textContent = error.message;
      els.passwordStatus.classList.add("error");
    } finally {
      form.dataset.busy = "0";
      setFormBusy(form, false);
    }
  });

  els.usernameForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (form.dataset.busy === "1") return;
    const formData = new FormData(form);
    try {
      form.dataset.busy = "1";
      setFormBusy(form, true);
      const data = await api("change_admin_user", { method: "POST", body: addCsrf(formData) });
      applyAdminSession(data);
      els.usernameStatus.textContent = "Usuario actualizado.";
      els.usernameStatus.classList.remove("error");
      await refreshAdminData();
    } catch (error) {
      els.usernameStatus.textContent = error.message;
      els.usernameStatus.classList.add("error");
    } finally {
      form.dataset.busy = "0";
      setFormBusy(form, false);
    }
  });

  els.adminImage.addEventListener("change", () => {
    const file = els.adminImage.files?.[0];
    els.adminImagePreview.hidden = !file;
    els.imageFileName.textContent = file ? file.name : "Elegir imagen";
    if (file) {
      els.adminImagePreview.src = URL.createObjectURL(file);
    }
  });

  els.adminForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (form.dataset.busy === "1") return;
    const formData = new FormData(form);
    if (els.adminImage.files[0]) {
      formData.set("image", els.adminImage.files[0]);
    }

    try {
      form.dataset.busy = "1";
      setFormBusy(form, true);
      await api("create_vacancy", { method: "POST", body: addCsrf(formData) });
      form.reset();
      els.adminImagePreview.hidden = true;
      els.imageFileName.textContent = "Elegir imagen";
      await loadJobs();
      await refreshAdminData("Vacante publicada en el feed.");
    } catch (error) {
      setAdminStatus(error.message, true);
    } finally {
      form.dataset.busy = "0";
      setFormBusy(form, false);
    }
  });

  els.adminRequestList.addEventListener("click", async (event) => {
    const approve = event.target.closest("[data-approve-request]");
    const reject = event.target.closest("[data-reject-request]");
    if (!approve && !reject) return;

    const formData = new FormData();
    formData.set("id", approve?.dataset.approveRequest || reject?.dataset.rejectRequest);

    try {
      await api(approve ? "approve_request" : "reject_request", { method: "POST", body: addCsrf(formData) });
      await loadJobs();
      await refreshAdminData(approve ? "Solicitud aprobada y publicada." : "Solicitud rechazada.");
    } catch (error) {
      setAdminStatus(error.message, true);
    }
  });

  els.adminJobList.addEventListener("click", async (event) => {
    const cover = event.target.closest("[data-cover-job]");
    const remove = event.target.closest("[data-delete-job]");
    if (!cover && !remove) return;
    if (remove && !window.confirm("Eliminar esta vacante?")) return;

    const formData = new FormData();
    formData.set("id", cover?.dataset.coverJob || remove?.dataset.deleteJob);

    try {
      await api(cover ? "cover_vacancy" : "delete_vacancy", { method: "POST", body: addCsrf(formData) });
      await loadJobs();
      await refreshAdminData(cover ? "Vacante marcada como cubierta." : "Vacante eliminada.");
    } catch (error) {
      setAdminStatus(error.message, true);
    }
  });

  els.exportSubscribers.addEventListener("click", async () => {
    try {
      const data = await api("admin_data");
      const subscribers = data.subscribers || [];
      if (!subscribers.length) {
        setAdminStatus("No hay suscriptores para exportar.", true);
        return;
      }
      const rows = ["email,fecha", ...subscribers.map((item) => `${item.email},${item.created_at}`)];
      const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "suscriptores-btu.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setAdminStatus(error.message, true);
    }
  });
}

function wireNavigation() {
  els.navToggle.addEventListener("click", () => {
    const isOpen = els.mainNav.classList.toggle("open");
    els.navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  els.mainNav.addEventListener("click", () => {
    els.mainNav.classList.remove("open");
    els.navToggle.setAttribute("aria-expanded", "false");
  });

  els.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderJobs();
  });

  els.clearSearch.addEventListener("click", () => {
    state.search = "";
    els.searchInput.value = "";
    renderJobs();
  });

  els.categoryList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    state.category = button.dataset.category;
    renderCategories();
    renderJobs();
  });

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-copy]");
    if (!button) return;
    copyJobLink(button.dataset.copy);
    button.innerHTML = `${platformIcon("instagram")} Link copiado`;
    setTimeout(() => {
      button.innerHTML = `${platformIcon("instagram")} Instagram`;
    }, 1800);
  });

  window.addEventListener("hashchange", renderDetail);
}

wireNavigation();
wireForms();
wireAdmin();
loadSiteVisits().catch(() => {
  els.siteVisitsCount.textContent = "0";
});
loadJobs().then(renderDetail).catch((error) => {
  els.jobFeed.innerHTML = `<article class="empty-state"><h3>No se pudo cargar BTU</h3><p>${esc(error.message)}</p></article>`;
});
