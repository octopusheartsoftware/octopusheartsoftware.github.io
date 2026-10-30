/* Octopus Heart "Send feedback" panel for plain web apps and games (no build step, no other files needed).
   It follows the feedback protocol in shared/feedback-service: a short form that sends straight to the business
   inbox, plus the support address with Copy and "Open my email app" for people who'd rather write an email.
   Either way the subject is "<App> feedback (v<version>): <Type>", so the daily support digest picks it up.

   Use:  <script src="oh-feedback.js"></script>
         OHFeedback.open({ app: 'Bar by Bar', version: '0.1' });
   The app name must also be listed in APPS in shared/feedback-service/worker.js, or the form can't send
   (it then offers the email route instead).

   Colors follow the brand kit when brand.css is on the page. A game with its own look can set
   --ohfb-bg, --ohfb-ink, --ohfb-muted, --ohfb-accent, --ohfb-on-accent, --ohfb-line and --ohfb-font on :root. */
(() => {
  const EMAIL = 'support@octopusheartsoftware.com';
  const FEEDBACK_URL = 'https://feedback.octopusheartsoftware.com/';
  const KINDS = [['Bug', 'Something went wrong'], ['Idea', 'I have an idea'], ['Other', 'Something else']];

  const CSS = `
  dialog.ohfb { --bg: var(--ohfb-bg, var(--surface-raised, #fff)); --ink: var(--ohfb-ink, var(--ink, #0f2a3d)); --muted: var(--ohfb-muted, var(--ink-muted, #4d6475));
    --accent: var(--ohfb-accent, var(--ocean, #0b67ad)); --on-accent: var(--ohfb-on-accent, var(--on-ocean, #fff)); --line: var(--ohfb-line, var(--line, #cfdde8));
    width: min(440px, calc(100vw - 32px)); max-height: calc(100dvh - 32px); overflow-y: auto; margin: auto; padding: 20px; box-sizing: border-box;
    border: 0; border-radius: 16px; background: var(--bg); color: var(--ink); font-family: var(--ohfb-font, var(--font-sans, system-ui, "Segoe UI", sans-serif));
    font-size: 16px; line-height: 1.45; text-align: left; box-shadow: 0 6px 30px rgba(0, 0, 0, .25); }
  dialog.ohfb::backdrop { background: rgba(0, 0, 0, .45); }
  .ohfb form { display: flex; flex-direction: column; gap: 10px; margin: 0; }
  .ohfb h2 { margin: 0; font-size: 20px; line-height: 1.3; font-family: var(--ohfb-font, var(--font-display, inherit)); font-weight: 600; color: var(--ink); }
  .ohfb p { margin: 0; max-width: none; color: var(--ink); }
  .ohfb .ohfb-small { font-size: 14px; line-height: 1.4; }
  .ohfb .ohfb-muted { color: var(--muted); }
  .ohfb fieldset { border: 0; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px; }
  .ohfb legend, .ohfb .ohfb-label { font-size: 14px; font-weight: 600; margin: 0 0 4px; padding: 0; color: var(--ink); }
  .ohfb .ohfb-kind { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border: 1.5px solid var(--line); border-radius: 999px; cursor: pointer; font-size: 15px; }
  .ohfb .ohfb-kind:has(input:checked) { border-color: var(--accent); box-shadow: inset 0 0 0 1px var(--accent); }
  .ohfb .ohfb-kind input { accent-color: var(--accent); margin: 0; }
  .ohfb textarea, .ohfb input[type="email"] { width: 100%; box-sizing: border-box; font: inherit; font-size: 16px; color: var(--ink); background: transparent;
    border: 1.5px solid var(--muted); border-radius: 10px; padding: 8px 10px; }
  .ohfb textarea { min-height: 110px; resize: vertical; }
  .ohfb .ohfb-hp { position: absolute; left: -9999px; width: 1px; height: 1px; }
  .ohfb .ohfb-status { font-size: 14px; color: var(--ink); }
  .ohfb .ohfb-status.bad { font-weight: 600; }
  .ohfb .ohfb-actions { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
  .ohfb .ohfb-actions button { font: inherit; font-weight: 600; font-size: 16px; padding: 9px 18px; border-radius: 10px; cursor: pointer; min-height: 44px;
    border: 1.5px solid var(--line); background: transparent; color: var(--ink); }
  .ohfb .ohfb-actions button.ohfb-primary { background: var(--accent); border-color: var(--accent); color: var(--on-accent); }
  .ohfb .ohfb-actions button:disabled { opacity: .6; cursor: default; }
  .ohfb .ohfb-email { border-top: 1px solid var(--line); padding-top: 10px; display: flex; flex-direction: column; gap: 4px; }
  .ohfb .ohfb-link { font: inherit; font-size: 14px; color: var(--accent); background: none; border: 0; padding: 0; text-decoration: underline; cursor: pointer; min-height: 0; }
  .ohfb a { color: var(--accent); }
  .ohfb :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }`;

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function deviceInfo() {
    const ua = navigator.userAgent;
    const os = /CrOS/.test(ua) ? 'ChromeOS' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Unknown OS';
    const browser = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'browser';
    const touch = navigator.maxTouchPoints > 0 ? ' · touch screen' : '';
    return `${os} · ${browser} · window ${innerWidth}×${innerHeight}${touch}`;
  }

  function open({ app, version = '?', intro } = {}) {
    if (!document.getElementById('ohfb-style')) {
      const s = document.createElement('style');
      s.id = 'ohfb-style';
      s.textContent = CSS;
      document.head.appendChild(s);
    }
    document.querySelector('dialog.ohfb')?.remove();
    const d = document.createElement('dialog');
    d.className = 'ohfb';
    document.body.appendChild(d);

    const body = (kind, message = '') => [message, '', '---', 'Please keep the lines below; they help us fix problems.', `App: ${app} ${version}`, `Type: ${kind}`, `Device: ${deviceInfo()}`].join('\n');
    const mailto = (kind, message) => `mailto:${EMAIL}?subject=${encodeURIComponent(`${app} feedback (v${version}): ${kind}`)}&body=${encodeURIComponent(body(kind, message))}`;

    d.innerHTML = `<form novalidate>
      <h2>Send feedback</h2>
      <p>${esc(intro || `Thanks for trying ${app}! Tell us what happened or what you'd like. We read every message.`)}</p>
      <fieldset><legend>What's it about?</legend>
        ${KINDS.map(([k, label], i) => `<label class="ohfb-kind"><input type="radio" name="kind" value="${k}"${i === 0 ? ' checked' : ''}><span>${label}</span></label>`).join('')}</fieldset>
      <label class="ohfb-label" for="ohfbMessage">Your message</label>
      <textarea id="ohfbMessage" rows="5" maxlength="3000" placeholder="What happened, or what's your idea?"></textarea>
      <label class="ohfb-label" for="ohfbEmail">Your email, if you'd like a reply <span class="ohfb-muted">(optional)</span></label>
      <input id="ohfbEmail" type="email" maxlength="200" autocomplete="email" placeholder="you@example.com">
      <p class="ohfb-small ohfb-muted">Under 13? Ask a grown-up before adding an email. We only use it to answer this message, then delete it.</p>
      <input class="ohfb-hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      <p class="ohfb-status" role="status" hidden></p>
      <div class="ohfb-actions"><button type="button" data-close>Close</button><button type="submit" class="ohfb-primary">Send</button></div>
      <div class="ohfb-email">
        <p class="ohfb-small"><b>Rather use email?</b> Write to <b>${EMAIL}</b></p>
        <p class="ohfb-small"><button type="button" class="ohfb-link" data-copy-address>Copy the address</button> · <a data-mailto href="${mailto('Other', '')}">Open my email app</a></p>
        <p class="ohfb-status ohfb-copied" role="status" hidden></p>
      </div>
      <p class="ohfb-small ohfb-muted">Along with your message we send the app version and your type of device and browser, so we can find problems. Nothing else.</p>
    </form>`;

    const form = d.querySelector('form'), status = form.querySelector('.ohfb-status'), send = form.querySelector('[type="submit"]');
    const msg = form.querySelector('#ohfbMessage'), email = form.querySelector('#ohfbEmail');
    const kind = () => form.querySelector('[name="kind"]:checked').value;
    const say = (text, bad) => { status.hidden = false; status.textContent = text; status.classList.toggle('bad', !!bad); };
    const copied = form.querySelector('.ohfb-copied');
    const copy = async (text, done) => {
      copied.hidden = false;
      try { await navigator.clipboard.writeText(text); copied.textContent = done; } catch { copied.textContent = "Couldn't copy. You can select the text and copy it yourself."; }
    };
    // Keep the email link up to date, so it carries whatever has been typed.
    const sync = () => { form.querySelector('[data-mailto]').href = mailto(kind(), msg.value); };
    form.addEventListener('input', sync);
    form.addEventListener('change', sync);
    form.querySelector('[data-close]').onclick = () => d.close();
    form.querySelector('[data-copy-address]').onclick = () => copy(EMAIL, 'Email address copied.');
    d.addEventListener('close', () => d.remove());

    form.onsubmit = async (e) => {
      e.preventDefault();
      const message = msg.value.trim(), reply = email.value.trim();
      if (!message) { say('Please write a message first.', true); msg.focus(); return; }
      if (reply && !email.checkValidity()) { say("That email address doesn't look quite right. Fix it, or leave it empty.", true); email.focus(); return; }
      send.disabled = true;
      say('Sending…');
      try {
        const res = await fetch(FEEDBACK_URL, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ app, version, kind: kind(), message, replyTo: reply, device: deviceInfo(), website: form.website.value }),
        });
        if (!res.ok) throw new Error(String(res.status));
        form.innerHTML = `<h2>Thank you!</h2><p>Your message is on its way to us.${reply ? " If you asked a question, we'll reply by email." : ''}</p>
          <div class="ohfb-actions"><button type="button" class="ohfb-primary" data-close>Done</button></div>`;
        form.querySelector('[data-close]').onclick = () => d.close();
      } catch {
        send.disabled = false;
        say("We couldn't send that just now (maybe you're offline). Your message is still here: try again, or use \"Open my email app\" below to email it to us.", true);
      }
    };

    d.showModal();
    if (!matchMedia('(pointer: coarse)').matches) msg.focus(); // on phones, don't pop the keyboard up straight away
  }

  window.OHFeedback = { open };
})();
