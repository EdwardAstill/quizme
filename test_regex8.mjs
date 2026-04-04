const testStr = ":::\n:::diagram.png";

console.log("Test string:", JSON.stringify(testStr));
console.log("Does \\S+ match newline? Testing with pattern /\\S+/");

const match = testStr.match(/\S+/);
console.log(`First \\S+ match: "${match[0]}" (length: ${match[0].length})`);

// Test the full pattern
console.log("\nTesting /^:::\\s*(\\S+)\\s*$/m");
const regex = /^:::\s*(\S+)\s*$/m;
const match2 = testStr.match(regex);
if (match2) {
  console.log(`Match: "${match2[0]}"`);
  console.log(`Captured: "${match2[1]}"`);
} else {
  console.log("No match");
}
