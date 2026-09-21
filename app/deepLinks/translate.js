'use strict';

// Matches the standard whatsapp:// deep-link scheme that official clients
// register (whatsapp://send?phone=...&text=...) — the same one wa.me and
// api.whatsapp.com/send links try to open via JS before falling back to
// the web version, so registering this scheme alone is enough: no need
// to intercept https:// at all.
function extractDeepLinkArg(argv) {
  return argv.find((arg) => /^whatsapp:\/\//i.test(arg)) || null;
}

// WhatsApp Web's own /send route takes the same phone/text query params
// as the whatsapp:// scheme, so opening a chat is just a URL translation,
// not a real integration with WhatsApp's API.
function translateToWebUrl(whatsappUrl) {
  let parsed;
  try {
    parsed = new URL(whatsappUrl);
  } catch {
    return null;
  }

  const phone = parsed.searchParams.get('phone');
  const text = parsed.searchParams.get('text');

  const params = new URLSearchParams();
  if (phone) params.set('phone', phone);
  if (text) params.set('text', text);

  const qs = params.toString();
  return `https://web.whatsapp.com/send${qs ? `?${qs}` : ''}`;
}

module.exports = { extractDeepLinkArg, translateToWebUrl };
