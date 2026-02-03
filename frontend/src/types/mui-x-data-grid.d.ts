// Declaración de módulo temporal para resolver TS2307 en @mui/x-data-grid
// Esto evita el error de compilación mientras TypeScript no detecta los tipos del paquete.
// Cuando el error desaparezca (por actualización de dependencias o caché), se puede eliminar.
declare module '@mui/x-data-grid' {
  import * as React from 'react';
  import { SxProps, Theme } from '@mui/material/styles';

  export interface GridColDef<T = any> {
    field: string;
    headerName?: string;
    width?: number;
    flex?: number;
    minWidth?: number;
    valueFormatter?: (params: any) => string;
    renderCell?: (params: GridRenderCellParams<T>) => React.ReactNode;
  }

  export interface GridRenderCellParams<T = any> {
    id: any;
    field: string;
    value: any;
    row: T;
  }

  export interface DataGridProps<T = any> {
    rows: T[];
    columns: GridColDef<T>[];
    getRowId?: (row: T) => any;
    pageSizeOptions?: number[];
    paginationMode?: 'client' | 'server';
    rowCount?: number;
    paginationModel?: { page: number; pageSize: number };
    onPaginationModelChange?: (model: { page: number; pageSize: number }) => void;
    loading?: boolean;
    disableRowSelectionOnClick?: boolean;
    sx?: SxProps<Theme>;
  }

  export const DataGrid: React.ComponentType<DataGridProps>;
}