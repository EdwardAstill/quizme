const content = `## [info] Look at this
:::
:::diagram.png
:::
`;

const regex = /^:::\s*(\S+)\s*$/gm;

let matches = [];
let match;
while ((match = regex.exec(content)) !== null) {
  console.log(`Match at index ${match.index}: "${match[0]}" -> captures "${match[1]}"`);
  matches.push(match[1]);
}

console.log("\nReplacement result:");
const result = content.replace(/^:::\s*(\S+)\s*$/gm, (full, filename) => {
  console.log(`  Replacing "${full}" with filename="${filename}"`);
  return `![${filename}](/quiz-images/${filename})`;
});
console.log(result);
