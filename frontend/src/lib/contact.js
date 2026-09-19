// Argentine mobile numbers need a "9" inserted after the country code for
// WhatsApp deep links (wa.me), which the local "2233129470" (area code 223 +
// local number) doesn't include on its own: +54 9 223 312-9470.
const WHATSAPP_NUMBER = "5492233129470";

export function getWhatsAppLink(lang) {
  const message = lang === "es"
    ? "Hola! Te escribo desde PACHA, tengo una consulta:"
    : "Hi! I'm reaching out from PACHA, I have a question:";
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
