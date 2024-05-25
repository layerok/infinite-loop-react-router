import { ElementSize, useResizeObserver } from "@mui/x-data-grid-premium";
import {ownerWindow} from "@mui/material";
import { EventManager } from "./EventManager";
import {
  HTMLAttributes,
  useLayoutEffect,
  useState,
  useRef,
  useCallback,
  MutableRefObject, useEffect, ReactNode, PropsWithChildren,
} from "react";
import {Pagination} from "./Pagination.tsx";
import {useGridApiRef} from "./useGridApiRef.ts";
import {useForceRerender} from "./useForceRerender.ts";

const EMPTY_SIZE: ElementSize = { width: 0, height: 0 };

const isElementSizesEqual = (a: ElementSize, b: ElementSize) => {
  return a.width === b.width && a.height === b.height;
};

export interface GridPaginationModel {
  pageSize: number;
  page: number;
}

export type GridColDef = {
  field: string;
  headerName: string;
  renderHeader?: (column: GridColDef) => ReactNode;
};

export type GridValidRowModel = {
  [key: string | symbol]: any;
};

export type GridDimensions = {
  rowHeight: number;
  headerHeight: number;
  viewportInnerSize: ElementSize;
  viewportOuterSize: ElementSize;
};

type EventMap = {
  viewportInnerSizeChange: (size: GridDimensions["viewportInnerSize"]) => void;
  resize: () => void;
};

type Disposer = () => void;


export type GridState = {
  rowsMeta: RowsMeta;
  dimensions: GridDimensions;
  pagination: {
    paginationModel: GridPaginationModel;
  }
}

export type GridApi = {
  state: GridState;
  setState: (state: GridState | {(state: GridState): GridState}) => void;
  getRootDimensions: () => GridDimensions;
  getContainerProps: () => {
    ref: MutableRefObject<HTMLDivElement | null>
  };
  resize: () => void;
  eventManager: EventManager;
  forceRerender: () => void;
  publishEvent: <EventName extends keyof EventMap>(
    eventName: EventName,
    ...arg: Parameters<EventMap[EventName]>
  ) => void;
  subscribeEvent: <EventName extends keyof EventMap>(
    eventName: EventName,
    fn: EventMap[EventName],
  ) => Disposer;
};

type RowsMeta = {
  currentPageTotalHeight: number;
}

const COLUMN_WIDTH = 150;
const ROW_HEIGHT = 52;
const HEADER_HEIGHT = 52;
const FOOTER_HEIGHT = 52;

type PaginationModel = 'client' | 'server'


export type DataGridProps = {
  columns: GridColDef[];
  rows: GridValidRowModel[];
  apiRef?: MutableRefObject<GridApi>;
  paginationModel?: GridPaginationModel;
  onPaginationModelChange?: (model: GridPaginationModel) => void;
  rowCount?: number;
  pagination?: boolean;
  hideFooter?: boolean;
  hideFooterPagination?: boolean;
  paginationMode?: PaginationModel
} & HTMLAttributes<HTMLDivElement>;

export const DataGridPremium = (props: DataGridProps) => {
  const { columns, rows, style, apiRef: apiRefProp, onPaginationModelChange } = props;
  const localApiRef = useGridApiRef();
  const apiRef = apiRefProp || localApiRef;
  const forceRerender = useForceRerender();
  const bodyRef = useRef<HTMLDivElement | null>(null);

  if (Object.keys(apiRef.current).length === 0) {
    const setState: GridApi['setState'] =  (state) => {
      const nextState = typeof state === 'function' ? state(apiRef.current.state): state;
      const prevState = apiRef.current.state;

      const prevPaginationModel = prevState.pagination.paginationModel;
      const nextPaginationModel = nextState.pagination.paginationModel;

      if(prevPaginationModel !== nextPaginationModel) {
        onPaginationModelChange?.(nextPaginationModel);
      }
      apiRef.current.state = nextState;
    }
    apiRef.current = {
      resize: () => {},
      getContainerProps: () => ({
        ref: bodyRef
      }),
      forceRerender: forceRerender,
      setState,
      state: {
        pagination: {
          paginationModel: {
            page: 0,
            pageSize: 100
          }
        },
        rowsMeta: {
          currentPageTotalHeight: 0
        },
        dimensions: {
          rowHeight: ROW_HEIGHT,
          headerHeight: HEADER_HEIGHT,
          viewportInnerSize: EMPTY_SIZE,
          viewportOuterSize: EMPTY_SIZE,
        }
      },
      getRootDimensions: () => apiRef.current.state.dimensions,
      eventManager: new EventManager(),
      publishEvent: (eventName, ...args) => {
        apiRef.current.eventManager.emit(eventName, ...args);
      },
      subscribeEvent: (eventName, listener) => {
        apiRef.current.eventManager.on(eventName, listener);
        return () => {
          apiRef.current.eventManager.removeListener(eventName, listener);
        };
      },
    };
  }

  useGridPagination(apiRef, props);

  useGridRowsMeta(apiRef, props);

  useGridDimensions(apiRef)

  useVirtualScroller(apiRef)

  const dimensions = apiRef.current.state.dimensions;

  const {pageSize, page} = apiRef.current.state.pagination.paginationModel;

  const rowCount = Math.ceil(props.rowCount || 0);

  const totalPages = pageSize ? Math.ceil(rowCount / pageSize) : 1;

  const setPage = useCallback((page: number) => {
    apiRef.current.setState(state => ({
      ...state,
      pagination: {
        ...state.pagination,
        paginationModel: {
          ...state.pagination.paginationModel,
          page
        }
      }
    }))
    apiRef.current.forceRerender();
  }, [apiRef])

  return (
    <GridRoot>
      <div
        style={{
          ...styles.container,
          ...style,
        }}
        {...apiRef.current.getContainerProps()}
      >
        <div style={styles.headerRow}>
          {columns.map((column) => (
            <div
              style={{
                ...styles.header,
                height: dimensions.headerHeight,
                width: COLUMN_WIDTH,
              }}
              key={column.field}
            >
              {column.renderHeader ? column.renderHeader(column): column.headerName}
            </div>
          ))}
        </div>
        <div style={{
          ...styles.body
        }}>
          {rows.map((row) => (
            <div
              style={{
                ...styles.row,
                height: dimensions.rowHeight,
              }}
              key={row.id}
            >
              {columns.map((column) => (
                <div
                  style={{
                    ...styles.cell,
                    width: COLUMN_WIDTH
                  }}
                  key={column.field}
                >
                  {row[column.field]}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div style={styles.footer}>
          {!!rowCount && (
            <div style={styles.paginationContainer}>
              <div>
                {(page) * pageSize + 1}-{Math.min(rowCount, (page + 1) * pageSize)} of
                of {rowCount} &nbsp;
              </div>

              <Pagination
                max={totalPages}
                page={page + 1}
                onPageChange={(page) => setPage(page - 1)}
              />
            </div>
          )}
        </div>
      </div>
    </GridRoot>
  );
};

const useGridPagination = (apiRef: MutableRefObject<GridApi>,  props: DataGridProps) => {
  const {paginationModel} = props;

  const setPaginationModel = useCallback((model: GridPaginationModel) => {
    apiRef.current.setState((state) => ({
      ...state,
      pagination: {
        ...state.pagination,
        paginationModel: {
          ...state.pagination.paginationModel,
          ...model
        }
      },
    }));
  }, [apiRef])
  // inside useGridPagination
  useEffect(() => {
    if(paginationModel) {
      setPaginationModel(paginationModel);
    }
  }, [setPaginationModel, paginationModel]);
  // ----
}

const useVirtualScroller = (apiRef: MutableRefObject<GridApi>) => {
  const rowsMeta = apiRef.current.state.rowsMeta;
  const {ref: bodyRef} = apiRef.current.getContainerProps();
  // inside useVirtualScroller
  useResizeObserver(bodyRef, () => {
    apiRef.current.resize();
  });

  useLayoutEffect(() => {
    apiRef.current.resize();
  }, [apiRef, rowsMeta.currentPageTotalHeight]);
  // ----
}

const useEnhancedEffect = typeof window !== 'undefined' ? useLayoutEffect: useEffect;

const GridRoot = ({children}: PropsWithChildren) => {
  // Our implementation of <NoSsr />
  const [mountedState, setMountedState] = useState(false);
  useEnhancedEffect(() => {
    setMountedState(true);
  }, []);

  if (!mountedState) {
    return null;
  }
  return children;
}

const useGridDimensions = (apiRef: MutableRefObject<GridApi>) => {
  const [savedSize, setSavedSize] = useState<ElementSize>();
  const previousSize = useRef<ElementSize>();
  const rootDimensionsRef = useRef(EMPTY_SIZE);
  const {ref: bodyRef} = apiRef.current.getContainerProps();
  const rowsMeta = apiRef.current.state.rowsMeta;

  const handleResize = useCallback((size: ElementSize) => {
    rootDimensionsRef.current = size;
    setSavedSize(size);
  }, []);

  const resize = useCallback(() => {
    const element = bodyRef.current;
    if (!element) {
      return;
    }

    const computedStyle = ownerWindow(element).getComputedStyle(element);

    const height = parseFloat(computedStyle.height) || 0;
    const width = parseFloat(computedStyle.width) || 0;

    const hasHeightChanged = height !== previousSize.current?.height;
    const hasWidthChanged = width !== previousSize.current?.width;

    if (!previousSize.current || hasHeightChanged || hasWidthChanged) {
      const size = { width, height };
      // publish resize
      handleResize(size);
      previousSize.current = size;
    }
  }, [handleResize, bodyRef]);

  const updateDimensions = useCallback(() => {

    const viewportOuterSize = {
      width: rootDimensionsRef.current.width,
      height: rootDimensionsRef.current.height,
    };

    const viewportInnerSize = {
      width: Math.max(0, viewportOuterSize.width),
      height: Math.max(0, viewportOuterSize.height - HEADER_HEIGHT - FOOTER_HEIGHT),
    }

    const newDimensions: GridDimensions = {
      rowHeight: ROW_HEIGHT,
      headerHeight: HEADER_HEIGHT,
      viewportOuterSize,
      viewportInnerSize,
    };

    const prevDimensions = apiRef.current.getRootDimensions();
    apiRef.current.setState((state) =>({
      ...state,
      dimensions: newDimensions
    }))

    if (
      !isElementSizesEqual(
        newDimensions.viewportInnerSize,
        prevDimensions.viewportInnerSize,
      )
    ) {
      apiRef.current.publishEvent(
        "viewportInnerSizeChange",
        newDimensions.viewportInnerSize,
      );
    }

    apiRef.current.forceRerender();
  }, [apiRef, rowsMeta.currentPageTotalHeight]);

  apiRef.current.resize = resize;

  useLayoutEffect(() => {
    if (savedSize) {
      updateDimensions();
    }
  }, [savedSize, updateDimensions]);

  useLayoutEffect(updateDimensions, [updateDimensions]);
}

const useGridRowsMeta = (apiRef: MutableRefObject<GridApi>, props: DataGridProps) => {
  const {rows} = props;
  const hydrateRowsMeta = useCallback(() => {
    apiRef.current.setState(state => ({
      ...state,
      rowsMeta: {
        currentPageTotalHeight: rows.length * ROW_HEIGHT,
      }
    }))
  }, [apiRef, rows])

  useEffect(() => {
    hydrateRowsMeta();
  }, [hydrateRowsMeta]);
}



const styles = {
  container: {
    border: "1px solid black",
    borderRadius: "6px",
    display: 'flex',
    flexDirection: 'column'
  },
  headerRow: {
    display: "flex",
    borderBottom: "1px solid black",
  },
  headerFilterRow: {
    display: "flex",
    borderBottom: "1px solid black",
  },
  body: {
    flexGrow: 1,
    minHeight: 0
  },
  header: {
    display: "flex",
    alignItems: "center",
    padding: "0 10px",
    borderRight: "1px solid black",
  },
  headerFilter: {
    display: "flex",
    alignItems: "center",
    padding: "0 10px",
    borderRight: "1px solid black",
  },
  row: {
    display: "flex",
    borderBottom: "1px solid black",
  },
  cell: {
    display: "flex",
    alignItems: "center",
    padding: "0 10px",
    borderRight: "1px solid black",
  },
  paginationContainer: { display: "flex", gap: 20 },
  footer: {
    padding: "0 20px",
    justifyContent: "end",
    alignItems: 'center',
    display: 'flex',
    borderTop: "1px solid black",
    height: FOOTER_HEIGHT
  }
} as const;

