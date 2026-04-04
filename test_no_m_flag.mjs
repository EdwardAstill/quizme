const content = `---
title: Test
---

## [info] Look at this
:::
:::diagram.png
:::
`;

function replaceLocalImages_WithM(content) {
  return content.replace(/^:::\s*(\S+)\s*$/gm, (_, filename) => `![${filename}](/quiz-images/${filename})`);
}

function replaceLocalImages_NoM(content) {
  return content.replace(/^:::\s*(\S+)\s*$/g, (_, filename) => `![${filename}](/quiz-images/${filename})`);
}

console.log("WITH m flag:");
console.log(replaceLocalImages_WithM(content));

console.log("\nWITHOUT m flag:");
console.log(replaceLocalImages_NoM(content));
