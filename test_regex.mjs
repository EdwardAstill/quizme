const content = `---
title: Test
---

## [info] Look at this
:::
:::diagram.png
:::
`;

function replaceLocalImages(content) {
  return content.replace(/^:::\s*(\S+)\s*$/gm, (_, filename) => `![${filename}](/quiz-images/${filename})`);
}

const result = replaceLocalImages(content);
console.log("Input:");
console.log(content);
console.log("\nOutput:");
console.log(result);
