const fs = require('fs');
const { JSDOM } = require('jsdom');

const SCRIPT = fs.readFileSync('chatgpt-user-bubble-color.user.js', 'utf8');

const PAGE_HTML = `<!doctype html>
<html>
<head></head>
<body>
  <main>
    <article data-turn="user" data-turn-id="t1">
      <div data-message-author-role="user" class="group">
        <div class="whitespace-pre-wrap">first user message</div>
      </div>
    </article>
    <article data-turn="assistant" data-turn-id="t2">
      <div data-message-author-role="assistant">
        <div class="markdown prose">assistant reply</div>
      </div>
    </article>
    <article data-turn="user" data-turn-id="t3">
      <div data-message-author-role="user" class="group">
        <div class="whitespace-pre-wrap">second user message</div>
      </div>
    </article>
  </main>
</body>
</html>`;

const store = new Map();
let passed = 0;
let failed = 0;

function check(name, condition, detail) {
    if (condition) {
        passed += 1;
        console.log('ok  ', name);
    } else {
        failed += 1;
        console.log('FAIL', name, detail === undefined ? '' : detail);
    }
}

function waitForLoad(window) {
    return new Promise(resolve => {
        if (window.document.readyState === 'complete') {
            resolve();
            return;
        }
        window.addEventListener('load', () => resolve(), { once: true });
    });
}

function nextFrame(window) {
    return new Promise(resolve => {
        window.requestAnimationFrame(() => setTimeout(resolve, 20));
    });
}

async function main() {
    const dom = new JSDOM(PAGE_HTML, {
        runScripts: 'outside-only',
        pretendToBeVisual: true,
        url: 'https://chatgpt.com/'
    });

    const { window } = dom;
    const doc = window.document;

    window.GM_getValue = (key, fallback) => (store.has(key) ? store.get(key) : fallback);
    window.GM_setValue = (key, value) => store.set(key, value);
    window.GM_registerMenuCommand = () => {};

    await waitForLoad(window);
    window.eval(SCRIPT);

    const root = doc.documentElement;

    check('style injected', doc.getElementById('tm-user-bubble-style') !== null);
    check('panel container created', doc.getElementById('tm-bubble-customizer') !== null);
    check('toggle button created', doc.getElementById('tm-ub-toggle') !== null);

    const panel = doc.getElementById('tm-ub-panel');
    const toggle = doc.getElementById('tm-ub-toggle');

    check('panel hidden by default', !panel.classList.contains('open'));
    check('preset swatches rendered', doc.querySelectorAll('.tm-ub-swatch').length === 12,
        doc.querySelectorAll('.tm-ub-swatch').length);
    check('default color applied', root.style.getPropertyValue('--tm-ub-color') === '#2B2D42',
        root.style.getPropertyValue('--tm-ub-color'));
    check('default alpha applied', root.style.getPropertyValue('--tm-ub-alpha') === '100');
    check('default background applied',
        root.style.getPropertyValue('--tm-ub-bg') === 'rgba(43, 45, 66, 1)',
        root.style.getPropertyValue('--tm-ub-bg'));
    check('default fg applied', root.style.getPropertyValue('--tm-ub-fg') === '#FFFFFF',
        root.style.getPropertyValue('--tm-ub-fg'));
    check('enabled flag set', root.dataset.tmUbOff === 'false', root.dataset.tmUbOff);
    check('static selector alone styles modern DOM',
        doc.querySelectorAll('.tm-user-bubble-active').length === 0,
        doc.querySelectorAll('.tm-user-bubble-active').length);

    const styleText = doc.getElementById('tm-user-bubble-style').textContent;
    check('static selector uses role attribute',
        styleText.includes('[data-message-author-role="user"] .whitespace-pre-wrap'));
    check('static selector uses data-turn fallback',
        styleText.includes('[data-turn="user"] .markdown'));
    check('legacy selector kept', styleText.includes('.user-message-bubble-color'));

    toggle.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    check('panel opens on toggle click', panel.classList.contains('open'));
    check('aria-expanded true', toggle.getAttribute('aria-expanded') === 'true');

    doc.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    check('panel closes on outside click', !panel.classList.contains('open'));

    const colorInput = doc.getElementById('tm-ub-color');
    colorInput.value = '#ff0000';
    colorInput.dispatchEvent(new window.Event('input', { bubbles: true }));
    check('color picker updates css var',
        root.style.getPropertyValue('--tm-ub-color') === '#FF0000',
        root.style.getPropertyValue('--tm-ub-color'));
    check('color picker updates bg',
        root.style.getPropertyValue('--tm-ub-bg') === 'rgba(255, 0, 0, 1)',
        root.style.getPropertyValue('--tm-ub-bg'));
    check('light color switches text to dark',
        root.style.getPropertyValue('--tm-ub-fg') === '#101010',
        root.style.getPropertyValue('--tm-ub-fg'));
    check('color persisted', store.get('chatgpt-user-bubble-color').color === '#FF0000');

    const hexInput = doc.getElementById('tm-ub-hex');
    hexInput.value = '2ec4b6';
    hexInput.dispatchEvent(new window.Event('input', { bubbles: true }));
    check('short hex accepted', root.style.getPropertyValue('--tm-ub-color') === '#2EC4B6',
        root.style.getPropertyValue('--tm-ub-color'));

    hexInput.value = 'notacolor';
    hexInput.dispatchEvent(new window.Event('input', { bubbles: true }));
    check('invalid hex rejected', root.style.getPropertyValue('--tm-ub-color') === '#2EC4B6',
        root.style.getPropertyValue('--tm-ub-color'));
    check('invalid hex shows hint',
        doc.getElementById('tm-ub-status').textContent.includes('HEX'),
        doc.getElementById('tm-ub-status').textContent);

    const swatch = doc.querySelectorAll('.tm-ub-swatch')[3];
    swatch.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    check('preset swatch applies color',
        root.style.getPropertyValue('--tm-ub-color') === '#2EC4B6',
        root.style.getPropertyValue('--tm-ub-color'));

    const alphaSlider = doc.getElementById('tm-ub-alpha');
    alphaSlider.value = '40';
    alphaSlider.dispatchEvent(new window.Event('input', { bubbles: true }));
    check('alpha slider updates bg',
        root.style.getPropertyValue('--tm-ub-bg') === 'rgba(46, 196, 182, 0.4)',
        root.style.getPropertyValue('--tm-ub-bg'));
    check('alpha label updated',
        doc.getElementById('tm-ub-alpha-value').textContent === '40%',
        doc.getElementById('tm-ub-alpha-value').textContent);
    check('alpha persisted', store.get('chatgpt-user-bubble-color').alpha === 40);

    const actionButtons = doc.querySelectorAll('#tm-ub-actions button');
    check('enable/reset buttons rendered', actionButtons.length === 2, actionButtons.length);

    actionButtons[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    check('disable sets off flag', root.dataset.tmUbOff === 'true', root.dataset.tmUbOff);
    check('disable persists', store.get('chatgpt-user-bubble-color').enabled === false);
    check('disable label updates', actionButtons[0].textContent === '활성화',
        actionButtons[0].textContent);

    actionButtons[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    check('re-enable clears off flag', root.dataset.tmUbOff === 'false', root.dataset.tmUbOff);

    actionButtons[1].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    check('reset restores color', root.style.getPropertyValue('--tm-ub-color') === '#2B2D42',
        root.style.getPropertyValue('--tm-ub-color'));
    check('reset restores alpha', root.style.getPropertyValue('--tm-ub-alpha') === '100');
    check('reset restores alpha slider', alphaSlider.value === '100', alphaSlider.value);
    check('reset restores hex input', hexInput.value === '#2B2D42', hexInput.value);
    check('reset restores color input', colorInput.value === '#2b2d42', colorInput.value);

    doc.dispatchEvent(new window.KeyboardEvent('keydown', {
        key: 'c', altKey: true, shiftKey: true, bubbles: true
    }));
    check('shortcut opens panel', panel.classList.contains('open'));
    doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    check('escape closes panel', !panel.classList.contains('open'));

    const host = doc.querySelector('article[data-turn="user"] [data-message-author-role="user"]');
    const lateBubble = doc.createElement('div');
    lateBubble.className = 'whitespace-pre-wrap';
    lateBubble.textContent = 'new message';
    host.appendChild(lateBubble);

    await nextFrame(window);

    check('no duplicate UI after mutation',
        doc.querySelectorAll('#tm-ub-toggle').length === 1,
        doc.querySelectorAll('#tm-ub-toggle').length);
    check('no duplicate style tags',
        doc.querySelectorAll('#tm-user-bubble-style').length === 1,
        doc.querySelectorAll('#tm-user-bubble-style').length);
    check('late bubble covered by static selector',
        styleText.includes('[data-message-author-role="user"] .whitespace-pre-wrap'));

    await dragCase();

    console.log(`\nmain: ${passed} passed, ${failed} failed`);
}

async function dragCase() {
    const dragPage = `<!doctype html><html><head></head><body>
      <div data-turn="user"><div data-message-author-role="user">
        <div class="whitespace-pre-wrap">drag page</div>
      </div></div>
    </body></html>`;

    const dom = new JSDOM(dragPage, {
        runScripts: 'outside-only',
        pretendToBeVisual: true,
        url: 'https://chatgpt.com/'
    });

    const { window } = dom;
    const dragStore = new Map();
    window.GM_getValue = (key, fallback) => (dragStore.has(key) ? dragStore.get(key) : fallback);
    window.GM_setValue = (key, value) => dragStore.set(key, value);
    window.GM_registerMenuCommand = () => {};

    window.PointerEvent = class PointerEvent extends window.MouseEvent {
        constructor(type, init = {}) {
            super(type, init);
            this.pointerId = init.pointerId ?? 1;
        }
    };

    await waitForLoad(window);
    window.eval(SCRIPT);

    const doc = window.document;
    const button = doc.getElementById('tm-ub-toggle');
    const container = doc.getElementById('tm-bubble-customizer');

    const preColor = doc.getElementById('tm-ub-color');
    preColor.value = '#1B998B';
    preColor.dispatchEvent(new window.Event('input', { bubbles: true }));

    button.getBoundingClientRect = () => ({
        left: 100, top: 200, width: 42, height: 42, right: 142, bottom: 242, x: 100, y: 200
    });
    button.offsetWidth = 42;
    button.offsetHeight = 42;

    const pointer = (type, clientX, clientY) => new window.PointerEvent(type, {
        clientX, clientY, bubbles: true, pointerId: 1
    });

    button.dispatchEvent(pointer('pointerdown', 110, 210));
    button.dispatchEvent(pointer('pointermove', 300, 400));

    check('drag moves container', container.style.left === '290px' && container.style.top === '390px',
        `${container.style.left} / ${container.style.top}`);
    check('drag releases right/bottom anchor',
        container.style.right === 'auto' && container.style.bottom === 'auto');

    button.dispatchEvent(pointer('pointerup', 300, 400));

    const saved = dragStore.get('chatgpt-user-bubble-color');
    check('drag position persisted',
        saved.right === window.innerWidth - 142 && saved.bottom === window.innerHeight - 242,
        `${saved.right} / ${saved.bottom}`);
    check('drag does not clobber color', saved.color === '#1B998B', saved.color);

    const reloadDom = new JSDOM(dragPage, {
        runScripts: 'outside-only',
        pretendToBeVisual: true,
        url: 'https://chatgpt.com/'
    });
    const reloadWindow = reloadDom.window;
    const reloadStore = new Map([
        ['chatgpt-user-bubble-color', { ...saved, color: '#FF0000', alpha: 25, enabled: true }]
    ]);
    reloadWindow.GM_getValue = (key, fallback) =>
        (reloadStore.has(key) ? reloadStore.get(key) : fallback);
    reloadWindow.GM_setValue = (key, value) => reloadStore.set(key, value);
    reloadWindow.GM_registerMenuCommand = () => {};

    await waitForLoad(reloadWindow);
    reloadWindow.eval(SCRIPT);

    const reloadDoc = reloadDom.window.document;
    const reloadContainer = reloadDoc.getElementById('tm-bubble-customizer');

    check('position restored on reload', reloadContainer.style.right === `${saved.right}px`,
        reloadContainer.style.right);
    check('color restored on reload',
        reloadDoc.documentElement.style.getPropertyValue('--tm-ub-color') === '#FF0000',
        reloadDoc.documentElement.style.getPropertyValue('--tm-ub-color'));
    check('alpha restored on reload',
        reloadDoc.documentElement.style.getPropertyValue('--tm-ub-bg') === 'rgba(255, 0, 0, 0.25)',
        reloadDoc.documentElement.style.getPropertyValue('--tm-ub-bg'));

    reloadDoc.getElementById('tm-ub-actions').children[0]
        .dispatchEvent(new reloadWindow.MouseEvent('click', { bubbles: true }));
    check('disabled state restored on reload',
        reloadDoc.documentElement.dataset.tmUbOff === 'true',
        reloadDoc.documentElement.dataset.tmUbOff);
    check('disabled state reverts bubble styles',
        reloadDoc.getElementById('tm-user-bubble-style').textContent.includes('revert'));
}

async function legacyDomCase() {
    const legacy = `<!doctype html><html><head></head><body>
      <div data-message-author-role="user"><div class="user-message-bubble-color">legacy</div></div>
    </body></html>`;
    const dom = new JSDOM(legacy, { runScripts: 'outside-only', pretendToBeVisual: true });
    const { window } = dom;
    const storeB = new Map();
    window.GM_getValue = (key, fallback) => (storeB.has(key) ? storeB.get(key) : fallback);
    window.GM_setValue = (key, value) => storeB.set(key, value);
    window.GM_registerMenuCommand = () => {};

    await waitForLoad(window);
    window.eval(SCRIPT);

    check('legacy DOM matched by static selector',
        window.document.querySelectorAll('.tm-user-bubble-active').length === 0);

    const orphanPage = `<!doctype html><html><head></head><body>
      <div data-turn="user"><span data-msg="x">orphan turn</span></div>
    </body></html>`;
    const dom2 = new JSDOM(orphanPage, { runScripts: 'outside-only', pretendToBeVisual: true });
    const storeC = new Map();
    dom2.window.GM_getValue = (key, fallback) => (storeC.has(key) ? storeC.get(key) : fallback);
    dom2.window.GM_setValue = (key, value) => storeC.set(key, value);
    dom2.window.GM_registerMenuCommand = () => {};

    await waitForLoad(dom2.window);
    dom2.window.eval(SCRIPT);

    const tagged = dom2.window.document.querySelectorAll('.tm-user-bubble-active');
    check('fallback tags bubble when static selector misses', tagged.length === 1, tagged.length);
    check('fallback tags the content node',
        tagged[0] && tagged[0].getAttribute('data-msg') === 'x',
        tagged[0] ? tagged[0].tagName : 'none');
}

main()
    .then(legacyDomCase)
    .then(() => {
        console.log(`\ntotal: ${passed} passed, ${failed} failed`);
        process.exit(failed > 0 ? 1 : 0);
    })
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
