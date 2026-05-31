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

const seedJobs = [
  {
    id: "auxiliar-administrativo-montevideo",
    title: "Auxiliar administrativo",
    company: "Estudio Centro",
    location: "Montevideo",
    category: "Administracion",
    image: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80",
    email: "postulaciones@empresa.com",
    whatsapp: "+598 99 000 000",
    views: 183,
    createdAt: "2026-05-29",
    description:
      "Empresa de servicios incorpora auxiliar administrativo con manejo de herramientas digitales, buena comunicacion y disponibilidad de lunes a viernes."
  },
  {
    id: "mozo-cafeteria-pocitos",
    title: "Mozo/a para cafeteria",
    company: "Cafeteria Pocitos",
    location: "Pocitos, Montevideo",
    category: "Gastronomia",
    image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=900&q=80",
    email: "rrhh@cafeteria.com",
    whatsapp: "+598 98 111 111",
    views: 246,
    createdAt: "2026-05-30",
    description:
      "Se busca persona responsable para atencion al publico, servicio de mesas y apoyo general en cafeteria. Se valora experiencia previa."
  },
  {
    id: "vendedor-local-shopping",
    title: "Vendedor/a para local comercial",
    company: "Retail UY",
    location: "Montevideo Shopping",
    category: "Ventas",
    image: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=900&q=80",
    email: "talento@retailuy.com",
    whatsapp: "+598 97 222 222",
    views: 318,
    createdAt: "2026-05-28",
    description:
      "Local comercial selecciona vendedor/a con perfil dinamico, orientacion al cliente y disponibilidad horaria para turnos rotativos."
  },
  {
    id: "operario-logistica-canelones",
    title: "Operario de deposito",
    company: "Logistica Sur",
    location: "Canelones",
    category: "Logistica",
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=900&q=80",
    email: "seleccion@logisticasur.com",
    whatsapp: "+598 96 333 333",
    views: 129,
    createdAt: "2026-05-27",
    description:
      "Centro logistico busca operario para preparacion de pedidos, control de stock y tareas de deposito. Carnet de salud vigente."
  }
];

const state = {
  search: "",
  category: "Todas",
  jobs: loadJobs(),
  requests: loadRequests()
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
  jobFeed: document.querySelector("#jobFeed"),
  emptyState: document.querySelector("#emptyState"),
  resultCount: document.querySelector("#resultCount"),
  jobsCount: document.querySelector("#jobsCount"),
  jobDetail: document.querySelector("#jobDetail"),
  adminModal: document.querySelector("#adminModal"),
  openAdmin: document.querySelector("#openAdmin"),
  adminForm: document.querySelector("#adminForm"),
  adminImage: document.querySelector("#adminImage"),
  adminImagePreview: document.querySelector("#adminImagePreview"),
  imageFileName: document.querySelector("#imageFileName"),
  companyImage: document.querySelector("#companyImage"),
  companyImagePreview: document.querySelector("#companyImagePreview"),
  companyImageFileName: document.querySelector("#companyImageFileName"),
  subscriberList: document.querySelector("#subscriberList"),
  exportSubscribers: document.querySelector("#exportSubscribers")
};

let pendingAdminImage = "";
let pendingCompanyImage = "";

function fileToOptimizedImage(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("El archivo elegido no es una imagen."));
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("error", () => reject(new Error("No se pudo leer la imagen.")));
    reader.addEventListener("load", () => {
      const source = String(reader.result);
      const image = new Image();

      image.addEventListener("error", () => {
        reject(new Error("Ese formato de imagen no se puede mostrar. Probá con JPG, PNG o WebP."));
      });

      image.addEventListener("load", () => {
        const maxSize = 1200;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));

        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      });

      image.src = source;
    });
    reader.readAsDataURL(file);
  });
}

function setAdminStatus(message, isError = false) {
  const status = document.querySelector("#adminStatus");
  status.textContent = message;
  status.classList.toggle("error", isError);
}

function loadJobs() {
  const saved = localStorage.getItem("btu.jobs");
  if (!saved) return seedJobs;

  try {
    return JSON.parse(saved);
  } catch {
    return seedJobs;
  }
}

function loadRequests() {
  const saved = localStorage.getItem("btu.requests");
  if (!saved) return [];

  try {
    return JSON.parse(saved);
  } catch {
    return [];
  }
}

function saveJobs() {
  localStorage.setItem("btu.jobs", JSON.stringify(state.jobs));
}

function saveRequests() {
  localStorage.setItem("btu.requests", JSON.stringify(state.requests));
}

function loadSubscribers() {
  try {
    return JSON.parse(localStorage.getItem("btu.subscribers") || "[]");
  } catch {
    return [];
  }
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
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
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function renderCategories() {
  els.categoryList.innerHTML = categories
    .map((category) => {
      const count =
        category === "Todas" ? state.jobs.length : state.jobs.filter((job) => job.category === category).length;
      return `
        <button class="category-chip ${state.category === category ? "active" : ""}" data-category="${category}">
          <span>${category}</span>
          <span>${count}</span>
        </button>
      `;
    })
    .join("");

  els.adminCategory.innerHTML = categories
    .filter((category) => category !== "Todas")
    .map((category) => `<option value="${category}">${category}</option>`)
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
        <img src="${job.image}" alt="Imagen de ${job.title}" loading="lazy" />
        <div class="job-body">
          <div class="job-meta">
            <span class="pill">${job.category}</span>
            <span class="pill">${job.location}</span>
            <span class="pill">${job.views || 0} visitas</span>
          </div>
          <h3>${job.title}</h3>
          <p><strong>${job.company}</strong></p>
          <p>${job.description.slice(0, 155)}${job.description.length > 155 ? "..." : ""}</p>
          <div class="job-actions">
            <a class="apply" href="#oferta/${job.id}">Ver oferta</a>
            <a href="${whatsappShareUrl(job)}" target="_blank" rel="noreferrer">
              ${platformIcon("whatsapp")} WhatsApp
            </a>
            <a href="${facebookShareUrl(job)}" target="_blank" rel="noreferrer">
              ${platformIcon("facebook")} Facebook
            </a>
            <button type="button" data-copy="${job.id}">
              ${platformIcon("instagram")} Instagram
            </button>
          </div>
        </div>
      </article>
    `
    )
    .join("");
}

function renderAdminJobs() {
  if (!els.adminJobList) return;

  els.adminJobList.innerHTML = state.jobs
    .map(
      (job) => `
        <article class="admin-job-item">
          <div>
            <strong>${job.title}</strong>
            <span>${job.company} · ${job.location} · ${job.category}</span>
          </div>
          <button class="delete-job" type="button" data-delete-job="${job.id}">
            Eliminar
          </button>
        </article>
      `
    )
    .join("");
}

function renderAdminRequests() {
  if (!els.adminRequestList) return;

  if (!state.requests.length) {
    els.adminRequestList.innerHTML = `<p class="form-status">No hay solicitudes pendientes.</p>`;
    return;
  }

  els.adminRequestList.innerHTML = state.requests
    .map(
      (request) => `
        <article class="admin-job-item">
          <div>
            <strong>${request.title}</strong>
            <span>${request.company} · ${request.location} · ${request.category}</span>
            <span>${request.description}</span>
            ${request.image ? `<img class="request-preview" src="${request.image}" alt="Imagen propuesta para ${request.title}" />` : ""}
          </div>
          <div class="request-actions">
            <button class="approve-job" type="button" data-approve-request="${request.id}">
              Aprobar
            </button>
            <button class="delete-job" type="button" data-reject-request="${request.id}">
              Rechazar
            </button>
          </div>
        </article>
      `
    )
    .join("");
}

function renderSubscribers() {
  if (!els.subscriberList) return;
  const subscribers = loadSubscribers();

  if (!subscribers.length) {
    els.subscriberList.innerHTML = `<p class="form-status">Todavia no hay suscriptores.</p>`;
    return;
  }

  els.subscriberList.innerHTML = subscribers
    .map(
      (subscriber) => `
        <article class="admin-job-item">
          <div>
            <strong>${subscriber.email}</strong>
            <span>Alta: ${new Date(subscriber.createdAt).toLocaleDateString("es-UY")}</span>
          </div>
        </article>
      `
    )
    .join("");
}

function renderDetail() {
  const match = location.hash.match(/^#oferta\/(.+)$/);
  if (!match) {
    els.jobDetail.hidden = true;
    return;
  }

  const job = state.jobs.find((item) => item.id === match[1]);
  if (!job) {
    els.jobDetail.hidden = true;
    return;
  }

  job.views = (job.views || 0) + 1;
  saveJobs();

  els.jobDetail.hidden = false;
  els.jobDetail.innerHTML = `
    <article class="detail-card">
      <div class="detail-media">
        <img src="${job.image}" alt="Imagen de ${job.title}" />
      </div>
      <div class="detail-copy">
        <p class="eyebrow">${job.category}</p>
        <h2>${job.title}</h2>
        <div class="job-meta">
          <span class="pill">${job.company}</span>
          <span class="pill">${job.location}</span>
          <span class="pill">${job.views || 0} visitas</span>
        </div>
        <p>${job.description}</p>
        <div class="detail-actions">
          <a class="apply" href="mailto:${job.email}?subject=Postulacion: ${encodeURIComponent(job.title)}">
            Postular por correo
          </a>
          <a href="https://wa.me/${job.whatsapp.replace(/\D/g, "")}" target="_blank" rel="noreferrer">
            WhatsApp
          </a>
          <a href="${whatsappShareUrl(job)}" target="_blank" rel="noreferrer">
            ${platformIcon("whatsapp")} Compartir WhatsApp
          </a>
          <a href="${facebookShareUrl(job)}" target="_blank" rel="noreferrer">
            ${platformIcon("facebook")} Compartir Facebook
          </a>
          <button type="button" data-copy="${job.id}">
            ${platformIcon("instagram")} Instagram
          </button>
        </div>
      </div>
    </article>
  `;
  els.jobDetail.scrollIntoView({ behavior: "smooth", block: "start" });
  renderJobs();
  renderCategories();
}

function jobUrl(job) {
  return `${location.origin}${location.pathname}#oferta/${job.id}`;
}

function whatsappShareUrl(job) {
  const url = jobUrl(job);
  return `https://wa.me/?text=${encodeURIComponent(`${job.title} en ${job.company} - ${url}`)}`;
}

function facebookShareUrl(job) {
  const url = jobUrl(job);
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

function platformIcon(platform) {
  const icons = {
    whatsapp: `
      <svg class="share-icon whatsapp-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12.04 3.5a8.44 8.44 0 0 0-7.17 12.9l-1.02 3.71 3.8-1a8.43 8.43 0 1 0 4.39-15.61Zm0 1.7a6.73 6.73 0 0 1 5.72 10.27 6.72 6.72 0 0 1-8.56 2.34l-.27-.15-2.26.6.61-2.2-.18-.29A6.73 6.73 0 0 1 12.04 5.2Zm-2.6 3.62c-.15 0-.39.06-.59.28-.2.22-.77.75-.77 1.83 0 1.08.79 2.12.9 2.27.11.15 1.55 2.36 3.75 3.31 1.86.8 2.24.64 2.64.6.4-.04 1.29-.53 1.47-1.04.18-.51.18-.95.13-1.04-.05-.09-.2-.15-.42-.26-.22-.11-1.29-.64-1.49-.71-.2-.07-.35-.11-.5.11-.15.22-.57.71-.7.86-.13.15-.26.17-.48.06-.22-.11-.93-.34-1.77-1.09-.65-.58-1.09-1.3-1.22-1.52-.13-.22-.01-.34.1-.45.1-.1.22-.26.33-.39.11-.13.15-.22.22-.37.07-.15.04-.28-.02-.39-.06-.11-.5-1.2-.68-1.64-.18-.43-.36-.37-.5-.38h-.4Z" />
      </svg>`,
    facebook: `
      <svg class="share-icon facebook-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M13.46 20.5v-7.03h2.37l.36-2.74h-2.73V8.98c0-.79.22-1.33 1.36-1.33h1.45V5.2c-.25-.03-1.11-.1-2.11-.1-2.09 0-3.52 1.28-3.52 3.62v2.01H8.28v2.74h2.36v7.03h2.82Z" />
      </svg>`,
    instagram: `
      <svg class="share-icon instagram-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8.38 4.75h7.24a3.64 3.64 0 0 1 3.63 3.63v7.24a3.64 3.64 0 0 1-3.63 3.63H8.38a3.64 3.64 0 0 1-3.63-3.63V8.38a3.64 3.64 0 0 1 3.63-3.63Zm0 1.7a1.94 1.94 0 0 0-1.93 1.93v7.24c0 1.06.87 1.93 1.93 1.93h7.24a1.94 1.94 0 0 0 1.93-1.93V8.38a1.94 1.94 0 0 0-1.93-1.93H8.38Zm3.62 2.3a3.25 3.25 0 1 1 0 6.5 3.25 3.25 0 0 1 0-6.5Zm0 1.7a1.55 1.55 0 1 0 0 3.1 1.55 1.55 0 0 0 0-3.1Zm3.44-1.95a.78.78 0 1 1 0 1.56.78.78 0 0 1 0-1.56Z" />
      </svg>`
  };

  return icons[platform] || "";
}

function copyJobLink(jobId) {
  const job = state.jobs.find((item) => item.id === jobId);
  if (!job) return;
  const url = `${location.origin}${location.pathname}#oferta/${job.id}`;
  navigator.clipboard.writeText(url);
}

function wireForms() {
  els.companyImage.addEventListener("change", async () => {
    const file = els.companyImage.files?.[0];
    if (!file) {
      pendingCompanyImage = "";
      els.companyImagePreview.hidden = true;
      els.companyImageFileName.textContent = "Elegir imagen opcional";
      return;
    }

    const status = document.querySelector("#companyStatus");
    status.textContent = "Preparando imagen...";
    status.classList.remove("error");

    try {
      pendingCompanyImage = await fileToOptimizedImage(file);
      els.companyImagePreview.src = pendingCompanyImage;
      els.companyImagePreview.hidden = false;
      els.companyImageFileName.textContent = file.name;
      status.textContent = "Imagen lista para enviar.";
    } catch (error) {
      pendingCompanyImage = "";
      els.companyImagePreview.hidden = true;
      els.companyImageFileName.textContent = "Elegir imagen opcional";
      status.textContent = error.message;
      status.classList.add("error");
    }
  });

  document.querySelector("#companyForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    state.requests.unshift({
      id: `solicitud-${Date.now()}`,
      company: data.company,
      contact: data.contact,
      title: data.role,
      location: data.location,
      category: data.category,
      whatsapp: data.whatsapp,
      image: pendingCompanyImage,
      description: data.message,
      createdAt: new Date().toISOString().slice(0, 10)
    });
    saveRequests();
    renderAdminRequests();
    event.currentTarget.reset();
    pendingCompanyImage = "";
    els.companyImagePreview.hidden = true;
    els.companyImagePreview.removeAttribute("src");
    els.companyImageFileName.textContent = "Elegir imagen opcional";
    document.querySelector("#companyStatus").textContent =
      "Solicitud recibida. Queda pendiente para aprobacion del administrador.";
  });

  document.querySelector("#newsletterForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email")).trim().toLowerCase();
    const subscribers = JSON.parse(localStorage.getItem("btu.subscribers") || "[]");
    if (subscribers.some((subscriber) => subscriber.email === email)) {
      document.querySelector("#newsletterStatus").textContent = "Ese correo ya estaba suscripto.";
      event.currentTarget.reset();
      renderSubscribers();
      return;
    }
    subscribers.push({ email, createdAt: new Date().toISOString() });
    localStorage.setItem("btu.subscribers", JSON.stringify(subscribers));
    event.currentTarget.reset();
    renderSubscribers();
    document.querySelector("#newsletterStatus").textContent = "Listo. Te sumamos a la newsletter BTU.";
  });

  document.querySelector("#contactForm").addEventListener("submit", (event) => {
    event.preventDefault();
    event.currentTarget.reset();
    document.querySelector("#contactStatus").textContent = "Mensaje recibido. Gracias por contactar a BTU.";
  });
}

function wireAdmin() {
  els.openAdmin.addEventListener("click", () => {
    const passcode = window.prompt("Clave de administrador");
    if (passcode === "BTU2026") {
      els.adminModal.showModal();
      return;
    }
    alert("Clave incorrecta.");
  });

  els.adminImage.addEventListener("change", async () => {
    const file = els.adminImage.files?.[0];
    if (!file) {
      pendingAdminImage = "";
      els.adminImagePreview.hidden = true;
      els.imageFileName.textContent = "Elegir imagen";
      return;
    }

    setAdminStatus("Preparando imagen...");

    try {
      pendingAdminImage = await fileToOptimizedImage(file);
      els.adminImagePreview.src = pendingAdminImage;
      els.adminImagePreview.hidden = false;
      els.imageFileName.textContent = file.name;
      setAdminStatus("Imagen lista para publicar.");
    } catch (error) {
      pendingAdminImage = "";
      els.adminImagePreview.hidden = true;
      els.imageFileName.textContent = "Elegir imagen";
      setAdminStatus(error.message, true);
    }
  });

  els.adminForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const createdAt = new Date().toISOString().slice(0, 10);
    const id = `${slugify(data.title)}-${Date.now()}`;

    state.jobs.unshift({
      id,
      title: data.title,
      company: data.company,
      location: data.location,
      category: data.category,
      image:
        pendingAdminImage ||
        "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80",
      email: data.email,
      whatsapp: data.whatsapp,
      views: 0,
      createdAt,
      description: data.description
    });

    try {
      saveJobs();
      renderCategories();
      renderJobs();
      renderAdminJobs();
      renderAdminRequests();
      event.currentTarget.reset();
      pendingAdminImage = "";
      els.adminImagePreview.hidden = true;
      els.adminImagePreview.removeAttribute("src");
      els.imageFileName.textContent = "Elegir imagen";
      setAdminStatus("Vacante publicada en el feed.");
    } catch {
      state.jobs.shift();
      setAdminStatus("La imagen es muy pesada para esta demo. Probá con una foto más liviana.", true);
    }
  });

  els.adminJobList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-job]");
    if (!button) return;

    const job = state.jobs.find((item) => item.id === button.dataset.deleteJob);
    if (!job) return;

    const confirmed = window.confirm(`Eliminar la vacante "${job.title}"?`);
    if (!confirmed) return;

    state.jobs = state.jobs.filter((item) => item.id !== job.id);
    saveJobs();
    renderCategories();
    renderJobs();
    renderAdminJobs();
    renderAdminRequests();

    if (location.hash === `#oferta/${job.id}`) {
      location.hash = "#vacantes";
      els.jobDetail.hidden = true;
    }

    setAdminStatus("Vacante eliminada.");
  });

  els.adminRequestList.addEventListener("click", (event) => {
    const approveButton = event.target.closest("[data-approve-request]");
    const rejectButton = event.target.closest("[data-reject-request]");
    const requestId = approveButton?.dataset.approveRequest || rejectButton?.dataset.rejectRequest;
    if (!requestId) return;

    const request = state.requests.find((item) => item.id === requestId);
    if (!request) return;

    if (approveButton) {
      state.jobs.unshift({
        id: `${slugify(request.title)}-${Date.now()}`,
        title: request.title,
        company: request.company,
        location: request.location,
        category: request.category,
        image:
          request.image ||
          "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80",
        email: request.contact,
        whatsapp: request.whatsapp,
        views: 0,
        createdAt: new Date().toISOString().slice(0, 10),
        description: request.description
      });
      state.requests = state.requests.filter((item) => item.id !== request.id);
      saveJobs();
      saveRequests();
      renderCategories();
      renderJobs();
      renderAdminJobs();
      renderAdminRequests();
      setAdminStatus("Solicitud aprobada y publicada en el feed.");
      return;
    }

    const confirmed = window.confirm(`Rechazar la solicitud "${request.title}"?`);
    if (!confirmed) return;

    state.requests = state.requests.filter((item) => item.id !== request.id);
    saveRequests();
    renderAdminRequests();
    setAdminStatus("Solicitud rechazada.");
  });

  els.exportSubscribers.addEventListener("click", () => {
    const subscribers = loadSubscribers();
    if (!subscribers.length) {
      setAdminStatus("No hay suscriptores para exportar.", true);
      return;
    }

    const rows = ["email,fecha", ...subscribers.map((subscriber) => `${subscriber.email},${subscriber.createdAt}`)];
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "suscriptores-btu.csv";
    link.click();
    URL.revokeObjectURL(url);
    setAdminStatus("Suscriptores exportados.");
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

renderCategories();
renderJobs();
renderAdminJobs();
renderAdminRequests();
renderSubscribers();
wireNavigation();
wireForms();
wireAdmin();
renderDetail();
