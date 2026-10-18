'use strict';

// The standard whatsapp:// deep-link scheme that official clients register
// (whatsapp://send?phone=...&text=...) is what other apps hand the router
// — the same one wa.me and api.whatsapp.com/send links try to open via JS
// before falling back to the web version, so the router never has to
// intercept https:// at all. Those two https forms are still recognized
// here because they also show up as plain links inside chats (see
// mainWindow/), where they open the same chat.
const WHATSAPP_LINK = /^(?:whatsapp:\/\/|https?:\/\/(?:wa\.me\/|api\.whatsapp\.com\/send(?:[/?#]|$)))/i;

// wa.me's path is the phone number itself. Anything else there
// (wa.me/message/..., wa.me/qr/...) is a business short link that only
// WhatsApp's own servers can resolve, so it's not treated as a chat link.
const WA_ME_PHONE_PATH = /^\/\+?[\d\s-]*\/?$/;

function isWhatsAppLink(url) {
  return typeof url === 'string' && WHATSAPP_LINK.test(url);
}

// Some launchers pass the URL still wrapped in the quotes from the
// .desktop Exec line or a shell snippet ("whatsapp://...").
function stripQuotes(arg) {
  return typeof arg === 'string' ? arg.replace(/^"(.*)"$/, '$1') : arg;
}

function extractDeepLinkArg(argv) {
  return argv.map(stripQuotes).find(isWhatsAppLink) || null;
}

function decodePath(pathname) {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return pathname;
  }
}

// Returns { phone, text } for any of the three link forms, or null if it
// isn't one. The phone keeps digits only and gets no country code added:
// a number without one is ambiguous, and guessing a country would open a
// chat with a stranger instead.
function parseDeepLink(url) {
  if (!isWhatsAppLink(url)) return null;

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  let phone;
  if (parsed.hostname.toLowerCase() === 'wa.me') {
    const pathname = decodePath(parsed.pathname);
    if (!WA_ME_PHONE_PATH.test(pathname)) return null;
    phone = pathname;
  } else {
    phone = parsed.searchParams.get('phone') || '';
  }

  return {
    phone: phone.replace(/\D/g, ''),
    text: parsed.searchParams.get('text') || '',
  };
}

// WhatsApp Web's own /send route takes the same phone/text query params
// as the whatsapp:// scheme, so opening a chat is just a URL translation,
// not a real integration with WhatsApp's API.
function translateToWebUrl(whatsappUrl) {
  const link = parseDeepLink(whatsappUrl);
  if (!link) return null;

  const params = new URLSearchParams();
  if (link.phone) params.set('phone', link.phone);
  if (link.text) params.set('text', link.text);

  const qs = params.toString();
  return `https://web.whatsapp.com/send${qs ? `?${qs}` : ''}`;
}

module.exports = { extractDeepLinkArg, isWhatsAppLink, parseDeepLink, translateToWebUrl };
