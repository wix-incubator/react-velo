
function patchMultiStateBox(nativeElement: any) {
    const statePropDescriptor = Object.getOwnPropertyDescriptor(nativeElement, 'state');
    if (!statePropDescriptor) {
        Object.defineProperty(nativeElement, 'state', {
            set: function(x) { this.changeState(x); }
        });
    }
}

export interface NativeElementsPatches {
    [key: string]: (nativeElement: any) => void;
}

export const nativeElementsPatches: NativeElementsPatches = {
    '$w.MultiStateBox': patchMultiStateBox
};