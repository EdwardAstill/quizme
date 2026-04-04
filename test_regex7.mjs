const content = `:::
:::diagram.png
:::`;

console.log("Testing multiline matching:");
const regex = /^:::\s*(\S+)\s*$/gm;

const matches = [];
let match;
const regexCopy = /^:::\s*(\S+)\s*$/gm;
while ((match = regexCopy.exec(content)) !== null) {
  console.log(`Match: "${match[0]}" at index ${match.index}`);
  console.log(`  Captured: "${match[1]}"`);
  console.log(`  Match length: ${match[0].length}`);
  matches.push(match);
}
