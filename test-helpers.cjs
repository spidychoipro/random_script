const fs = require('fs');
const src = fs.readFileSync('chatgpt-user-bubble-color.user.js', 'utf8');

function extract(name) {
    const idx = src.indexOf(`function ${name}(`);
    if (idx < 0) {
        throw new Error('missing ' + name);
    }
    let depth = 0;
    let started = false;
    for (let i = idx; i < src.length; i += 1) {
        const ch = src[i];
        if (ch === '{') {
            depth += 1;
            started = true;
        } else if (ch === '}') {
            depth -= 1;
            if (started && depth === 0) {
                return src.slice(idx, i + 1);
            }
        }
    }
    throw new Error('unterminated ' + name);
}

const names = [
    'clampAlpha',
    'normalizeHex',
    'hexToRgb',
    'toRgba',
    'relativeLuminance',
    'getTextColor'
];

const body = names.map(extract).join('\n\n');

const mod = new Function(
    `const DEFAULTS = { color: '#2B2D42', alpha: 100, enabled: true };
    ${body}
    return { normalizeHex, hexToRgb, toRgba, relativeLuminance, getTextColor, clampAlpha };`
)();

let failed = 0;

function t(actual, expected, name) {
    if (actual !== expected) {
        console.log('FAIL', name, '->', actual, 'expected', expected);
        failed += 1;
    } else {
        console.log('ok  ', name, '->', actual);
    }
}

t(mod.normalizeHex('2b2d42'), '#2B2D42', 'hex lowercase 6');
t(mod.normalizeHex('#abc'), '#AABBCC', 'hex 3 expands');
t(mod.normalizeHex('#12345'), null, 'invalid length');
t(mod.normalizeHex('zzzzzz'), null, 'non hex chars');
t(mod.normalizeHex(123), null, 'non string');
t(mod.normalizeHex('  #2B2D42  '), '#2B2D42', 'trims whitespace');
t(mod.toRgba('#2B2D42', 100), 'rgba(43, 45, 66, 1)', 'rgba alpha 100');
t(mod.toRgba('#2B2D42', 50), 'rgba(43, 45, 66, 0.5)', 'rgba alpha 50');
t(mod.toRgba('#2B2D42', 0), 'rgba(43, 45, 66, 0)', 'rgba alpha 0');
t(mod.getTextColor('#0B0B0F'), '#FFFFFF', 'text on dark bg');
t(mod.getTextColor('#FFD166'), '#101010', 'text on light bg');
t(mod.clampAlpha('120'), 100, 'alpha clamp high');
t(mod.clampAlpha('-5'), 0, 'alpha clamp low');
t(mod.clampAlpha('abc'), 100, 'alpha fallback');
t(mod.clampAlpha('40'), 40, 'alpha valid');

if (failed > 0) {
    console.log(`\n${failed} test(s) failed`);
    process.exit(1);
}

console.log('\nall helper tests passed');
