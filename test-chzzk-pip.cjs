const fs = require('fs');

const SCRIPT = fs.readFileSync('chzzk-auto-pip.user.js', 'utf8');

const CHZZK = 'https://chzzk.naver.com';
const OTHER = 'https://example.com/page';

let passed = 0;
let failed = 0;

function extract(name) {
    const idx = SCRIPT.indexOf(`function ${name}(`);
    if (idx < 0) {
        throw new Error('missing ' + name);
    }

    let depth = 0;
    let started = false;

    for (let i = idx; i < SCRIPT.length; i += 1) {
        const ch = SCRIPT[i];

        if (ch === '{') {
            depth += 1;
            started = true;
        } else if (ch === '}') {
            depth -= 1;

            if (started && depth === 0) {
                return SCRIPT.slice(idx, i + 1);
            }
        }
    }

    throw new Error('unterminated ' + name);
}

function ok(name, condition, detail) {
    if (condition) {
        passed += 1;
        console.log('ok  ', name);
    } else {
        failed += 1;
        console.log('FAIL', name, detail === undefined ? '' : detail);
    }
}

function eq(name, actual, expected) {
    ok(name, actual === expected, `${actual} (expected ${expected})`);
}

const names = ['resolveExternalUrl', 'isActive', 'shouldHijack'];

const mod = new Function(
    'document',
    `${names.map(extract).join('\n\n')}
    return { resolveExternalUrl, isActive, shouldHijack };`
)(
    {
        pictureInPictureElement: null
    }
);

const { resolveExternalUrl, isActive, shouldHijack } = mod;

// 앵커 흉내. jsdom 없이 URL 판정만 검증한다.
function anchor(props = {}) {
    return {
        getAttribute(name) {
            if (name === 'href') {
                return props.href === undefined ? null : props.href;
            }
            return null;
        },
        hasAttribute(name) {
            return Boolean(props[name]);
        },
        target: props.target,
        relList: { contains: rel => Boolean(props.rel && props.rel.includes(rel)) },
        get href() {
            return new URL(props.href, props.base || CHZZK).href;
        }
    };
}

const playing = { paused: false, ended: false, readyState: 4 };
const paused = { paused: true, ended: false, readyState: 4 };
const buffering = { paused: false, ended: false, readyState: 1 };

// isActive
eq('playing is active', isActive(playing), true);
eq('paused is not active', isActive(paused), false);
eq('buffering is not active', isActive(buffering), false);
eq('null is not active', isActive(null), false);

// resolveExternalUrl
eq('external link resolved', resolveExternalUrl(anchor({ href: OTHER }), CHZZK), OTHER);
eq('internal link skipped', resolveExternalUrl(anchor({ href: `${CHZZK}/live/xyz` }), CHZZK), null);
eq('hash link skipped', resolveExternalUrl(anchor({ href: '#chat' }), CHZZK), null);
eq('mailto skipped', resolveExternalUrl(anchor({ href: 'mailto:a@b.com' }), CHZZK), null);
eq('relative internal skipped', resolveExternalUrl(anchor({ href: '/live/abc' }), CHZZK), null);
eq('http external ok', resolveExternalUrl(anchor({ href: 'http://example.org/x' }), CHZZK), 'http://example.org/x');
eq('javascript skipped', resolveExternalUrl(anchor({ href: 'javascript:void(0)' }), CHZZK), null);
eq('null href skipped', resolveExternalUrl(anchor({}), CHZZK), null);

// shouldHijack
const on = { settings: { enabled: true, openInNewTab: true }, base: CHZZK };
const off = { settings: { enabled: false, openInNewTab: true }, base: CHZZK };

eq('hijacks external link while playing',
    shouldHijack(anchor({ href: OTHER }), playing, on), true);
eq('skips when disabled',
    shouldHijack(anchor({ href: OTHER }), playing, off), false);
eq('skips when not playing',
    shouldHijack(anchor({ href: OTHER }), paused, on), false);
eq('skips internal link',
    shouldHijack(anchor({ href: `${CHZZK}/live/abc` }), playing, on), false);
eq('skips target blank',
    shouldHijack(anchor({ href: OTHER, target: '_blank' }), playing, on), false);
eq('skips download link',
    shouldHijack(anchor({ href: OTHER, download: 'x' }), playing, on), false);
eq('skips rel external',
    shouldHijack(anchor({ href: OTHER, rel: 'external' }), playing, on), false);
eq('skips target self explicitly',
    shouldHijack(anchor({ href: OTHER, target: '_self' }), playing, on), true);

// openInNewTab 를 끄면 가로채기가 통째로 꺼져야 한다. 링크 클릭만 무력화되고
// shouldHijack 가 true 를 돌려주면 onDocumentClick 쪽에서 조용히 return 해서
// 어차피 아무 일도 안 하기 때문이다.
const noTab = { settings: { enabled: true, openInNewTab: false }, base: CHZZK };

eq('skips when new tab is off',
    shouldHijack(anchor({ href: OTHER }), playing, noTab), false);

console.log('');
console.log(`total: ${passed + failed}, passed: ${passed}, failed: ${failed}`);

if (failed > 0) {
    process.exit(1);
}
