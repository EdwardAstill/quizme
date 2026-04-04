const input = `---
title: Test
---

## [info] Look at this
:::
:::diagram.png
:::
`;

function replaceLocalImages_Old(content) {
  return content.replace(/^:::(.+)$/gm, (_, filename) => `![${filename}](/quiz-images/${filename})`);
}

function replaceLocalImages_New(content) {
  return content.replace(/^:::\s*(\S+)\s*$/gm, (_, filename) => `![${filename}](/quiz-images/${filename})`);
}

console.log("OLD RESULT:");
const oldResult = replaceLocalImages_Old(input);
console.log(oldResult);
console.log("\nNEW RESULT:");
const newResult = replaceLocalImages_New(input);
console.log(newResult);
