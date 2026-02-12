
const aggressiveQrRegex = /\{(<[^>]+>)*\{\s*(?:[iI][mM][aA][gG][eE]\s+)?(?:<[^>]+>)*[qQ](?:<[^>]+>)*[rR](?:<[^>]+>)*[cC]?[oO]?[dD]?[eE]?(?:<[^>]+>)*\s*\}(<[^>]+>)*\}/g;

const tests = [
    '{{QR}}',
    '{{qr}}',
    '{{  qr  }}',
    '{{IMAGE qr}}',
    '{{<w:t>q</w:t><w:t>r</w:t>}}',
    '{{<w:t>IMAGE </w:t><w:t>qr</w:t>}}',
    '{<xml>{qr}</xml>}'
];

tests.forEach(t => {
    console.log(`Test: "${t}" -> ${aggressiveQrRegex.test(t)}`);
    aggressiveQrRegex.lastIndex = 0; // Reset for 'g' flag
});
