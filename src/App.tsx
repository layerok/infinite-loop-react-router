import {
  DataGridPremium,
  GridDimensions,
  GridColDef,
  useGridApiRef,
  GridValidRowModel,
  GridPaginationModel,
} from "./x-data-grid-premium";


import {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useLayoutEffect, useRef,
} from "react";

// simplified implementation of react router to create minimal reproducible example
import {
  createBrowserRouter,
  RouterProvider,
  useSearchParams,
} from "./react-router/react-router.tsx";

// import {
//   createBrowserRouter,
//   RouterProvider,
//   useSearchParams,
// } from "react-router-dom";

const MAX_ERROR_THROWN = 100;
let thrownErrorAmount = 0;
enum SearchParams {
  Page = "page",
  PageSize = "pageSize",
}

const columns: GridColDef[] = [
  {
    field: "col1",
    headerName: "Column 1",
    renderHeader: () => {
      // I added this check to prevent your browser from crushing
      if (thrownErrorAmount < MAX_ERROR_THROWN) {
        thrownErrorAmount++;
        throw new Error("some error during rendering");
      }

      return <div style={{ color: "red" }}>I was causing infinte loop</div>;
    },
  },
  { field: "col2", headerName: "Column 2" },
]

const rows: GridValidRowModel[] = [
  { id: 1, col1: "Hello", col2: "World" },
  { id: 2, col1: "Gen", col2: "is Awesome" },
  { id: 3, col1: "four", col2: "is Amazing" },
  { id: 4, col1: "rRdf", col2: "firwff" },
  { id: 5, col1: "MUI2", col2: "maple" },
];

const computePageSize = (dimensions: GridDimensions) => {
  return Math.floor(dimensions.viewportInnerSize.height / dimensions.rowHeight);
};

type Data = {
  data: GridValidRowModel[];
  count: number;
};

const wait = async (ms: number) => {
  await new Promise((resolve) => setTimeout(() => resolve(true), ms));
}

const fetchRows = async (params: {
  offset: number;
  limit: number;
}): Promise<Data> => {
  // simulate server response
  await wait(500);
  const { offset, limit } = params;

  return {
    count: rows.length,
    data: limit === 0 ? rows : rows.slice(offset, offset + limit),
  };
};
export const HomePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const setPaginationModel = useCallback(
    function setPaginationModel(model: GridPaginationModel)  {
      const { page, pageSize } = model;
      searchParams.set(SearchParams.Page, page + "");
      searchParams.set(SearchParams.PageSize, pageSize + "");
      setSearchParams(searchParams);
    },
    [searchParams, setSearchParams],
  );

  const page = +(searchParams.get(SearchParams.Page) ?? 0);
  const pageSize = +(searchParams.get(SearchParams.PageSize) ?? 25);

  const paginationModel: GridPaginationModel = useMemo(
    () => ({
      page,
      pageSize,
    }),
    [page, pageSize],
  );

  const [data, setData] = useState<Data | null>(null);
  const [previousData, setPreviousData] = useState<Data | null>(null);

  useEffect(function fetchRowsEffect()  {
    fetchRows({
      offset: page * pageSize,
      limit: pageSize,
    })
      .then(setData)
  }, [page, pageSize]);

  if (data !== null && !Object.is(previousData, data)) {
    setPreviousData(data);
  }

  const rows = (data || previousData)?.data || [];
  const rowCount = (data || previousData)?.count || 0;

  const apiRef = useGridApiRef();

  useLayoutEffect(function subscribeViewportInnerSizeChangeEffect()  {
    let timeoutId: NodeJS.Timeout | undefined;
    const disposer = apiRef.current?.subscribeEvent("viewportInnerSizeChange", () => {
      console.log('viewportInnerSizeChange fired')
      const dimensions = apiRef.current.getRootDimensions();

      clearTimeout(timeoutId);

      timeoutId = setTimeout(() => {
        setPaginationModel({
          page,
          pageSize: computePageSize(dimensions),
        });
      },100)

    });
    return () => {
      disposer();
      clearTimeout(timeoutId);
    }
  }, [apiRef, page, setPaginationModel]);

  const timeout = useRef<NodeJS.Timeout>();

  useEffect(() => {
    return () => {
      clearTimeout(timeout.current)
    }
  }, []);

  const handlePaginationModelChange = useCallback((model: GridPaginationModel) => {
    timeout.current = setTimeout(() => {
      setPaginationModel(model);
    },200)
  }, [setPaginationModel])

  return (
    <div>
      <DataGridPremium
        style={{
          height: "300px",
        }}
        rowCount={rowCount}
        pagination
        paginationMode={"server"}
        paginationModel={paginationModel}
        apiRef={apiRef}
        onPaginationModelChange={handlePaginationModelChange}
        rows={rows}
        columns={columns}
      />
    </div>
  );
};

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
