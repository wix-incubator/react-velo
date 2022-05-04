import ts from 'typescript';
import fs from 'fs';

const isTsFile = (fullPath: string): boolean => {
    return fullPath.endsWith('ts') || fullPath.endsWith('tsx');
};

const getFileName = (fullPath: string): string => {
    return fullPath.replace(/^.*[\\/]/, "");
};

const getTestMainDir = (suffix: string) => __dirname + `/../testTypes/generated/react-velo/` + suffix;

const generateTsConfigForFile = (filepath: string) => `{
  "compilerOptions": {
    "files": ["${filepath}"],
    "target": "ES2019",
      "module": "ES6",
      "lib": [
        "ES2019",
        "DOM"
      ],
      "moduleResolution": "node",
      "outDir": "./dist",
      "jsx": "react",
      "strict": true,
      "esModuleInterop": true,
      "forceConsistentCasingInFileNames": true,
      "skipLibCheck": true,
      "sourceMap": true
  }
}`;

export class TypescriptCompiler {
    constructor(private identifier: string) {}

    cleanup = () => {
        const dir = getTestMainDir(this.identifier);
        try {
            fs.rmdirSync(dir, { recursive: true });
        } catch (e) {
            console.error(`Cannot delete dir ${dir}`, e);
        }

    }

    setupReactVeloTest = (content: string) => {
        const formattedTestName = expect.getState().currentTestName.toLowerCase().replace(/ /g, '-');
        const testDir = `${getTestMainDir(this.identifier)}/${formattedTestName}`;
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }
        const sourcePath = testDir + '/code.tsx';
        fs.writeFileSync(sourcePath, content);
        const tsconfigFile = testDir + `/tsconfig.json`;
        fs.writeFileSync(tsconfigFile, generateTsConfigForFile(sourcePath));
        return {
            sourcePath,
            tsconfigFile,
        }
    }


    compile(configFile: string): void | never {
        const compilerErrors: string[] = [];
        const host: ts.ParseConfigFileHost = ts.sys as any;
        const parsedCmd = ts.getParsedCommandLineOfConfigFile(
            configFile,
            undefined,
            host
        );

        if (!parsedCmd) {
            throw new Error("Failed to compile the given tsconfig.json");
        }

        const { options, fileNames } = parsedCmd;

        const program = ts.createProgram({
            rootNames: fileNames,
            options
        });
        const jsFiles = fileNames.filter(isTsFile);
        if (jsFiles.length === 0) {
            throw new Error("No JS files to compile");
        }

        const emitResult = program.emit(undefined, undefined, undefined, undefined, {
            before: [],
            after: [],
            afterDeclarations: []
        });

        ts.getPreEmitDiagnostics(program)
            .concat(emitResult.diagnostics)
            .forEach(diagnostic => {
                let msg = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
                if (diagnostic.file && diagnostic.start) {
                    const {
                        line,
                        character
                    } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
                    msg = `${getFileName(diagnostic.file.fileName)} (${line +
                    1},${character + 1}): ${msg}`;
                }
                compilerErrors.push(msg);
            });

        if (compilerErrors.length > 0) {
            throw new Error(compilerErrors.toString());
        }
    }
}
