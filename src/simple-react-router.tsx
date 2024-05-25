import React, {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useState,
} from "react";
export type To = { path: string; search: string };
export type Location = {
  path: string;
  search: string;
};
export type RouterState = {
  location: Location;
  navigation?: {
    location: Location;
  };
  match?: Match;
};

export type Router = {
  navigate: (to: To) => void;
  state: RouterState;
  subscribe: (fn: Subscriber) => Disposer;
};

export type RouteObject = {
  path: string;
  element: ReactNode;
  loader?: () => any;
};

export type Match = {
  element: ReactNode;
  loader?: () => any;
};

type Subscriber = (state: RouterState) => void;
type Disposer = () => void;

export const createBrowserRouter = (routes: RouteObject[]): Router => {
  const subscribers = new Set<Subscriber>();

  let state: RouterState = {
    match: undefined,
    location: {
      path: "/",
      search: "",
    },
    navigation: undefined,
  };

  const updateState = (nextState: Partial<RouterState>) => {
    state = {
      ...state,
      ...nextState,
    };
    [...subscribers].forEach((subscriber) => {
      subscriber(state);
    });
  };

  const startNavigation = async (to: To) => {
    updateState({
      ...state,
      navigation: {
        location: to,
      },
    });

    // run loaders
    if (state.match?.loader) {
      await state.match.loader();
    }
    await Promise.resolve();
    completeNavigation(to);
  };
  const completeNavigation = (to: To) => {
    // update state
    updateState({
      ...state,
      location: to,
      navigation: undefined,
    });
  };

  const subscribe = (subscriber: Subscriber) => {
    subscribers.add(subscriber);
    return () => {
      subscribers.delete(subscriber);
    };
  };

  const initialize = () => {
    const matches = routes.filter(
      (route) => route.path === state.location.path,
    );
    updateState({
      match: matches[0],
    });
  };

  initialize();

  return {
    navigate: startNavigation,
    state,
    subscribe,
  };
};

type RenderErrorBoundaryProps = {
  children: ReactNode;
  location: Location;
  error: any;
};

type RenderErrorBoundaryState = {
  error: any;
  location: Location;
};

class RenderErrorBoundary extends React.Component<
  RenderErrorBoundaryProps,
  RenderErrorBoundaryState
> {
  constructor(props: RenderErrorBoundaryProps) {
    super(props);
    this.state = {
      error: props.error,
      location: props.location,
    };
  }

  static getDerivedStateFromError(error: unknown) {
    return { error: error };
  }

  static getDerivedStateFromProps(
    props: RenderErrorBoundaryProps,
    state: RenderErrorBoundaryState,
  ) {
    if (state.location !== props.location) {
      return {
        error: props.error,
        location: props.location,
      };
    }
    return {
      error: props.error !== undefined ? props.error : state.error,
      location: state.location,
    };
  }

  componentDidCatch(error: unknown, errorInfo: unknown) {
    console.error(
      "React Router caught the following error during render",
      error,
      errorInfo,
    );
  }

  render() {
    return this.state.error !== undefined
      ? "Unexpected application error"
      : this.props.children;
  }
}

const RouterContext = createContext<Router | null>(null);
const RouterStateContext = createContext<RouterState | null>(null);

export const useRouter = (): Router => {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error("use router provider");
  }
  return context;
};
export const useRouterState = (): RouterState => {
  const context = useContext(RouterStateContext);
  if (!context) {
    throw new Error("use router state provider");
  }
  return context;
};

export const useSearchParams = () => {
  const router = useRouter();
  const { location } = useRouterState();
  const urlSearchParams = new URLSearchParams(location.search);

  const setSearchParams = (searchParams: URLSearchParams) => {
    router.navigate({
      ...location,
      search: searchParams.toString(),
    });
  };

  return [urlSearchParams, setSearchParams] as const;
};

export const RouterProvider = ({ router }: { router: Router }) => {
  const [state, setState] = useState<RouterState>(router.state);
  const updateState = useCallback((state: RouterState) => {
    setState(state);
  }, []);

  useLayoutEffect(() => router.subscribe(updateState), [updateState, router]);
  return (
    <RouterContext.Provider value={router}>
      <RouterStateContext.Provider value={state}>
        <Routes />
      </RouterStateContext.Provider>
    </RouterContext.Provider>
  );
};

const Routes = () => {
  const router = useRouter();
  const { location } = useRouterState();
  const error = undefined;

  return (
    <RenderErrorBoundary location={location} error={error}>
      {router.state.match?.element || "404 not found"}
    </RenderErrorBoundary>
  );
};
