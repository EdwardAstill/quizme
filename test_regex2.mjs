const line = ":::diagram.png ";
const regex = /^:::\s*(\S+)\s*$/;
const match = line.match(regex);
console.log("Line:", JSON.stringify(line));
console.log("Matches:", !!match);
if (match) {
  console.log("Captured:", JSON.stringify(match[1]));
}
