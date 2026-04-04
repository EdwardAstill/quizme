const testStr = `:::
:::diagram.png
:::`;

console.log("Without multiline flag: /^:::\\s*(\\S+)\\s*$/g");
const regex1 = /^:::\s*(\S+)\s*$/g;
let match;
const copy1 = /^:::\s*(\S+)\s*$/g;
while ((match = copy1.exec(testStr)) !== null) {
  console.log(`  Match: "${match[0]}" -> "${match[1]}"`);
}
if (!match) {
  console.log("  (no matches)");
}
