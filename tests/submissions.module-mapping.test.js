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

test("GET /students/submissions returns sprint module_title via sprint->module join", async () => {
  const calls = [];
  const poolQueryMock = async (sql) => {
    calls.push(sql);

    if (sql.includes("FROM workshop_submissions")) return [[]];
    if (sql.includes("FROM sprint_submissions")) {
      return [[{ id: 10, sprint_title: "Sprint 1", module_title: "Backend Module" }]];
    }
    if (sql.includes("FROM pfe_submissions")) return [[]];
    return [[]];
  };

  const { getSubmissions } = loadControllerWithMockedPool("../controllers/studentController", poolQueryMock);
  const req = { user: { id: 3 } };
  const res = createMockRes();

  await getSubmissions(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.sprintSubmissions[0].module_title, "Backend Module");

  const sprintSql = calls.find((sql) => sql.includes("FROM sprint_submissions"));
  assert.ok(sprintSql.includes("JOIN modules m ON sp.module_id = m.id"));
  assert.ok(sprintSql.includes("m.title AS module_title"));
});

test("GET /teachers/submissions returns sprint module_title when relation exists", async () => {
  const calls = [];
  const poolQueryMock = async (sql) => {
    calls.push(sql);

    if (sql.includes("FROM workshop_submissions")) return [[]];
    if (sql.includes("FROM sprint_submissions")) {
      return [[{ id: 20, sprint_title: "Sprint 2", module_title: "DevOps Module" }]];
    }
    if (sql.includes("FROM pfe_submissions")) return [[]];
    return [[]];
  };

  const { getSubmissionsDashboard } = loadControllerWithMockedPool("../controllers/teacherController", poolQueryMock);
  const req = { user: { id: 7 } };
  const res = createMockRes();

  await getSubmissionsDashboard(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.sprintSubmissions[0].module_title, "DevOps Module");

  const sprintSql = calls.find((sql) => sql.includes("FROM sprint_submissions"));
  assert.ok(sprintSql.includes("JOIN modules m ON sp.module_id = m.id"));
  assert.ok(sprintSql.includes("m.title AS module_title"));
});
