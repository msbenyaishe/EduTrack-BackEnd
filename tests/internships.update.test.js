const test = require("node:test");
const assert = require("node:assert/strict");

function clearModule(modulePath) {
  delete require.cache[require.resolve(modulePath)];
}

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function loadControllerWithMockedPool(controllerPath, poolQueryMock) {
  const dbPath = "../config/db";

  clearModule(dbPath);
  require.cache[require.resolve(dbPath)] = {
    id: require.resolve(dbPath),
    filename: require.resolve(dbPath),
    loaded: true,
    exports: { query: poolQueryMock },
  };

  clearModule(controllerPath);
  return require(controllerPath);
}

test("student updates own internship successfully", async () => {
  const poolQueryMock = async (sql) => {
    if (sql.startsWith("SELECT id, student_id FROM internships")) {
      return [[{ id: 15, student_id: 5 }]];
    }
    if (sql.startsWith("UPDATE internships")) {
      return [{ affectedRows: 1 }];
    }
    if (sql.startsWith("SELECT id, company_name, supervisor_name, start_date, end_date")) {
      return [[{
        id: 15,
        company_name: "Acme Corp",
        supervisor_name: "Jane Doe",
        start_date: "2026-01-01",
        end_date: "2026-03-01",
      }]];
    }
    return [[]];
  };

  const { updateInternship } = loadControllerWithMockedPool("../controllers/internshipController", poolQueryMock);
  const req = {
    user: { id: 5 },
    params: { id: "15" },
    body: {
      company_name: "Acme Corp",
      supervisor_name: "Jane Doe",
      start_date: "2026-01-01",
      end_date: "2026-03-01",
    },
  };
  const res = createMockRes();

  await updateInternship(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.message, "Internship updated");
  assert.equal(res.body.data.id, 15);
});

test("student cannot update internship of another student", async () => {
  const poolQueryMock = async (sql) => {
    if (sql.startsWith("SELECT id, student_id FROM internships")) {
      return [[{ id: 16, student_id: 99 }]];
    }
    throw new Error("No further queries expected");
  };

  const { updateInternship } = loadControllerWithMockedPool("../controllers/internshipController", poolQueryMock);
  const req = {
    user: { id: 5 },
    params: { id: "16" },
    body: {
      company_name: "Acme Corp",
      supervisor_name: "Jane Doe",
      start_date: "2026-01-01",
      end_date: "2026-03-01",
    },
  };
  const res = createMockRes();

  await updateInternship(req, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.message, "Unauthorized to update this internship");
});

test("invalid internship date range is rejected", async () => {
  const { updateInternship } = loadControllerWithMockedPool("../controllers/internshipController", async () => {
    throw new Error("DB should not be called");
  });
  const req = {
    user: { id: 5 },
    params: { id: "17" },
    body: {
      company_name: "Acme Corp",
      supervisor_name: "Jane Doe",
      start_date: "2026-03-02",
      end_date: "2026-03-01",
    },
  };
  const res = createMockRes();

  await updateInternship(req, res);

  assert.equal(res.statusCode, 422);
  assert.equal(res.body.message, "Validation failed");
  assert.equal(res.body.errors.end_date, "end_date must be the same day or after start_date");
});

test("missing required fields are rejected", async () => {
  const { updateInternship } = loadControllerWithMockedPool("../controllers/internshipController", async () => {
    throw new Error("DB should not be called");
  });
  const req = {
    user: { id: 5 },
    params: { id: "18" },
    body: {
      company_name: "",
      supervisor_name: " ",
      start_date: "",
      end_date: "",
    },
  };
  const res = createMockRes();

  await updateInternship(req, res);

  assert.equal(res.statusCode, 422);
  assert.equal(res.body.message, "Validation failed");
  assert.equal(res.body.errors.company_name, "company_name is required");
  assert.equal(res.body.errors.supervisor_name, "supervisor_name is required");
  assert.equal(res.body.errors.start_date, "start_date must be a valid YYYY-MM-DD date");
  assert.equal(res.body.errors.end_date, "end_date must be a valid YYYY-MM-DD date");
});

test("internship id not found returns 404", async () => {
  const poolQueryMock = async (sql) => {
    if (sql.startsWith("SELECT id, student_id FROM internships")) {
      return [[]];
    }
    throw new Error("No further queries expected");
  };

  const { updateInternship } = loadControllerWithMockedPool("../controllers/internshipController", poolQueryMock);
  const req = {
    user: { id: 5 },
    params: { id: "9999" },
    body: {
      company_name: "Acme Corp",
      supervisor_name: "Jane Doe",
      start_date: "2026-01-01",
      end_date: "2026-03-01",
    },
  };
  const res = createMockRes();

  await updateInternship(req, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.message, "Internship not found");
});
