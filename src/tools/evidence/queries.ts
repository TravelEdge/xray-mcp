/** GraphQL mutations for evidence and defect operations (WEVID-01..08). */

export const ADD_EVIDENCE_TO_RUN = `
  mutation AddEvidenceToTestRun($id: String!, $evidence: [TestRunEvidenceInput!]!) {
    addEvidenceToTestRun(id: $id, evidence: $evidence) {
      warnings
    }
  }
`;

export const REMOVE_EVIDENCE_FROM_RUN = `
  mutation RemoveEvidenceFromTestRun($id: String!, $evidenceIds: [String!]!) {
    removeEvidenceFromTestRun(id: $id, evidenceIds: $evidenceIds) {
      warnings
    }
  }
`;

export const ADD_DEFECTS_TO_RUN = `
  mutation AddDefectsToTestRun($id: String!, $issues: [String!]!) {
    addDefectsToTestRun(id: $id, issues: $issues) {
      warnings
    }
  }
`;

export const REMOVE_DEFECTS_FROM_RUN = `
  mutation RemoveDefectsFromTestRun($id: String!, $issues: [String!]!) {
    removeDefectsFromTestRun(id: $id, issues: $issues) {
      warnings
    }
  }
`;

export const ADD_EVIDENCE_TO_STEP = `
  mutation AddEvidenceToTestRunStep($testRunId: String!, $stepId: String!, $evidence: [TestRunEvidenceInput!]!) {
    addEvidenceToTestRunStep(testRunId: $testRunId, stepId: $stepId, evidence: $evidence) {
      warnings
    }
  }
`;

export const REMOVE_EVIDENCE_FROM_STEP = `
  mutation RemoveEvidenceFromTestRunStep($testRunId: String!, $stepId: String!, $evidenceIds: [String!]!) {
    removeEvidenceFromTestRunStep(testRunId: $testRunId, stepId: $stepId, evidenceIds: $evidenceIds) {
      warnings
    }
  }
`;

export const ADD_DEFECTS_TO_STEP = `
  mutation AddDefectsToTestRunStep($testRunId: String!, $stepId: String!, $issues: [String!]!) {
    addDefectsToTestRunStep(testRunId: $testRunId, stepId: $stepId, issues: $issues) {
      warnings
    }
  }
`;

export const REMOVE_DEFECTS_FROM_STEP = `
  mutation RemoveDefectsFromTestRunStep($testRunId: String!, $stepId: String!, $issues: [String!]!) {
    removeDefectsFromTestRunStep(testRunId: $testRunId, stepId: $stepId, issues: $issues) {
      warnings
    }
  }
`;
