// The line structure is: :::filename
// We want to capture just the filename part, trimming whitespace

const testLines = [
  ":::diagram.png",
  ":::diagram.png ",
  ":::  diagram.png",
  ":::  diagram.png  ",
  ":::",
];

// Original regex
const oldRegex = /^:::(.+)$/;
// Proposed new regex - should match lines with ::: followed by optional spaces, then non-space chars, then optional spaces
const newRegex = /^:::\s*(\S+)\s*$/;

testLines.forEach(line => {
  console.log(`\nLine: "${line}"`);
  const oldMatch = line.match(oldRegex);
  const newMatch = line.match(newRegex);
  console.log(`  Old captures: ${oldMatch ? JSON.stringify(oldMatch[1]) : "no match"}`);
  console.log(`  New captures: ${newMatch ? JSON.stringify(newMatch[1]) : "no match"}`);
});
