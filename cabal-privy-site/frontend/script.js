import { contact } from "./config.js";

const menuToggle = document.querySelector("#menuToggle");
const siteNav = document.querySelector("#siteNav");
const quoteForm = document.querySelector("#contactForm");
const formMessage = document.querySelector("#formMessage");
const gallery = document.querySelector("#galleryGrid");
const lightbox = document.querySelector("#lightbox");
const lightboxImage = document.querySelector("#lightboxImage");
const lightboxArt = document.querySelector("#lightboxArt");
const lightboxCaption = document.querySelector("#lightboxCaption");
const lightboxClose = document.querySelector("#lightboxClose");

document.querySelector("#currentYear").textContent = new Date().getFullYear();
document.querySelector("#contactPhone").href = `tel:${contact.phoneLink}`;
document.querySelector("#contactPhone").textContent = contact.phoneDisplay;
document.querySelector("#contactWhatsapp").href = `https://web.whatsapp.com/send?phone=${contact.whatsapp}`;
document.querySelector("#contactEmail").href = `mailto:${contact.email}`;
document.querySelector("#contactEmail").textContent = contact.email;

const eventDate = quoteForm.elements.namedItem("date");
eventDate.min = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000)
  .toISOString()
  .slice(0, 10);

function closeMenu() {
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Open navigation menu");
  siteNav.classList.remove("is-open");
}

menuToggle.addEventListener("click", () => {
  const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isExpanded));
  menuToggle.setAttribute("aria-label", isExpanded ? "Open navigation menu" : "Close navigation menu");
  siteNav.classList.toggle("is-open", !isExpanded);
});

siteNav.addEventListener("click", (event) => {
  if (event.target.closest("a")) closeMenu();
});

function closeLightbox() {
  lightbox.hidden = true;
  lightboxImage.removeAttribute("src");
}

gallery.addEventListener("click", (event) => {
  const tile = event.target.closest(".gallery-tile");
  if (!tile) return;

  lightbox.hidden = false;
  lightboxCaption.textContent = tile.dataset.caption;
  lightboxArt.classList.add("is-placeholder");
  lightboxImage.hidden = true;
  lightboxClose.focus();

  lightboxImage.onload = () => {
    lightboxImage.hidden = false;
    lightboxArt.classList.remove("is-placeholder");
  };
  lightboxImage.onerror = () => {
    lightboxImage.hidden = true;
    lightboxArt.classList.add("is-placeholder");
  };
  lightboxImage.src = tile.dataset.src;
});

lightboxClose.addEventListener("click", closeLightbox);
lightbox.addEventListener("click", (event) => {
  if (event.target === lightbox) closeLightbox();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (!lightbox.hidden) {
      closeLightbox();
    } else {
      closeMenu();
    }
  }
});

quoteForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!quoteForm.reportValidity()) return;

  const submitButton = quoteForm.querySelector(".form-submit");
  const payload = Object.fromEntries(new FormData(quoteForm));
  submitButton.disabled = true;
  formMessage.textContent = "Sending your request…";
  formMessage.classList.remove("is-error");

  try {
    const response = await fetch("/api/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "We couldn't send your request. Please try again.");
    quoteForm.reset();
    eventDate.min = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 10);
    formMessage.textContent = result.message;
  } catch (error) {
    formMessage.textContent = error.message || "We couldn't reach the server. Please try again.";
    formMessage.classList.add("is-error");
  } finally {
    submitButton.disabled = false;
  }
});
