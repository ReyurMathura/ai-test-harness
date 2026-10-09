import fs from 'fs';
import path from 'path';

const planPath = process.argv[2];

if (!planPath) {
  console.error(
    'Usage: node scripts/render-test-plan.mjs <test-plan-json>'
  );
  process.exit(1);
}

if (!fs.existsSync(planPath)) {
  console.error(
    `Test plan not found: ${planPath}`
  );
  process.exit(1);
}

const plan = JSON.parse(
  fs.readFileSync(planPath, 'utf-8')
);

const lines = [];

function add(line = '') {
  lines.push(line);
}

function escapeTable(value) {
  return String(value ?? '')
    .replaceAll('|', '\\|')
    .replaceAll('\n', ' ');
}

function renderScenario(scenario) {
  add(`## ${scenario.id} — ${scenario.title}`);
  add('');

  add('| Attribute | Value |');
  add('|---|---|');
  add(`| Priority | ${escapeTable(scenario.priority)} |`);
  add(`| Type | ${escapeTable(scenario.type)} |`);
  add(`| Source | ${escapeTable(scenario.source)} |`);
  add(
    `| Automation Ready | ${scenario.automationReady ? 'Yes' : 'No'} |`
  );

  if (scenario.requirementReference) {
    add(
      `| Requirement | ${escapeTable(scenario.requirementReference)} |`
    );
  }

  add('');

  if (scenario.preconditions?.length) {
    add('### Preconditions');
    add('');

    for (const precondition of scenario.preconditions) {
      add(`- ${precondition}`);
    }

    add('');
  }

  if (scenario.testData?.length) {
    add('### Test Data');
    add('');
    add('| Name | Value |');
    add('|---|---|');

    for (const item of scenario.testData) {
      const value =
        item.value === ''
          ? '_empty_'
          : item.value;

      add(
        `| ${escapeTable(item.name)} | ${escapeTable(value)} |`
      );
    }

    add('');
  }

  add('### Steps');
  add('');

  scenario.steps.forEach((step, index) => {
    add(`${index + 1}. ${step}`);
  });

  add('');

  add('### Expected Result');
  add('');
  add(scenario.expectedResult);
  add('');

  add('### Requirement Evidence');
  add('');
  add(scenario.evidence);
  add('');

  if (scenario.assumptions?.length) {
    add('### Assumptions');
    add('');

    for (const assumption of scenario.assumptions) {
      add(`- ${assumption}`);
    }

    add('');
  }

  if (scenario.rationale) {
    add('### Rationale');
    add('');
    add(scenario.rationale);
    add('');
  }

  add('---');
  add('');
}


// Header

add(`# Test Plan — ${plan.feature}`);
add('');
add(plan.summary);
add('');


// Summary

const requirementScenarios =
  plan.scenarios.filter(
    scenario => scenario.source === 'requirement'
  );

const exploratoryScenarios =
  plan.scenarios.filter(
    scenario => scenario.source === 'exploratory'
  );

const automationReady =
  plan.scenarios.filter(
    scenario => scenario.automationReady
  );

add('## Overview');
add('');
add('| Metric | Count |');
add('|---|---:|');
add(`| Total scenarios | ${plan.scenarios.length} |`);
add(`| Requirement-derived | ${requirementScenarios.length} |`);
add(`| Exploratory | ${exploratoryScenarios.length} |`);
add(`| Automation ready | ${automationReady.length} |`);
add('');


// Review table

add('## Scenario Summary');
add('');

add(
  '| ID | Scenario | Priority | Type | Source | Automation |'
);

add(
  '|---|---|---|---|---|---|'
);

for (const scenario of plan.scenarios) {
  add(
    `| ${scenario.id} | ` +
    `${escapeTable(scenario.title)} | ` +
    `${scenario.priority} | ` +
    `${scenario.type} | ` +
    `${scenario.source} | ` +
    `${scenario.automationReady ? 'Yes' : 'No'} |`
  );
}

add('');


// Requirement-derived cases

add('# Requirement-derived Test Cases');
add('');

add(
  '> These scenarios are directly supported by the supplied requirements.'
);

add('');

for (const scenario of requirementScenarios) {
  renderScenario(scenario);
}


// Exploratory cases

if (exploratoryScenarios.length > 0) {
  add('# Exploratory Suggestions');
  add('');

  add(
    '> These scenarios go beyond explicit acceptance criteria and should be reviewed before being treated as product requirements.'
  );

  add('');

  for (const scenario of exploratoryScenarios) {
    renderScenario(scenario);
  }
}


const outputPath =
  planPath.replace(
    /\.json$/i,
    '.md'
  );

fs.writeFileSync(
  outputPath,
  lines.join('\n')
);

console.log(
  `Human-readable test plan: ${outputPath}`
);