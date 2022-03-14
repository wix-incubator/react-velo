/// <reference path="/elementsMap.d.ts" />
/// <reference path="/types/pages/$w.d.ts" />

/// Generic helpers
type ExtractNameFromStringWithHash<StringWithHash extends string> =
    StringWithHash extends `#${infer Name}` ? Name : never;

type GenericFunction = (...args: any[]) => any;
type NoFunctions<T> = {
    [P in keyof T as T[P] extends GenericFunction ? never : P]: T[P]
};
type FilterStartingWith<Set, Needle extends string> = Set extends `${Needle}${infer _X}` ? Set : never;
type EventHandlers<T> = FilterStartingWith<keyof T, 'on'>;
/// END generic helpers

type PageElementsKeys = Extract<keyof PageElementsMap, string>;
type PageElementsMapKeyType = keyof PageElementsMap;
type ConvertElementMapKeyToString<T extends string> = Extract<`#${T}`, keyof PageElementsMap>;
type ReactVeloElementsMap<ElementId extends string> = PageElementsMap[ConvertElementMapKeyToString<ElementId>];
type PageElementIds = Extract<ExtractNameFromStringWithHash<PageElementsKeys>, string>;

type ReactVeloTypeKeys<T> = Extract<keyof NoFunctions<T>, string> | EventHandlers<T>;

type ReactWixElementProp<T, Prop extends keyof T> = T[Prop];

type UnrwapReactWixElementEventHandler<T, Prop extends keyof T> = 
    ReactWixElementProp<T, Prop> extends GenericFunction ?
        Parameters<ReactWixElementProp<T, Prop>>[0] :
        ReactWixElementProp<T, Prop>;

type ReactifiedVeloType<T> = Partial<{
    [key in keyof T]: UnrwapReactWixElementEventHandler<T, key>;
}> & { id: string };

type ReactWixElement<T extends PageElementIds> = Partial<{
    [key in ReactVeloTypeKeys<ReactVeloElementsMap<T>>]: UnrwapReactWixElementEventHandler<ReactVeloElementsMap<T>, key>;
}>


// Repeater is a special case, because in "react" land we'll have a different API for it.
type ReactVeloRepeaterType = {
    data?: any[];
    renderItem: (data: any) => JSX.Element;
};

type ReactVeloOutputElementsMap = {
    [key in PageElementIds]: ReactVeloElementsMap<key> extends $w.Repeater ? (props: ReactVeloRepeaterType) => JSX.Element : (props: ReactWixElement<key>) => JSX.Element;
}

type VeloTypeNames = Extract<keyof TypeNameToSdkType, string>;

type ReactVeloOutputTypesMap = {
    [key in VeloTypeNames as Uncapitalize<key>]: TypeNameToSdkType[key] extends $w.Repeater ? (prop: ReactVeloRepeaterType) => JSX.Element : (prop: ReactifiedVeloType<TypeNameToSdkType[key]>) => JSX.Element
}


// That's "hardcoded" Typescript convention for types for "regular" jsx elements, i.e. what goes as string to React.createElment("string")
declare namespace JSX {
    interface Element {}
    interface IntrinsicAttributes {}
    interface ElementAttributesProperty { props: {}; }
    interface ElementChildrenAttribute { children: {}; }

    // https://www.typescriptlang.org/docs/handbook/jsx.html#type-checking
    // An intrinsic element always begins with a lowercase letter, and a value-based element always begins with an uppercase letter.
    interface IntrinsicElements extends ReactVeloOutputTypesMap {}
}

declare module '@wix/react-velo' {
    export function render(rootElement: JSX.Element, $w: Function): void;
    export const W: ReactVeloOutputElementsMap;
    export const V: ReactVeloOutputTypesMap;
}
