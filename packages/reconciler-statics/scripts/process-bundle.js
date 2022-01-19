// I want to replace the shell's sed:
// && sed -i '' 's/Lu(\"react\")/React/g' ./dist/react-velo-bundle.js
// with a deterministic code, since 'Lu', the minified require function's name, is changing
const fs = require('fs').promises;
const path = require('path');

function getRequireFunctionName(source) {
    const regex = /var ([a-zA-Z0-9]+)=\(o=>typeof require!="undefined"\?require:typeof Proxy!="undefined"\?new Proxy/;
    const match = regex.exec(source);
    return match[1];
}

(async function main() {
    const bundleFile = path.resolve([process.cwd(), 'dist', 'react-velo-bundle.js'].join(path.sep));
    console.log(`CWD: ${process.cwd()} bundleFile: ${bundleFile}`);
    
    const bundle = await fs.readFile(bundleFile, 'utf8');
    console.log(`${typeof bundle} length: ${bundle.length}`);
    
    const requireFnName = getRequireFunctionName(bundle);
    console.log(`requireFnName: '${requireFnName}'`);
    if (!requireFnName) {
        throw new Error('Could not find require function name');
    }

    const replaceRegex = new RegExp(`${requireFnName}\\("react"\\)`, 'g');
    let replaceCounter = 0;
    const newBundle = bundle.replace(replaceRegex, () => {
        replaceCounter++;
        return `React`;
    });
    await fs.writeFile(bundleFile, newBundle, 'utf8');

    console.log(`Replaced ${replaceCounter} occurences of ${replaceRegex.toString()} in ${bundleFile}`);
}());