import Injector from "acore-ts/dependencyInjection/Injector";
import type { ParentProps } from "solid-js";
import { createContext, useContext } from "solid-js";

type IoCContextType = Injector;

const IoCContext = createContext<IoCContextType>();

export const useService = <T,>(token: object): T => {
  const context = useContext(IoCContext);
  if (!context) {
    throw new Error("useService must be used within IoCProvider");
  }
  return context.resolve<T>(token);
};

interface IoCProviderProps extends ParentProps {
  initialContainer?: WeakMap<object, unknown>;
}

export const IoCProvider = (props: IoCProviderProps) => {
  const initialContainer = props.initialContainer || new WeakMap<object, unknown>();
  const injector = Injector.getInstance(initialContainer);

  return <IoCContext.Provider value={injector}>{props.children}</IoCContext.Provider>;
};
