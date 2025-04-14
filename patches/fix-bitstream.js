const fs = require('fs');
const path = require('path');

// Read the original file
const filePath = path.join(__dirname, '..', 'node_modules', 'lamejs', 'src', 'js', 'BitStream.js');
let content = fs.readFileSync(filePath, 'utf8');

// Remove any existing BitStream.EQ and BitStream.NEQ definitions
content = content.replace(/BitStream\.EQ\s*=\s*function[\s\S]*?};/g, '');
content = content.replace(/BitStream\.NEQ\s*=\s*function[\s\S]*?};/g, '');

// Define the static methods to be placed before the class
const staticMethods = `
// Static methods defined before the class
BitStream.EQ = function (a, b) {
    if (a > b) {
        return Math.abs(a - b) <= (Math.abs(a) * 1e-6);
    }
    return Math.abs(a - b) <= (Math.abs(b) * 1e-6);
};

BitStream.NEQ = function (a, b) {
    return !BitStream.EQ(a, b);
};
`;

// Find the position right before the BitStream class definition
const classPos = content.indexOf('function BitStream()');
const insertPos = content.lastIndexOf('\n', classPos);

// Insert the static methods before the class definition
content = content.slice(0, insertPos) + staticMethods + content.slice(insertPos);

// Add instance methods inside the class
const instanceMethods = `
    // Instance methods that mirror the static methods
    this.EQ = function(a, b) {
        if (a > b) {
            return Math.abs(a - b) <= (Math.abs(a) * 1e-6);
        }
        return Math.abs(a - b) <= (Math.abs(b) * 1e-6);
    };

    this.NEQ = function(a, b) {
        return !this.EQ(a, b);
    };
`;

content = content.replace(/function BitStream\(\) {[\s\S]*?var self = this;/, 'function BitStream() {\n    var self = this;' + instanceMethods);

// Write the modified content back to the file
fs.writeFileSync(filePath, content, 'utf8'); 