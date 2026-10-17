"use strict";

const params = new URLSearchParams(window.location.search);
const mode = params.get("mode") || "create";
const desktopId = params.get("desktopId") || "";
const localeParam = params.get("locale") || "";
const LOCALE = ["pt", "es", "en"].includes(localeParam) ? localeParam : "en";
const L = (window.TUXCHAT_STRINGS &&
  window.TUXCHAT_STRINGS[LOCALE] &&
  window.TUXCHAT_STRINGS[LOCALE].sessionModal) ||
  (window.TUXCHAT_STRINGS &&
    window.TUXCHAT_STRINGS.en &&
    window.TUXCHAT_STRINGS.en.sessionModal) || {
    createTitle: "New Session",
    createSubtitle: "Create a new isolated tab for another WhatsApp account.",
    editTitle: "Edit Session",
    editSubtitleMain: "Customize the main session name and profile photo.",
    editSubtitleOther: "Modify this session's name or photo.",
    sessionNameLabel: "Session name",
    sessionNamePlaceholder: "E.g.: Work, Personal, Sales...",
    choosePhoto: "Choose photo",
    changePhoto: "Change photo",
    removePhoto: "Remove",
    photoHint: "JPG, PNG or WebP. Square crop 128x128.",
    cancel: "Cancel",
    createBtn: "Create session",
    saveBtn: "Save changes",
    deleteBtn: "Delete",
    emptyNameError: "Please provide a name for the session.",
  };

document.documentElement.lang = LOCALE;

const modalTitleEl = document.getElementById("modal-title");
const modalSubtitleEl = document.getElementById("modal-subtitle");
const modalCloseBtn = document.getElementById("modal-close-btn");
const modalAvatarPreview = document.getElementById("modal-avatar-preview");
const modalAvatarImg = document.getElementById("modal-avatar-img");
const modalAvatarInitials = document.getElementById("modal-avatar-initials");
const modalAvatarInput = document.getElementById("modal-avatar-input");
const modalChoosePhotoBtn = document.getElementById("modal-choose-photo-btn");
const modalRemovePhotoBtn = document.getElementById("modal-remove-photo-btn");
const modalNameInput = document.getElementById("modal-name-input");
const modalErrorEl = document.getElementById("modal-error");
const modalCharCountEl = document.getElementById("modal-char-count");
const modalDeleteBtn = document.getElementById("modal-delete-btn");
const modalCancelBtn = document.getElementById("modal-cancel-btn");
const modalSubmitBtn = document.getElementById("modal-submit-btn");

let currentAvatar = null;

function getInitials(name) {
  if (!name) return "S";
  const clean = name.replace(/[^\p{L}\p{N}\s]/gu, "").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (clean.slice(0, 2) || name.slice(0, 2) || "S").toUpperCase();
}

function updateAvatarUI() {
  if (currentAvatar) {
    modalAvatarImg.src = currentAvatar;
    modalAvatarImg.hidden = false;
    modalAvatarInitials.hidden = true;
    modalAvatarPreview.classList.add("has-photo");
    modalRemovePhotoBtn.hidden = false;
    modalChoosePhotoBtn.querySelector("span").textContent = L.changePhoto;
  } else {
    modalAvatarImg.hidden = true;
    modalAvatarImg.removeAttribute("src");
    modalAvatarInitials.hidden = false;
    modalAvatarPreview.classList.remove("has-photo");
    modalRemovePhotoBtn.hidden = true;
    modalChoosePhotoBtn.querySelector("span").textContent = L.choosePhoto;
    modalAvatarInitials.textContent = getInitials(modalNameInput.value);
  }
  modalRemovePhotoBtn.querySelector("span").textContent = L.removePhoto;
}

function processImage(file) {
  if (!file || !file.type.startsWith("image/")) return;
  const reader = new window.FileReader();
  reader.onload = (e) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext("2d");
      const minDim = Math.min(img.width, img.height);
      const sx = (img.width - minDim) / 2;
      const sy = (img.height - minDim) / 2;
      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, 128, 128);
      currentAvatar = canvas.toDataURL("image/webp", 0.88);
      updateAvatarUI();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

modalAvatarPreview.addEventListener("click", () => modalAvatarInput.click());
modalChoosePhotoBtn.addEventListener("click", () => modalAvatarInput.click());
modalAvatarInput.addEventListener("change", () => {
  if (modalAvatarInput.files && modalAvatarInput.files[0]) {
    processImage(modalAvatarInput.files[0]);
    modalAvatarInput.value = "";
  }
});
modalRemovePhotoBtn.addEventListener("click", () => {
  currentAvatar = null;
  updateAvatarUI();
});

modalNameInput.addEventListener("input", () => {
  const len = modalNameInput.value.length;
  modalCharCountEl.textContent = `${len}/25`;
  if (!currentAvatar) {
    modalAvatarInitials.textContent = getInitials(modalNameInput.value);
  }
  modalErrorEl.hidden = true;
});

async function init() {
  const hintEl = document.getElementById("modal-avatar-hint");
  if (hintEl) hintEl.textContent = L.photoHint;
  const labelTextEl = document.getElementById("modal-name-label-text");
  if (labelTextEl) labelTextEl.textContent = L.sessionNameLabel;
  modalNameInput.placeholder = L.sessionNamePlaceholder;
  modalCancelBtn.textContent = L.cancel;
  const deleteTextEl = document.getElementById("modal-delete-text");
  if (deleteTextEl) deleteTextEl.textContent = L.deleteBtn;

  if (mode === "edit") {
    modalTitleEl.textContent = L.editTitle;
    modalSubtitleEl.textContent =
      desktopId === "tuxchat" ? L.editSubtitleMain : L.editSubtitleOther;
    modalSubmitBtn.textContent = L.saveBtn;
    const canDelete = Boolean(desktopId && desktopId !== "tuxchat");
    modalDeleteBtn.hidden = !canDelete;
    modalDeleteBtn.style.display = canDelete ? "inline-flex" : "none";

    try {
      const list = await window.modalAPI.list();
      const s = list.find((item) => item.desktopId === desktopId);
      if (s) {
        modalNameInput.value = s.profileName || "";
        modalCharCountEl.textContent = `${modalNameInput.value.length}/25`;
        currentAvatar = s.avatar || null;
      }
    } catch {
      // Failed to load list
    }
  } else {
    modalTitleEl.textContent = L.createTitle;
    modalSubtitleEl.textContent = L.createSubtitle;
    modalSubmitBtn.textContent = L.createBtn;
    modalDeleteBtn.hidden = true;
    modalDeleteBtn.style.display = "none";
  }

  updateAvatarUI();
  modalNameInput.focus();
}

modalCloseBtn.addEventListener("click", () => window.modalAPI.close());
modalCancelBtn.addEventListener("click", () => window.modalAPI.close());

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    window.modalAPI.close();
  }
});

modalDeleteBtn.addEventListener("click", () => {
  if (desktopId && desktopId !== "tuxchat") {
    window.modalAPI.openDelete(desktopId);
  }
});

async function submit() {
  const name = modalNameInput.value.trim();
  if (!name) {
    modalErrorEl.textContent = L.emptyNameError;
    modalErrorEl.hidden = false;
    modalNameInput.focus();
    return;
  }

  modalSubmitBtn.disabled = true;
  modalErrorEl.hidden = true;

  try {
    let res;
    if (mode === "create") {
      res = await window.modalAPI.create({ name, avatar: currentAvatar });
    } else {
      res = await window.modalAPI.update({
        desktopId,
        name,
        avatar: currentAvatar,
      });
    }

    if (!res.ok) {
      modalErrorEl.textContent = res.error || "Erro ao salvar.";
      modalErrorEl.hidden = false;
      modalSubmitBtn.disabled = false;
      return;
    }

    window.modalAPI.close();
  } catch (err) {
    modalErrorEl.textContent = err.message || "Erro inesperado.";
    modalErrorEl.hidden = false;
  } finally {
    modalSubmitBtn.disabled = false;
  }
}

modalSubmitBtn.addEventListener("click", submit);
modalNameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") submit();
});

init();
