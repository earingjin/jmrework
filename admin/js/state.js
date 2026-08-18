const state = {
  view: "login",
  user: null,
  active: "admin",
  authRestoreMessage: "",
  data: {
    accounts: [],
    reports: [],
    notices: [],
    successCases: [],
    successCaseBatches: [],
    geminiErrors: [],
  },
  importResult: null,
  successCaseImportResult: null,
  statisticsPeriod: {
    preset: "all",
    start: "",
    end: "",
  },
};
