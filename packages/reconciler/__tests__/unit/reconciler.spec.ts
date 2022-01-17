import { reconcilerDefinition } from '../../src/reconciler';

describe('createInstance sanity', () => {

    it('should return an instance and the map should be updated', () => {
        const someNativeEl = {};
        const rootContainer = {$w: jest.fn(() => someNativeEl), lastInstanceId: 0, instancesMap: new Map()};
        const instance = reconcilerDefinition.createInstance('type', {'id': 'someId'}, rootContainer, {}, {});
        // expect to have a type object
        expect(instance).toBeTruthy();
        expect(instance.relative$w).toEqual(rootContainer.$w);
        expect(rootContainer.instancesMap.get(instance.instanceId)).toEqual(instance);
    });


    it('should set props on nativeEl', () => {
        const someNativeEl = {};
        const rootContainer = {$w: jest.fn(() => someNativeEl), lastInstanceId: 0, instancesMap: new Map()};
        const props = {'id': 'someId', 'someProp': 'settedValue'};
        const instance = reconcilerDefinition.createInstance('type', props, rootContainer, {}, {});
        // expect to have a type object

        expect((someNativeEl as any).someProp).toEqual('settedValue');
    });



    it.only('repeater init sanity', () => {
        const repeaterNativeEl = {
            _onItemReadyCallback: null,
            onItemReady: function (cb: Function) {
                //@ts-expect-error
                this._onItemReadyCallback = cb
            },
            data: [1, 2, 3],
        };

        const nativeElementsMap = {
            '#someButtonId': {},
            '#myRepeater': repeaterNativeEl,
        };

        //@ts-expect-error
        const mock$w = jest.fn((id) => nativeElementsMap[id]);
        const rootContainer = {$w: mock$w, lastInstanceId: 0, instancesMap: new Map()};

        const someFragmentInstance = reconcilerDefinition.createInstance('fragment', {}, rootContainer, {type: 'repeater'} as any, {});
        const someButtonInstance = reconcilerDefinition.createInstance('button', {id: 'someButtonId', label: 'hello from button!'}, rootContainer, {type: 'repeater'} as any, {});
        //@ts-expect-error
        expect(nativeElementsMap['#someButtonId'].label).not.toBeDefined(); // we delay setting the label until repeater item is ready

        const repeaterInstance = reconcilerDefinition.createInstance('repeater', {id: 'myRepeater'}, rootContainer, {}, {});

        expect(typeof repeaterNativeEl._onItemReadyCallback).toBe('function');
        expect(repeaterNativeEl.data.length).toBe(0);

        //@ts-expect-error
        const relative$w = jest.fn((id) => nativeElementsMap[id]);
        const itemProps = {_id: someFragmentInstance.instanceId };

        reconcilerDefinition.appendInitialChild(someFragmentInstance, someButtonInstance);
        reconcilerDefinition.appendInitialChild(repeaterInstance, someFragmentInstance);
        expect(repeaterNativeEl.data.length).toBe(1);

        //@ts-expect-error
        repeaterNativeEl._onItemReadyCallback(relative$w, itemProps);
        expect(relative$w).toBeCalledWith('#someButtonId');
        //@ts-expect-error
        expect(nativeElementsMap['#someButtonId'].label).toBe('hello from button!');
    });

    

});