const content = `---
title: Test
---

## [info] Look at this
:::
:::diagram.png
:::
`;

const oldRegex = /^:::(.+)$/gm;
const newRegex = /^:::\s*(\S+)\s*$/gm;

console.log("OLD REGEX RESULT:");
let result = content.replace(oldRegex, (_, filename) => {
  console.log(`  Captured: "${filename}"`);
  return `![${filename}](/quiz-images/${filename})`;
});

console.log("\nNEW REGEX RESULT:");
result = content.replace(newRegex, (_, filename) => {
  console.log(`  Captured: "${filename}"`);
  return `![${filename}](/quiz-images/${filename})`;
});
