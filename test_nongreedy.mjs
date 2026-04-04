const input = `:::diagram.png `;

const patterns = [
  { name: ".+", pattern: /^:::(.+)$/ },
  { name: "\\s*(\\S+)\\s*", pattern: /^:::\s*(\S+)\s*$/ },
  { name: "\\s*(.+?)\\s*", pattern: /^:::\s*(.+?)\s*$/ },
  { name: "[ ]*(\\S+)[ ]*", pattern: /^:::[ ]*(\S+)[ ]*$/ },
];

patterns.forEach(({name, pattern}) => {
  const match = input.match(pattern);
  if (match) {
    console.log(name.padEnd(20) + ` -> "${match[1]}"`);
  } else {
    console.log(name.padEnd(20) + " -> NO MATCH");
  }
});
