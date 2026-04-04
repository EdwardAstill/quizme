const content = `## [info] Look at this
:::
:::diagram.png
:::
`;

console.log("Content with visible newlines:");
console.log(JSON.stringify(content));

const regex = /^:::\s*(\S+)\s*$/gm;

const lines = content.split('\n');
console.log("\nLines:");
lines.forEach((line, i) => console.log(`  ${i}: "${line}"`));

console.log("\nMatching each line individually:");
lines.forEach((line, i) => {
  const match = line.match(/^:::\s*(\S+)\s*$/);
  if (match) {
    console.log(`  Line ${i} matches: captures "${match[1]}"`);
  }
});

console.log("\nUsing replace with gm flags:");
const result = content.replace(/^:::\s*(\S+)\s*$/gm, (full, filename) => {
  console.log(`  Full match: "${full}", captures: "${filename}"`);
  return `![${filename}](/quiz-images/${filename})`;
});
console.log("\nResult:");
console.log(result);
