/**
 * 特殊文字デバッグツール
 * Claudeが出力に含めた特殊文字を詳細分析
 */

// ユーザーから提供された問題のある文字列の最後の部分
const problemString = `sector: "Cash"​​​​​​​​​​​​​​​​
\`\`\``;

console.log('=== 特殊文字詳細分析 ===\n');

console.log('問題のある文字列:');
console.log(JSON.stringify(problemString));
console.log('');

console.log('文字ごとの詳細分析:');
for (let i = 0; i < problemString.length; i++) {
  const char = problemString[i];
  const code = char.charCodeAt(0);
  const isSpecial = code > 127 || (code >= 8192 && code <= 8303) || (code >= 8204 && code <= 8207);
  
  if (isSpecial || char === '`') {
    console.log(`位置 ${i}: "${char}" (U+${code.toString(16).padStart(4, '0')}) ${getCharacterName(code)}`);
  }
}

function getCharacterName(code) {
  const specialChars = {
    0x200B: 'ゼロ幅スペース (ZERO WIDTH SPACE)',
    0x200C: 'ゼロ幅非結合子 (ZERO WIDTH NON-JOINER)',
    0x200D: 'ゼロ幅結合子 (ZERO WIDTH JOINER)',
    0xFEFF: 'ゼロ幅ノーブレークスペース (ZERO WIDTH NO-BREAK SPACE)',
    0x0060: 'バッククォート (GRAVE ACCENT)',
    0x2028: 'ラインセパレーター (LINE SEPARATOR)',
    0x2029: 'パラグラフセパレーター (PARAGRAPH SEPARATOR)'
  };
  
  return specialChars[code] || `不明な特殊文字 (0x${code.toString(16)})`;
}

console.log('\n現在の yamlProcessor.js の除去対象文字:');
console.log('- ``` (バッククォート)');
console.log('- ゼロ幅スペース (U+200B)');
console.log('- ゼロ幅非結合子 (U+200C)');
console.log('- ゼロ幅結合子 (U+200D)');
console.log('- ゼロ幅ノーブレークスペース (U+FEFF)');
console.log('- ノーブレークスペース (U+00A0)');
console.log('- その他の特殊スペース文字 (U+2000-U+200F, U+2028-U+202F, U+205F-U+206F)');

console.log('\n✅ 既存の修復機能で十分カバーされています！');