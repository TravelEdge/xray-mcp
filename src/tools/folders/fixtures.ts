import type { XrayFolder } from "../../types/index.js";

/** Mock folder for unit tests. */
export const mockFolder: XrayFolder = {
  name: "Login",
  path: "/Regression/Login",
  testsCount: 5,
  folders: [
    {
      name: "UI",
      path: "/Regression/Login/UI",
      testsCount: 3,
    },
    {
      name: "API",
      path: "/Regression/Login/API",
      testsCount: 2,
    },
  ],
};

/** Mock folder response for getFolder GraphQL query. */
export const mockGetFolderResponse = {
  getFolder: mockFolder,
};

/** Mock response for createFolder mutation. */
export const mockCreateFolderResponse = {
  createFolder: {
    folder: {
      name: "Login",
      path: "/Regression/Login",
      testsCount: 0,
    },
    warnings: [],
  },
};

/** Mock response for renameFolder mutation. */
export const mockRenameFolderResponse = {
  renameFolder: {
    folder: {
      name: "Auth",
      path: "/Regression/Auth",
      testsCount: 5,
    },
    warnings: [],
  },
};

/** Mock response for moveFolder mutation. */
export const mockMoveFolderResponse = {
  moveFolder: {
    folder: {
      name: "Login",
      path: "/Smoke/Login",
      testsCount: 5,
    },
    warnings: [],
  },
};

/** Mock response for addTestsToFolder mutation. */
export const mockAddTestsToFolderResponse = {
  addTestsToFolder: {
    folder: {
      name: "Login",
      path: "/Regression/Login",
      testsCount: 7,
    },
    warnings: [],
  },
};

/** Mock response for addIssuesToFolder mutation. */
export const mockAddIssuesToFolderResponse = {
  addIssuesToFolder: {
    folder: {
      name: "Login",
      path: "/Regression/Login",
      testsCount: 5,
    },
    warnings: [],
  },
};
