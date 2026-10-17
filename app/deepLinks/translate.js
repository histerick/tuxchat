"use strict";

// Matches the standard whatsapp:// deep-link scheme that official clients
// register (whatsapp://send?phone=...&text=...) — the same one wa.me and
// api.whatsapp.com/send links try to open via JS before falling back to
// the web version, so registering this scheme alone is enough: no need
// to intercept https:// at all.
function extractDeepLinkArg(argv) {
  if (!Array.isArray(argv)) return null;
  const arg = argv.find(
    (a) =>
      typeof a === "string" &&
      (/^"?whatsapp:\/\//i.test(a) ||
        /^"?(?:https?:\/\/)?(?:wa\.me|api\.whatsapp\.com\/send)/i.test(a)),
  );
  if (!arg) return null;
  return arg.replace(/^"|"$/g, "");
}

function parseDeepLink(whatsappUrl) {
  if (!whatsappUrl || typeof whatsappUrl !== "string") return null;
  let parsed;
  try {
    let urlStr = whatsappUrl;
    if (/^(?:wa\.me|api\.whatsapp\.com)/i.test(urlStr)) {
      urlStr = `https://${urlStr}`;
    }
    parsed = new URL(urlStr);
  } catch {
    return null;
  }

  let phone = "";
  let text = "";

  if (/wa\.me/i.test(parsed.hostname)) {
    const rawPath = parsed.pathname.replace(/^\/+/, "");
    if (rawPath) phone = rawPath;
    text = parsed.searchParams.get("text") || "";
  } else {
    phone = parsed.searchParams.get("phone") || "";
    text = parsed.searchParams.get("text") || "";
  }

  if (phone) {
    let cleanPhone = phone.replace(/\/+$/, "").replace(/\D/g, "");
    if (
      (cleanPhone.length === 10 || cleanPhone.length === 11) &&
      !cleanPhone.startsWith("55")
    ) {
      cleanPhone = `55${cleanPhone}`;
    }
    phone = cleanPhone;
  }

  return { phone, text };
}

// WhatsApp Web's own /send route takes the same phone/text query params
// as the whatsapp:// scheme, so opening a chat is just a URL translation,
// not a real integration with WhatsApp's API.
function translateToWebUrl(whatsappUrl) {
  const parsed = parseDeepLink(whatsappUrl);
  if (!parsed) return null;

  const params = new URLSearchParams();
  if (parsed.phone) params.set("phone", parsed.phone);
  if (parsed.text) params.set("text", parsed.text);

  const qs = params.toString();
  return `https://web.whatsapp.com/send${qs ? `?${qs}` : ""}`;
}

module.exports = { extractDeepLinkArg, translateToWebUrl, parseDeepLink };
