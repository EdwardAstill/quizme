const content = `:::
:::diagram.png
:::`;

const patterns = [
  { name: ".+", pattern: /^:::(.+)$/gm },
  { name: "\\s*(\\S+)\\s* (gm)", pattern: /^:::\s*(\S+)\s*$/gm },
  { name: "\\s*(.+?)\\s* (gm)", pattern: /^:::\s*(.+?)\s*$/gm },
  { name: "[ ]*(\\S+)[ ]* (gm)", pattern: /^:::[ ]*(\S+)[ ]*$/gm },
];

patterns.forEach(({name, pattern}) => {
  const copy = new RegExp(pattern.source, pattern.flags);
  let match;
  const matches = [];
  while ((match = copy.exec(content)) !== null) {
    matches.push(match[1]);
  }
  if (matches.length > 0) {
    console.log(name.padEnd(25) + ` -> ${JSON.stringify(matches)}`);
  } else {
    console.log(name.padEnd(25) + " -> NO MATCH");
  }
});
