const testStr = `:::
:::diagram.png
:::`;

console.log("Original pattern /^:::\\s*(\\S+)\\s*$/gm:");
const regex1 = /^:::\s*(\S+)\s*$/gm;
let count = 0;
let match;
const copy1 = /^:::\s*(\S+)\s*$/gm;
while ((match = copy1.exec(testStr)) !== null) {
  console.log(`  Match ${++count}: "${match[0]}" -> "${match[1]}"`);
}

console.log("\nFixed pattern /^:::[ ]*(\\S+)[ ]*$/gm (space instead of \\s):");
const copy2 = /^:::[ ]*(\S+)[ ]*$/gm;
count = 0;
while ((match = copy2.exec(testStr)) !== null) {
  console.log(`  Match ${++count}: "${match[0]}" -> "${match[1]}"`);
}
