import {
  useEffect,
  useState,
  useLayoutEffect,
  PropsWithChildren,
} from "react";

import {
  createBrowserRouter,
  RouterProvider,
  useSearchParams,
} from "react-router-dom";

const MAX_ERROR_THROWN = 100;
let thrownErrorAmount = 0;

export const HomePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const timeout = setTimeout(() => {
      searchParams.set('page', "1")
      setSearchParams(searchParams)
    })
    return () => {
      clearTimeout(timeout)
    }
  }, [setSearchParams, searchParams]);

  return (
    <NoSsr>
      <RenderSomethingThatThrows/>
    </NoSsr>
  );
};

const RenderSomethingThatThrows = () => {
  if (thrownErrorAmount < MAX_ERROR_THROWN) {
    thrownErrorAmount++;
    throw new Error("throw something");
  }
  return <div>something</div>
}

const NoSsr = ({children}: PropsWithChildren) => {
  const [mountedState, setMountedState] = useState(false);
  useLayoutEffect(function noSsrLayoutEffect()  {
    setMountedState(true);
  }, []);

  if (!mountedState) {
    return null;
  }
  return children
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
    loader: async () => {
      // remove this loader to prevent infinite loop
      return null;
    },
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
