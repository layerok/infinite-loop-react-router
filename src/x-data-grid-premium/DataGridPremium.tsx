import { ElementSize, useResizeObserver } from "@mui/x-data-grid-premium";
import { ownerWindow} from "@mui/material";
import { EventManager } from "./EventManager";
import React, {
  HTMLAttributes,
  useLayoutEffect,
  useState,
  useRef,
  useCallback,
  MutableRefObject, useEffect, ReactNode, PropsWithChildren, forwardRef,
} from "react";
import {Pagination} from "./Pagination.tsx";
import {useGridApiRef} from "./useGridApiRef.ts";
import {useForceRerender} from "./useForceRerender.ts";
import {GridApiContext, GridRootPropsContext} from "./context.ts";
import {useGridRootProps} from "./useGridRootProps.ts";
import {useGridApiContext} from "./useGridApiContext.ts";

const EMPTY_SIZE: ElementSize = { width: 0, height: 0 };

const areElementSizesEqual = (a: ElementSize, b: ElementSize) => {
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
  dimensions: GridDimensions;
  pagination: {
    paginationModel: GridPaginationModel;
  }
}

export type GridApi = {
  mainElementRef: MutableRefObject<HTMLDivElement | null>;
  state: GridState;
  setState: (state: GridState | {(state: GridState): GridState}) => void;
  getRootDimensions: () => GridDimensions;
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
  paginationMode?: PaginationModel
} & HTMLAttributes<HTMLDivElement>;

export const DataGridPremiumRaw = forwardRef(function DataGridPremiumRaw(props: DataGridProps)  {
  const {apiRef: apiRefProp, onPaginationModelChange } = props;
  const localApiRef = useGridApiRef();
  const apiRef = apiRefProp || localApiRef;
  const forceRerender = useForceRerender();
  const mainRef = useRef<HTMLDivElement | null>(null);

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
      mainElementRef: mainRef,
      resize: () => {},
      forceRerender: forceRerender,
      setState,
      state: {
        pagination: {
          paginationModel: {
            page: 0,
            pageSize: 100
          }
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


  useGridDimensions(apiRef)

  return (
    <GridApiContext.Provider value={apiRef}>
      <GridRootPropsContext.Provider value={props}>
        <GridRoot>
          <GridVirtualScroller/>
        </GridRoot>
      </GridRootPropsContext.Provider>
    </GridApiContext.Provider>
  );
});

export const DataGridPremium = React.memo(DataGridPremiumRaw)


const GridVirtualScroller = (props: PropsWithChildren) => {
  const {children} = props;
  const apiRef = useGridApiContext();
  const rootProps = useGridRootProps();
  const dimensions = apiRef.current.state.dimensions;
  const {pageSize, page} = apiRef.current.state.pagination.paginationModel;

  const rowCount = Math.ceil(rootProps.rowCount || 0);

  const totalPages = pageSize ? Math.ceil(rowCount / pageSize) : 1;

  const setPage = useCallback(function setPage(page: number)  {
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

  const {getContainerProps} = useGridVirtualScroller(apiRef)

  return <div
    style={{
      ...styles.container,
      ...rootProps.style,
    }}
    {...getContainerProps()}
  >

    <div style={styles.headerRow}>
      {rootProps.columns.map((colDef) => (
        <div
          style={{
            ...styles.header,
            height: apiRef.current.state.dimensions.headerHeight,
            width: COLUMN_WIDTH,
          }}
          key={colDef.field}
        >
          {colDef.renderHeader ? colDef.renderHeader(colDef): colDef.headerName}
        </div>
      ))}
    </div>


    <div style={{
      ...styles.body
    }}>
      {rootProps.rows.map((row) => (
        <div
          style={{
            ...styles.row,
            height: dimensions.rowHeight,
          }}
          key={row.id}
        >
          {rootProps.columns.map((column) => (
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
    {children}
  </div>
}



const useGridPagination = (apiRef: MutableRefObject<GridApi>,  props: DataGridProps) => {
  const {paginationModel} = props;

  const setPaginationModel = useCallback(function setPaginationModel(model: GridPaginationModel)  {
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
  useEffect(function syncPaginationModelEffect()  {
    if(paginationModel) {
      setPaginationModel(paginationModel);
    }
  }, [setPaginationModel, paginationModel]);
  // ----
}

const useGridVirtualScroller = (apiRef: MutableRefObject<GridApi>) => {

  const mainRef = apiRef.current.mainElementRef;

  useResizeObserver(mainRef, () => {
    apiRef.current.resize();
  });

  useLayoutEffect(function resizeLayoutEffect()  {
    apiRef.current.resize();
  }, [apiRef]);

  return {
    getContainerProps: () => ({
      ref: mainRef
    })
  }
}

const GridRoot = ({children}: PropsWithChildren) => {
  // Our implementation of <NoSsr />
  const [mountedState, setMountedState] = useState(false);
  useLayoutEffect(function noSsrLayoutEffect()  {
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


  const handleResize = useCallback(function handleResize(size: ElementSize)  {
    rootDimensionsRef.current = size;
    setSavedSize(size);
  }, []);

  const resize = useCallback(function resize()  {
    const element = apiRef.current.mainElementRef.current;
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
  }, [apiRef, handleResize]);

  const updateDimensions = useCallback(function updateDimensions()  {

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
      !areElementSizesEqual(
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
  }, [apiRef]);

  apiRef.current.resize = resize;

  useLayoutEffect(function layoutEffectSavedSize()  {
    if (savedSize) {
      updateDimensions();
    }
  }, [savedSize, updateDimensions]);

  useLayoutEffect(function layoutEffectUpdateDimensions()  {
    updateDimensions()
  }, [updateDimensions]);
}

const styles = {
  container: {
    border: "1px solid black",
    borderRadius: "6px",
    display: 'flex',
    flexDirection: 'column'
  },
  body: {
    flexGrow: 1,
    minHeight: 0
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
  },
  headerRow: {
    display: "flex",
    borderBottom: "1px solid black",
  },
  header: {
    display: "flex",
    alignItems: "center",
    padding: "0 10px",
    borderRight: "1px solid black",
  },
} as const;

