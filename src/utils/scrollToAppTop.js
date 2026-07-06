export function scrollToAppTop() {
  const el = document.querySelector('[data-app-scroll]')
  if (el) el.scrollTop = 0
}