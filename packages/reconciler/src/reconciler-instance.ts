import { applyPropsOnObjectExcept, safeJsonStringify } from "./utils";
import {  nativeElementsPatches } from './native-elements-patches';

interface ReactVeloReconcilerInstanceProps {
    instanceId: string;
    type: string;
    props: Record<string, unknown>;
    rootContainer: any;
    hostContext: Record<string, never>;
    children: ReactVeloReconcilerInstance[];
    relative$w: any;
    parent: ReactVeloReconcilerInstance | null;
}


function getEventHandlerNames(wElement: any) {
  const keys = Object.keys(wElement);
  const eventHandlers = keys.filter(key => key.startsWith('on'));
  return eventHandlers;
}

function getInverseAction(action: 'hide' | 'show'): 'show' | 'hide' {
  switch (action) {
    case 'hide':
      return 'show'
    case 'show':
      return 'hide';
  }
}

export class ReactVeloReconcilerInstance implements ReactVeloReconcilerInstanceProps {
    instanceId: string;
    type: string;
    props: Record<string, unknown>;
    rootContainer: any;
    hostContext: Record<string, never>;
    children: ReactVeloReconcilerInstance[];
    relative$w: any;
    parent: ReactVeloReconcilerInstance | null;

    private _ignoreEvents: boolean = false;
    private _nativeEl: any = null;
    private _log: (st: string) => void;

    constructor(props: ReactVeloReconcilerInstanceProps, log: (st: string) => void) {
        this.relative$w = props.relative$w;
        this.instanceId = props.instanceId;
        this.type = props.type;
        this.props = props.props;
        this.rootContainer = props.rootContainer;
        this.hostContext = props.hostContext;
        this.children = props.children;
        this.parent = props.parent;
        this._log = log;
    }

    _applyNativeElPatch(nativeEl: any) {
      const nativeType: string = nativeEl.type;
      const patch = nativeElementsPatches[nativeType];
      if (typeof patch === 'function') {
        patch(nativeEl);
      }
    }

    private getIdentifier = () => this.props.id || this.type;

    getNativeEl() {
        if (this._nativeEl) {
            return this._nativeEl;
        }

        const identifier = this.getIdentifier();
        const nativeEl = this.relative$w(`#${identifier}`);
        if (nativeEl) {
            this._nativeEl = nativeEl;
            this._applyNativeElPatch(this._nativeEl);
        } else {
            console.log(
                `Warning: no nativeEl for #${identifier} of type ${this.type} props id: ${this.props.id} on instanceId: ${this.instanceId}`,
                nativeEl,
              );
        }

        return this._nativeEl;
    }

    toggleNativeInstanceVisibility(action: 'show' | 'hide') {
      const nativeEl = this.getNativeEl();
      const identifier = this.getIdentifier();
      if (nativeEl) {
        const inverseAction = getInverseAction(action);
        if (typeof nativeEl[action] === 'function' && typeof nativeEl[inverseAction] === 'function') {
          this._log(`innerToggleVisibility ${action} for instanceId: ${this.instanceId} propId: ${identifier}`);
          nativeEl[inverseAction]();
          nativeEl[action]();
        } else {
          console.log(`Warning: ${action}() is not defined for #${identifier} ${typeof this.props.id}}`);
        }
      } else {
        console.log(`Warning: ${action}() cannot be performed - element with id ${identifier} was not found`);
      }
    }

    toggleVisibility(action: 'show' | 'hide') {
        const identifier = this.getIdentifier();
        this._log(`toggleVisibility ${action} for instanceId: ${this.instanceId} propId: ${identifier}`);
        this.toggleNativeInstanceVisibility(action);
        this.children.map(child => child.toggleVisibility(action));
    }

    installEventHandlers() {
        const nativeElToInstallOn = this.getNativeEl();
        const identifier = this.getIdentifier();
        const eventHandlerNames = getEventHandlerNames(nativeElToInstallOn);
        this._log(
          `Installing event handlers (${eventHandlerNames.join(',')}) on instanceId: ${this.instanceId} propId: ${identifier}`,
        );
        eventHandlerNames.forEach((eventName) => {
          const eventHandlerSetter = nativeElToInstallOn[eventName];
          if (typeof eventHandlerSetter !== 'function') {
            return;
          }

          const self = this;
          eventHandlerSetter.call(nativeElToInstallOn, function (...args: any[]) {
            // there's no native way to remove event handler from wix element
            if (self._ignoreEvents) {
                self._log(
                `Ignoring event for ${self.instanceId} eventName: ${eventName}`,
              );
              return;
            }

            if (typeof self.props[eventName] === 'function') {
               self._log(`Calling ${eventName} handler on #${self.props.id} instanceId: ${self.instanceId}...`);
              //@ts-expect-error
              return self.props[eventName](...args);
            }
          });
        });
    }

    setIgnoreEvents() {
        this._ignoreEvents = true;
    }

    applyPropsOnNativeEl() {
        if (this.getNativeEl()) {
            const identifier = this.getIdentifier();
            const eventHandlerNames = getEventHandlerNames(this.getNativeEl());
            const unsettablePropNames = ['id', 'children', ...eventHandlerNames];
            this._log(`Setting props ${safeJsonStringify(this.props)} on nativeEl #${identifier}`);
            applyPropsOnObjectExcept(this.getNativeEl(), this.props, unsettablePropNames);
        }
    }

    getEventHandlerNames() {
      return getEventHandlerNames(this.getNativeEl());
    }

    setRelative$w(relative$w: any) {
        this.relative$w = relative$w;
    }

    applyFunctionOnChildrenAndSelf(fn: (instance: ReactVeloReconcilerInstance) => void) {
        this.children.forEach(child => child.applyFunctionOnChildrenAndSelf(fn));
        fn(this);
    }
}
