import { applyPropsOnObjectExcept, safeJsonStringify } from "./utils";

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

export const EVENT_HANDLER_NAMES = ['onClick', 'onKeyPress', 'onChange', 'onDblClick'];
export class ReactVeloReconcilerInstance implements ReactVeloReconcilerInstanceProps {
    instanceId: string;
    type: string;
    props: Record<string, unknown>;
    rootContainer: any;
    hostContext: Record<string, never>;
    children: ReactVeloReconcilerInstance[];
    relative$w: any;
    parent: ReactVeloReconcilerInstance | null;
    
    private _pendingVisibilityActions: ("show" | "hide")[] = [];
    private _repeaterItemReady?: boolean;
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

    getNativeEl() {
        if (this._nativeEl) {
            return this._nativeEl;
        }

        const nativeEl = this.relative$w(`#${this.props.id}`);
        if (nativeEl) {
            this._nativeEl = nativeEl;
        } else {
            console.log(
                `Warning: no nativeEl for #${this.props.id} of type ${this.type} on instanceId: ${this.instanceId}`,
                nativeEl,
              );
        }

        return this._nativeEl;
    }

    toggleNativeInstanceVisibility(action: 'show' | 'hide') {
        if (this.props.id) {
          const nativeEl = this.getNativeEl();
          if (nativeEl) {
            if (typeof nativeEl[action] === 'function') {
              this._log(`innerToggleVisibility ${action} for instanceId: ${this.instanceId} propId: ${this.props.id}`);
              nativeEl[action]();
            } else {
              console.log(`Warning: ${action}() is not defined for #${this.props.id} ${typeof this.props.id}}`);
            }
          }
        }
    }

    toggleVisibility(action: 'show' | 'hide') {
        if (typeof this._repeaterItemReady === 'boolean' && !this._repeaterItemReady) {
            this._pendingVisibilityActions.push(action);
            return;
        }

        this._log(`toggleVisibility ${action} for instanceId: ${this.instanceId} propId: ${this.props.id}`);
        this.toggleNativeInstanceVisibility(action);
        this.children.map(child => child.toggleVisibility(action));
    }

    markAsRepeaterItem() {
        this._repeaterItemReady = false;
    }

    setRepeaterItemReady() {
        this._repeaterItemReady = true;
        this._pendingVisibilityActions.forEach((action) => this.toggleNativeInstanceVisibility(action));
    }

    installEventHandlers() {
        const nativeElToInstallOn = this.getNativeEl();
        this._log(
          `Installing event handlers (${EVENT_HANDLER_NAMES.join(',')}) on instanceId: ${this.instanceId} propId: ${this.props.id}`,
        );
        EVENT_HANDLER_NAMES.forEach((eventName) => {
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
            const unsettablePropNames = ['id', 'children', ...EVENT_HANDLER_NAMES];
            this._log(`Setting props ${safeJsonStringify(this.props)} on nativeEl #${this.props.id}`);
            applyPropsOnObjectExcept(this.getNativeEl(), this.props, unsettablePropNames);
        }
    }

    setRelative$w(relative$w: any) {
        this.relative$w = relative$w;
    }

    applyFunctionOnChildrenAndSelf(fn: (instance: ReactVeloReconcilerInstance) => void) {
        this.children.forEach(child => child.applyFunctionOnChildrenAndSelf(fn));
        fn(this);
    }
}