// Icon sheet, rendered once. <Icon name="x" /> points at #i-x with <use>.
const SYMBOLS = `<defs>
<linearGradient id="gBrand" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#200122"/><stop offset="1" stop-color="#6F0000"/></linearGradient>
<symbol id="i-logo" viewBox="0 0 24 24"><path fill="currentColor" d="M10.2 3.2C6.4 3.2 4 6.8 4 11.6s2.5 9.2 6.3 9.2c2.2 0 3.1-1.5 3.1-3.6v-1.6c0-1.5-1.5-2-1.5-3.2s1.5-1.6 1.5-3V6.8c0-2.2-1-3.6-3.2-3.6z"/><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M16 7.2c2.4 0 4.4 2.1 4.4 4.8s-2 4.8-4.4 4.8"/></symbol>
<symbol id="i-res" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c.9-3.8 3.8-5.8 7.5-5.8s6.6 2 7.5 5.8"/></g></symbol>
<symbol id="i-doc" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3v6a4 4 0 0 0 8 0V3"/><path d="M10 13v2a5 5 0 0 0 10 0v-2"/><circle cx="20" cy="11" r="2"/></g></symbol>
<symbol id="i-bhw" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M12 13v5M9.5 15.5h5"/></g></symbol>
<symbol id="i-cho" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V9l8-5 8 5v11"/><path d="M9 20v-6h6v6"/><path d="M2 20h20"/></g></symbol>
<symbol id="i-flask" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6M10 3v6L4.5 18.5A1.8 1.8 0 0 0 6 21h12a1.8 1.8 0 0 0 1.5-2.5L14 9V3"/><path d="M7 15h10"/></g></symbol>
<symbol id="i-pin" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/></g></symbol>
<symbol id="i-check"viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M5 12.5l4.5 4.5L19 7.5"/></symbol>
<symbol id="i-x" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/></symbol>
<symbol id="i-alert" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17.2v.1"/></g></symbol>
<symbol id="i-up" viewBox="0 0 24 24"><path fill="currentColor" d="M12 5l7 11H5z"/></symbol>
<symbol id="i-dot" viewBox="0 0 24 24"><circle cx="12" cy="12" r="6" fill="currentColor"/></symbol>
<symbol id="i-dia" viewBox="0 0 24 24"><path fill="currentColor" d="M12 4l7 8-7 8-7-8z"/></symbol>
<symbol id="i-moon" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></symbol>
<symbol id="i-sun" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></g></symbol>
<symbol id="i-menu" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" d="M4 7h16M4 12h16M4 17h16"/></symbol>
<symbol id="i-chev" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6"/></symbol>
<symbol id="i-arrow" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M13 6l6 6-6 6"/></symbol>
<symbol id="i-back" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M19 12H5M11 6l-6 6 6 6"/></symbol>
<symbol id="i-chat" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" d="M4 5h16v11H9l-5 4z"/></symbol>
<symbol id="i-play" viewBox="0 0 24 24"><path fill="currentColor" d="M8 5v14l11-7z"/></symbol>
<symbol id="i-clock" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></g></symbol>
</defs>`

export default function Sprite() {
  return <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" dangerouslySetInnerHTML={{ __html: SYMBOLS }} />
}
