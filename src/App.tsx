import {
  useEffect,
  useState,
  useLayoutEffect,
  PropsWithChildren,
} from "react";

import {
  createBrowserRouter,
  RouterProvider,
  useNavigate,
} from "react-router-dom";

const MAX_ERROR_THROWN = 100;
let thrownErrorAmount = 0;

export const HomePage = () => {
  const navigate = useNavigate();
  useEffect(() => {
    //const timeout = setTimeout(() => {
      navigate({
        search: "?page=2"
      })
    //})
    return () => {
      //clearTimeout(timeout)
    }
  }, [navigate]);

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
      // infinite loop doesn't occur without loaders
      return null;
    },
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
