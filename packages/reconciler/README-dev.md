# React Velo Development
`yarn run esbuild`
`yarn serve`

in velo:
```es6
import React, { useState } from 'react';
self.reactVeloGlobals =  {
  ReactInstance: React,
}
importScripts('http://localhost:9080/react-velo-bundle.js');
const {W, render} = reactVelo;

function App() {
  const [count, setCount] = useState(0);
  return (
    <>
		<W.counter label={`${count}`}/>
    	<W.increment onClick={() => setCount(count + 1)}/>
    	<W.decrement" onClick={() => setCount(count - 1)}/>
		{count % 10 === 0 ? <div id="box"/> : null}
    </>
  );
}

$w.onReady(function () {
  const global = Function('return this')();
  console.log('this is global?', global === self);
	reactVelo.render(App, $w);
});
```

## Types check development
Since `importScript` does not support types declaration (via the types bundler),
Types added/changed in `types/index.d.ts` would not be reflected in `serve` mode,
In order to test types related definitions, **do not** use `importScript` but rather run:
* `yarn serve:types`
* Open the editor for the relevant site
* Check in the network the version of react-velo currently used (in the network tab in dev tools)
* After each local modification to `index.d.ts` do:
  * Run in the console (in this example `react-velo.1.0.20` is used : `fetch('http://localhost:9081/index.d.ts', {
    mode: 'no-cors'
    }).then(res => res.text()).then(JSON.stringify).then(content => {
    monaco.languages.typescript.javascriptDefaults.addExtraLib(content, '/dependencies/@wix/react-velo.1.0.20.d.ts');
    console.log('DONE');
    })`
  * Comment out the row in the editor which includes the import from `'@wix/react-velo'` and uncomment it
  * The Velo editor reflects your local index.d.ts file

### Types check Unit testing
See `types-check.spec.tsx` for reference (you may create additional files provided that `TypescriptCompiler` is init with different name).
The tests are using some dump from a Velo page (https://shahar762.editorx.io/my-site-15), in order to accumulate all types Velo uses
In order to check new data:
* Run in the Editor console: `copy( Object.keys(monaco.languages.typescript.javascriptDefaults._extraLibs).reverse().filter(key => !key.includes('/dependencies/@wix/react-velo')).map(filteredKey => '// ' + filteredKey + '\n' + monaco.languages.typescript.javascriptDefaults._extraLibs[filteredKey].content).join('\n'))`
  * This will copy to your clipboard new dump data
* Paste the content into `__tests__/testTypes/monaco-template.d.ts`
* Run `yarn test` to run the tests with the new data
* If you wish to debug the generated types, remove the line which deletes the generated code (`tsx`) files: `afterAll(() => compiler.cleanup());` such that the tests will generate tsx code under `__tests__/testTypes/generated/react-velo` folder
