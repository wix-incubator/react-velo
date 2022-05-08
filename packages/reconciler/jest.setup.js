var fs = require('fs');

function createTypesBundleForTests() {
    // Generates the types file with the whole content to allow testing the types generated in types/index.d.ts
    // in the context of the BlackJack game - https://shahar762.editorx.io/my-site-15
    const template = fs.readFileSync(__dirname + '/__tests__/testTypes/monaco-template.d.ts');
    const index = fs.readFileSync(__dirname + '/types/index.d.ts');
    try {
        const testDir = __dirname + '/__tests__/testTypes/generated/';
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, {recursive: true});
        }
        const targetFile = testDir + '/index.d.ts';
        fs.writeFileSync(targetFile, '// Generated by jest.setup.js (global setup for jest)\n\n\n');
        const indexOfDouble$w = template.indexOf('declare namespace $w {');
        if (indexOfDouble$w > 0) {
            fs.appendFileSync(targetFile, template.slice(0, indexOfDouble$w));
            fs.appendFileSync(targetFile, 'declare namespace $wBad { // there is a double declaration of $w this is instead ');
            fs.appendFileSync(targetFile, template.slice(indexOfDouble$w));
        } else {
            console.warn('Could not find the double "namespace $w" definitions, if tests fail, that might be the reason');
            fs.appendFileSync(targetFile, template);
        }
        const cutStart = index.indexOf('// VELO only - START');
        if (cutStart < 0) {
            console.error('"// VELO only - START" is missing in "types/index.d.ts" - did you delete it by mistake?')
            fs.appendFileSync(targetFile, index);
        } else {
            const cleanedBuffer = index.slice(0, cutStart);
            fs.appendFileSync(targetFile, cleanedBuffer);
        }
    } catch (err) {
        console.error(err);
    }
}

module.exports = async function () {
    createTypesBundleForTests();
}
