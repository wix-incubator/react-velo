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
});

describe('events handler', () => {
    it('should not call old handler after removeChildFromContainer', () => {
        const clickHandlers: Function[] = [];
        const someNativeEl = {
            onClick: (cb: Function) => clickHandlers.push(cb),
        };
        const rootContainer = {$w: jest.fn(() => someNativeEl), lastInstanceId: 0, instancesMap: new Map()};
        const firstInstanceClickHandler = jest.fn();
        const firstInstance = reconcilerDefinition.createInstance('type', {'id': 'someId', onClick: firstInstanceClickHandler}, rootContainer, {}, {});
        
        // expect to have a type object
        expect(firstInstance).toBeTruthy();
        expect(firstInstance.relative$w).toEqual(rootContainer.$w);
        expect(rootContainer.instancesMap.get(firstInstance.instanceId)).toEqual(firstInstance);

        reconcilerDefinition.removeChildFromContainer!(rootContainer, firstInstance);

        const secondnstanceClickHandler = jest.fn();
        const secondInstance = reconcilerDefinition.createInstance('type', {'id': 'someId', onClick: secondnstanceClickHandler}, rootContainer, {}, {});

        // expect to have a type object
        expect(secondInstance).toBeTruthy();
        expect(secondInstance.relative$w).toEqual(rootContainer.$w);
        expect(rootContainer.instancesMap.get(secondInstance.instanceId)).toEqual(secondInstance);

        clickHandlers.forEach((handler) => handler());
        expect(firstInstanceClickHandler).not.toBeCalled();
        expect(secondnstanceClickHandler).toBeCalled();
    });

    it('should not call old handler after removeChild', () => {
        const clickHandlers: Function[] = [];
        const someNativeEl = {
            onClick: (cb: Function) => clickHandlers.push(cb),
        };
        const rootContainer = {$w: jest.fn(() => someNativeEl), lastInstanceId: 0, instancesMap: new Map()};
        const firstInstanceClickHandler = jest.fn();
        const firstInstance = reconcilerDefinition.createInstance('type', {'id': 'someId', onClick: firstInstanceClickHandler}, rootContainer, {}, {});
        
        // expect to have a type object
        expect(firstInstance).toBeTruthy();
        expect(firstInstance.relative$w).toEqual(rootContainer.$w);
        expect(rootContainer.instancesMap.get(firstInstance.instanceId)).toEqual(firstInstance);

        reconcilerDefinition.removeChild!({ props: { id: 'bla' } } as any, firstInstance);

        const secondnstanceClickHandler = jest.fn();
        const secondInstance = reconcilerDefinition.createInstance('type', {'id': 'someId', onClick: secondnstanceClickHandler}, rootContainer, {}, {});

        // expect to have a type object
        expect(secondInstance).toBeTruthy();
        expect(secondInstance.relative$w).toEqual(rootContainer.$w);
        expect(rootContainer.instancesMap.get(secondInstance.instanceId)).toEqual(secondInstance);

        clickHandlers.forEach((handler) => handler());
        expect(firstInstanceClickHandler).not.toBeCalled();
        expect(secondnstanceClickHandler).toBeCalled();
    });
});

describe('styles', () => {
    it('should set backgroundColor and remove it', () => {
        const someNativeEl = {
            style: {
                removeProperty: jest.fn(),
            }
        };
        const rootContainer = {$w: jest.fn(() => someNativeEl), lastInstanceId: 0, instancesMap: new Map()};
        const props = {'id': 'someId', 'style': {backgroundColor: 'red'}};
        const instance = reconcilerDefinition.createInstance('type', props, rootContainer, {}, {});
        // expect to have a type object

        expect((someNativeEl as any).style.backgroundColor).toEqual('red');

        const newProps =  {'id': 'someId'};
        const updatePayload = reconcilerDefinition.prepareUpdate(instance, undefined, props, newProps, rootContainer, {});
        expect(updatePayload).not.toBeNull();

        reconcilerDefinition.commitUpdate!(instance, updatePayload!, undefined, props, newProps, {});

        expect(someNativeEl.style.removeProperty).toBeCalledWith('backgroundColor');
    });

    it('should set backgroundColor and remove it if set to falsy value', () => {
        const someNativeEl = {
            style: {
                removeProperty: jest.fn(),
            }
        };
        const rootContainer = {$w: jest.fn(() => someNativeEl), lastInstanceId: 0, instancesMap: new Map()};
        const props = {'id': 'someId', 'style': {backgroundColor: 'red'}};
        const instance = reconcilerDefinition.createInstance('type', props, rootContainer, {}, {});
        // expect to have a type object

        expect((someNativeEl as any).style.backgroundColor).toEqual('red');

        const newProps =  {'id': 'someId', 'style': {backgroundColor: undefined}};
        const updatePayload = reconcilerDefinition.prepareUpdate(instance, undefined, props, newProps, rootContainer, {});
        expect(updatePayload).not.toBeNull();

        reconcilerDefinition.commitUpdate!(instance, updatePayload!, undefined, props, newProps, {});

        expect(someNativeEl.style.removeProperty).toBeCalledWith('backgroundColor');
    });

    it('should set backgroundColor and remove it while setting borderWidth', () => {
        const someNativeEl = {
            style: {
                removeProperty: jest.fn(),
            }
        };
        const rootContainer = {$w: jest.fn(() => someNativeEl), lastInstanceId: 0, instancesMap: new Map()};
        const props = {'id': 'someId', 'style': {backgroundColor: 'red'}};
        const instance = reconcilerDefinition.createInstance('type', props, rootContainer, {}, {});
        // expect to have a type object

        expect((someNativeEl as any).style.backgroundColor).toEqual('red');

        const newProps =  {'id': 'someId', style: {borderWidth: '1px'} };
        const updatePayload = reconcilerDefinition.prepareUpdate(instance, undefined, props, newProps, rootContainer, {});
        expect(updatePayload).not.toBeNull();

        reconcilerDefinition.commitUpdate!(instance, updatePayload!, undefined, props, newProps, {});

        expect(someNativeEl.style.removeProperty).toBeCalledWith('backgroundColor');
        expect((someNativeEl as any).style.borderWidth).toEqual('1px');
    });
})