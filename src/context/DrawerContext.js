import React from 'react';

export const DrawerCtx = React.createContext({ openDrawer: () => {} });
export const useDrawer = () => React.useContext(DrawerCtx);
