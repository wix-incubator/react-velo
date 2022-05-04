import { TypescriptCompiler } from '../utils/typescript-compiler';

const generateCodeBlock = (componentCode: string) => `
import React from 'react';
import { render, W as WImpl, V as VImpl } from '../../../../../../src/render';
import type {
    ReactVeloOutputElementsMap as WType,
    ReactVeloOutputTypesMap as VType
} from '../../../index';

const componentCode = () => {
    const W: WType = WImpl;
    const V: VType = VImpl;
    const $w = jest.fn(() => ({}));
    const App = () => ${ componentCode.trim() };
    render(App, $w, React);
}
`;

describe('Type Checks', () => {
    const compiler = new TypescriptCompiler('types-check');

    // Remove this line in order to debug generated code
    afterAll(() => compiler.cleanup());

    it('should validate container type', () => {
        const {tsconfigFile} = compiler.setupReactVeloTest( generateCodeBlock(`
            <W.Box style={{backgroundColor: 'red', borderColor: 'red', color: 'red'}}>
                <W.Result text={'Text'}/>
                <W.Next onClick={() => null}/>
            </W.Box>
        `));

        expect(() => compiler.compile(tsconfigFile)).not.toThrow();
    });

    it('should not allow unknown style props', () => {
        const invalidStylePropName = 'invalidName';
        const {tsconfigFile} = compiler.setupReactVeloTest( generateCodeBlock(`
            <W.Box style={{backgroundColor: 'red', borderColor: 'red', color: 'red', ${invalidStylePropName}: 'aa'}}/>
        `));

        expect(() => compiler.compile(tsconfigFile)).toThrow(`'${invalidStylePropName}' does not exist in type`);
    });

    it('should validate button props', () => {
        const {tsconfigFile} = compiler.setupReactVeloTest( generateCodeBlock(`
            <W.Hit onClick={() => null} icon={'hello.png'}/>
        `));

        expect(() => compiler.compile(tsconfigFile)).not.toThrow();
    });

    it('should allow V syntax', () => {
        const {tsconfigFile} = compiler.setupReactVeloTest( generateCodeBlock(`
            <V.button id="Hit" onClick={() => null} icon={'hello.png'}/>
        `));

        expect(() => compiler.compile(tsconfigFile)).not.toThrow();
    });

    it('should only relevant props are allowed', () => {
        const {tsconfigFile} = compiler.setupReactVeloTest( generateCodeBlock(`
            <W.Result icon={'hello.png'}/>
        `));

        expect(() => compiler.compile(tsconfigFile)).toThrow(`Type '{ icon: string; }' is not assignable to type`);
    });
});
