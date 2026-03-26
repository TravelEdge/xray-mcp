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
  mutation AddDefectsToTestRun($id: String!, $issueIds: [String!]!) {
    addDefectsToTestRun(id: $id, issueIds: $issueIds) {
      warnings
    }
  }
`;

export const REMOVE_DEFECTS_FROM_RUN = `
  mutation RemoveDefectsFromTestRun($id: String!, $issueIds: [String!]!) {
    removeDefectsFromTestRun(id: $id, issueIds: $issueIds) {
      warnings
    }
  }
`;

export const ADD_EVIDENCE_TO_STEP = `
  mutation AddEvidenceToTestRunStep($runId: String!, $stepId: String!, $evidence: [TestRunEvidenceInput!]!) {
    addEvidenceToTestRunStep(runId: $runId, stepId: $stepId, evidence: $evidence) {
      warnings
    }
  }
`;

export const REMOVE_EVIDENCE_FROM_STEP = `
  mutation RemoveEvidenceFromTestRunStep($runId: String!, $stepId: String!, $evidenceIds: [String!]!) {
    removeEvidenceFromTestRunStep(runId: $runId, stepId: $stepId, evidenceIds: $evidenceIds) {
      warnings
    }
  }
`;

export const ADD_DEFECTS_TO_STEP = `
  mutation AddDefectsToTestRunStep($runId: String!, $stepId: String!, $issueIds: [String!]!) {
    addDefectsToTestRunStep(runId: $runId, stepId: $stepId, issueIds: $issueIds) {
      warnings
    }
  }
`;

export const REMOVE_DEFECTS_FROM_STEP = `
  mutation RemoveDefectsFromTestRunStep($runId: String!, $stepId: String!, $issueIds: [String!]!) {
    removeDefectsFromTestRunStep(runId: $runId, stepId: $stepId, issueIds: $issueIds) {
      warnings
    }
  }
`;
