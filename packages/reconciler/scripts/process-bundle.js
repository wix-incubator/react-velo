// I want to replace the shell's sed:
// && sed -i '' 's/Lu(\"react\")/React/g' ./dist/react-velo-bundle.js
// with a deterministic code, since 'Lu', the minified require function's name, is changing
const fs = require('fs').promises;
const path = require('path');

function getRequireFunctionName(source) {
    const regex = /var ([a-zA-Z0-9]+)=\([a-z]=>typeof require!="undefined"\?require:typeof Proxy!="undefined"\?new Proxy/;
    const match = regex.exec(source);
    if (!match || match.length < 2) {
        return undefined;
    }
    return match[1];
}

(async function main() {
    const bundleFile = path.resolve([process.cwd(), 'dist', process.argv[2]].join(path.sep));
    console.log(`CWD: ${process.cwd()} bundleFile: ${bundleFile}`);

    const bundle = await fs.readFile(bundleFile, 'utf8');
    console.log(`${typeof bundle} length: ${bundle.length}`);

    let requireFnName = getRequireFunctionName(bundle);
    console.log(`requireFnName: '${requireFnName}'`);
    if (!requireFnName) {
        console.warn('Could not find require function name, are you using cjs?');
        requireFnName = 'require';
    }

    const replaceRegex = new RegExp(`${requireFnName}\\("react"\\)`, 'g');
    let replaceCounter = 0;
    const newBundle = bundle.replace(replaceRegex, () => {
        replaceCounter++;
        return `reactVeloGlobals.ReactInstance`;
    });
    await fs.writeFile(bundleFile, newBundle, 'utf8');

    console.log(`Replaced ${replaceCounter} occurences of ${replaceRegex.toString()} in ${bundleFile}`);
}());
