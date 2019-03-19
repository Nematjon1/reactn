import { ComponentClass, Context, createElement, FunctionComponent } from 'react';
import { ReactNPureComponent } from '../components';
import ReactNContext from '../context';
import defaultGlobalStateManager from '../default-global-state-manager';
import GlobalStateManager, { NewGlobalState } from '../global-state-manager';
import { ReactNGlobal, ReactNSetGlobal } from '../methods';
import Callback from '../typings/callback';

// TODO -- https://github.com/CharlesStover/reactn/issues/14
const isComponentDidMount = false;
const isComponentDidUpdate = false;
const isSetGlobalCallback = false;

/*
Creates a Higher-Order Component that passes the global state
  to the wrapped Component as props.
Behaves analogously to Redux's connect() HOC.

const hoc = withGlobal(
  (global, props) => ({
    age: global.people[props.person].age,
    propName: global.property
  })
);
hoc(MyComponent);

*/

export type Getter<GS, HP, LP> = (globalState: GS, props: HP) =>
  null | Partial<LP> | void;

type LowerOrderComponent<P = {}> = ComponentClass<P> | FunctionComponent<P> | string;

type SetGlobal<GS> = (
  newGlobal: NewGlobalState<GS>,
  callback?: Callback<GS>,
) => Promise<GS>;

export type Setter<GS, HP, LP> = (setGlobal: SetGlobal<GS>, props: HP) =>
  null | Partial<LP> | void;

export type WithGlobal<HP, LP> = (Component: LowerOrderComponent<LP>) => ComponentClass<HP>;

// Get the name of a Component.
const componentName = (Component: LowerOrderComponent): string =>
  typeof Component === 'string' ?
    Component :
    Component.displayName ||
    Component.name;

export default function withGlobal<
  GS extends {} = Record<string, any>,
  HP extends {} = Record<string, any>,
  LP extends {} = Record<string, any>,
>(
  globalStateManager: GlobalStateManager<GS> | null = null,
  getter: Getter<GS, HP, LP> = (globalState: GS): GS => globalState,
  setter: Setter<GS, HP, LP> = (): null => null,
): WithGlobal<HP, LP> {
  return function ReactNWithGlobal(
    Component: LowerOrderComponent<LP>,
  ): ComponentClass<HP> {

    // If a Global State was provided, use it.
    // Otherwise, if a Provider was mounted, use its global state.
    // Otherwise, use the default global state.

    return class ReactNComponent extends ReactNPureComponent<HP, {}, GS> {

      static contextType: Context<GlobalStateManager<GS>> = ReactNContext;

      static displayName = `${componentName(Component)}-ReactN`;

      get global(): GS {
        return ReactNGlobal(
          this,
          globalStateManager || this.context || defaultGlobalStateManager
        );
      }

      setGlobal = (
        newGlobal: NewGlobalState<GS>,
        callback: Callback<GS> = null,
      ): Promise<GS> =>
        ReactNSetGlobal(
          this, newGlobal, callback,
          !isComponentDidMount &&
          !isComponentDidUpdate &&
          !isSetGlobalCallback,
          globalStateManager || this.context || defaultGlobalStateManager
        );

      render() {

        // @ts-ignore: LP doesn't match HP
        const lowerOrderProps: LP = {
          ...this.props,
          ...getter(this.global, this.props),
          ...setter(this.setGlobal, this.props),
        };
        return createElement(Component, lowerOrderProps);
      }
    };
  };
};
