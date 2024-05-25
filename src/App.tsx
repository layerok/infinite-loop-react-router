import "./App.css";

import {
  DataGridPremium,
  GridDimensions,
  GridColDef,
  useGridApiRef,
  GridValidRowModel,
  GridPaginationModel,
} from "./DataGridPremium.tsx";

import { Pagination } from "./Pagination.tsx";
import { HelperPaginationText } from "./HelperPaginationText.tsx";

import {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useLayoutEffect,
} from "react";

// simplified implementation of react router to demonstrate
// what causing the infinite loop
// import {
//   createBrowserRouter,
//   RouterProvider,
//   useSearchParams,
// } from "./simple-react-router.tsx";

import {
  createBrowserRouter,
  RouterProvider,
  useSearchParams,
} from "react-router-dom";

const MAX_ERROR_THROWN = 100;
const thrownErrorAmount = 0;
enum SearchParams {
  Page = "page",
  PageSize = "pageSize",
}

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

const fetchRows = async (params: {
  offset: number;
  limit: number;
}): Promise<Data> => {
  // simulate server response
  await new Promise((resolve) => setTimeout(() => resolve(true), 1000));
  const { offset, limit } = params;

  return {
    count: rows.length,
    data: limit === 0 ? rows : rows.slice(offset, offset + limit),
  };
};

const styles = {
  paginationWrapper: {
    marginBottom: 10,
  },
  paginationContainer: { display: "flex", gap: 20 },
};

export const HomePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const setPaginationModel = useCallback(
    (model: GridPaginationModel) => {
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

  const goToPage = (page: number) => {
    searchParams.set(SearchParams.Page, page + "");
    setSearchParams(searchParams);
  };

  const [data, setData] = useState<Data | null>(null);
  const [previousData, setPreviousData] = useState<Data | null>(null);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchRows({
      offset: page * pageSize,
      limit: pageSize,
    })
      .then(setData)
      .finally(() => {
        setLoading(false);
      });
  }, [page, pageSize]);

  if (data !== null && !Object.is(previousData, data)) {
    setPreviousData(data);
  }

  const rows = (data || previousData)?.data || [];
  const rowCount = (data || previousData)?.count || 0;

  const totalPages = pageSize ? Math.ceil(rowCount / pageSize) : 1;

  const columns: GridColDef[] = useMemo(
    () => [
      {
        field: "col1",
        headerName: "Column 1",
        // renderHeaderFilter: () => {
        //   // I added this check to prevent your browser from crushing
        //   if (thrownErrorAmount < MAX_ERROR_THROWN) {
        //     thrownErrorAmount++;
        //     throw new Error("some error during rendering");
        //   }

        //   return <div style={{ color: "red" }}>I was causing infinte loop</div>;
        // },
      },
      { field: "col2", headerName: "Column 2" },
    ],
    [],
  );

  const apiRef = useGridApiRef();

  useLayoutEffect(() => {
    return apiRef.current?.subscribeEvent("viewportInnerSizeChange", () => {
      const nextPaginationModel = {
        page,
        pageSize: computePageSize(apiRef.current.getDimensions()),
      };
      console.log("nextPaginationModel", nextPaginationModel);
      setPaginationModel(nextPaginationModel);
    });
  }, [apiRef, page, setPaginationModel]);

  return (
    <div>
      <div style={styles.paginationWrapper}>
        {!!rowCount && (
          <div style={styles.paginationContainer}>
            <Pagination
              max={totalPages}
              page={page + 1}
              onPageChange={(page) => goToPage(page - 1)}
            />
            <HelperPaginationText
              count={rowCount}
              page={page + 1}
              pageSize={pageSize || rowCount}
            />
          </div>
        )}
      </div>

      <DataGridPremium
        style={{
          height: "300px",
        }}
        apiRef={apiRef}
        //paginationModel={paginationModel}
        //onPaginationModelChange={setPaginationModel}
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
