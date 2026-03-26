// GraphQL queries and mutations for the Xray Test entity (02-02).
// All queries use parameterized variables (GQL-01 — no string interpolation).
// Resolver count comments are mandatory per D-23 to prevent hitting the 25-resolver limit.

// ---------------------------------------------------------------------------
// Read queries
// ---------------------------------------------------------------------------

/**
 * TOON variant: minimal fields for token-efficient responses.
 * Resolver count: ~6 (getTest, testType, status, jira, steps, steps.nodes)
 */
export const GET_TEST_TOON = `
  query GetTest($issueId: String!) {
    getTest(issueId: $issueId) {
      issueId
      testType { name }
      status { name }
      jira(fields: ["key", "summary"])
      steps {
        id
        action
        data
        result
      }
    }
  }
`;

/**
 * FULL variant: all fields including relations.
 * Resolver count: ~18 (getTest, testType, status, jira, steps,
 *   steps.customFields, steps.attachments, folder, preconditions,
 *   preconditions.results, preconditions.results.jira, testSets,
 *   testSets.results, testPlans, testPlans.results, testExecutions,
 *   testExecutions.results)
 * SAFE: 18 < 25 resolver limit. If approaching limit, remove testSets/testPlans
 * relation fields first.
 */
export const GET_TEST_FULL = `
  query GetTest($issueId: String!) {
    getTest(issueId: $issueId) {
      issueId
      projectId
      testType { name kind }
      status { name description color }
      jira(fields: ["key", "summary", "assignee", "priority", "labels"])
      folder { path }
      steps {
        id
        action
        data
        result
        customFields { id name value }
        attachments { id filename }
      }
      preconditions(limit: 100) {
        total
        results {
          issueId
          jira(fields: ["key", "summary"])
        }
      }
      testSets(limit: 100) {
        total
        results { issueId }
      }
      testPlans(limit: 100) {
        total
        results { issueId }
      }
      testExecutions(limit: 100) {
        total
        results { issueId }
      }
    }
  }
`;

/**
 * TOON variant for expanded test (resolves call-test steps).
 * Uses getTest with callTestStep nesting to resolve call-test steps.
 * Resolver count: ~10 (getTest, testType, status, jira, steps, steps.nodes,
 *   callTestStep, callTestStep.test, callTestStep.test.jira,
 *   callTestStep.steps, callTestStep.steps.nodes)
 * FALLBACK NOTE: If live Xray schema does not support callTestStep nesting,
 * fall back to standard getTest query with base step fields.
 */
export const GET_EXPANDED_TEST_TOON = `
  query GetExpandedTest($issueId: String!) {
    getTest(issueId: $issueId) {
      issueId
      testType { name }
      status { name }
      jira(fields: ["key", "summary"])
      steps {
        id
        action
        data
        result
        callTestStep {
          test {
            issueId
            jira(fields: ["key", "summary"])
          }
          steps {
            id
            action
            data
            result
          }
        }
      }
    }
  }
`;

/**
 * FULL variant for expanded test.
 * Resolver count: ~22 (getTest, testType, status, jira, steps,
 *   callTestStep, callTestStep.test, callTestStep.test.jira,
 *   callTestStep.test.testType, callTestStep.steps,
 *   folder, preconditions, preconditions.results, preconditions.results.jira,
 *   testSets, testSets.results, testPlans, testPlans.results,
 *   testExecutions, testExecutions.results)
 * NEAR LIMIT: 22 of 25 max resolvers. Do NOT add extra relation connections.
 * FALLBACK NOTE: If callTestStep is unavailable, fall back to GET_TEST_FULL.
 */
export const GET_EXPANDED_TEST_FULL = `
  query GetExpandedTest($issueId: String!) {
    getTest(issueId: $issueId) {
      issueId
      projectId
      testType { name kind }
      status { name description color }
      jira(fields: ["key", "summary", "assignee", "priority"])
      folder { path }
      steps {
        id
        action
        data
        result
        callTestStep {
          test {
            issueId
            testType { name }
            jira(fields: ["key", "summary"])
          }
          steps {
            id
            action
            data
            result
          }
        }
      }
      preconditions(limit: 100) {
        total
        results {
          issueId
          jira(fields: ["key", "summary"])
        }
      }
      testSets(limit: 100) {
        total
        results { issueId }
      }
      testPlans(limit: 100) {
        total
        results { issueId }
      }
      testExecutions(limit: 100) {
        total
        results { issueId }
      }
    }
  }
`;

/**
 * TOON list variant: minimal fields for paginated results.
 * Resolver count: ~7 (getTests, total, results, testType, status, jira, steps.nodes count)
 */
export const LIST_TESTS_TOON = `
  query GetTests($jql: String, $limit: Int!, $start: Int, $folder: FolderSearchInput) {
    getTests(jql: $jql, limit: $limit, start: $start, folder: $folder) {
      total
      results {
        issueId
        testType { name }
        status { name }
        jira(fields: ["key", "summary"])
        folder { path }
        steps { id }
      }
    }
  }
`;

/**
 * FULL list variant: all fields for paginated results.
 * Resolver count: ~12 (getTests, total, results, testType, status, jira,
 *   folder, steps, steps.nodes, steps.customFields, preconditions,
 *   preconditions.results)
 */
export const LIST_TESTS_FULL = `
  query GetTests($jql: String, $limit: Int!, $start: Int, $folder: FolderSearchInput) {
    getTests(jql: $jql, limit: $limit, start: $start, folder: $folder) {
      total
      results {
        issueId
        projectId
        testType { name kind }
        status { name description color }
        jira(fields: ["key", "summary", "assignee", "priority", "labels"])
        folder { path }
        steps {
          id
          action
          data
          result
        }
        preconditions(limit: 10) {
          total
          results { issueId }
        }
      }
    }
  }
`;

// ---------------------------------------------------------------------------
// Mutation strings
// ---------------------------------------------------------------------------

export const CREATE_TEST = `
  mutation CreateTest(
    $jira: JSON!
    $testType: UpdateTestTypeInput
    $folderPath: String
    $steps: [CreateStepInput!]
    $gherkin: String
    $preconditionIssueIds: [String!]
  ) {
    createTest(
      jira: $jira
      testType: $testType
      folderPath: $folderPath
      steps: $steps
      gherkin: $gherkin
      preconditionIssueIds: $preconditionIssueIds
    ) {
      test {
        issueId
        jira(fields: ["key", "summary"])
      }
      warnings
    }
  }
`;

export const DELETE_TEST = `
  mutation DeleteTest($issueId: String!) {
    deleteTest(issueId: $issueId)
  }
`;

export const UPDATE_TEST_TYPE = `
  mutation UpdateTestType($issueId: String!, $testType: UpdateTestTypeInput!) {
    updateTestType(issueId: $issueId, testType: $testType) {
      issueId
    }
  }
`;

export const UPDATE_GHERKIN_DEFINITION = `
  mutation UpdateGherkinTestDefinition($issueId: String!, $gherkin: String!) {
    updateGherkinTestDefinition(issueId: $issueId, gherkin: $gherkin) {
      issueId
    }
  }
`;

export const UPDATE_UNSTRUCTURED_DEFINITION = `
  mutation UpdateUnstructuredTestDefinition($issueId: String!, $unstructured: String!) {
    updateUnstructuredTestDefinition(issueId: $issueId, unstructured: $unstructured) {
      issueId
    }
  }
`;

export const ADD_TEST_STEP = `
  mutation AddTestStep($issueId: String!, $step: CreateStepInput!) {
    addTestStep(issueId: $issueId, step: $step) {
      id
      action
      data
      result
    }
  }
`;

export const UPDATE_TEST_STEP = `
  mutation UpdateTestStep($stepId: String!, $step: UpdateStepInput!) {
    updateTestStep(stepId: $stepId, step: $step) {
      id
      action
      data
      result
    }
  }
`;

export const REMOVE_TEST_STEP = `
  mutation RemoveTestStep($stepId: String!) {
    removeTestStep(stepId: $stepId)
  }
`;

export const REMOVE_ALL_TEST_STEPS = `
  mutation RemoveAllTestSteps($issueId: String!) {
    removeAllTestSteps(issueId: $issueId)
  }
`;
