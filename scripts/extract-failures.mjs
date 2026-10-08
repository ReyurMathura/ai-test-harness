import fs from 'fs';

const reportPath = 'reports/results.json';
const outputPath = 'reports/failures.json';

const report = JSON.parse(
  fs.readFileSync(reportPath, 'utf-8')
);

const failures = [];

function walkSuites(suites = []) {
  for (const suite of suites) {

    if (suite.specs) {
      for (const spec of suite.specs) {

        for (const test of spec.tests ?? []) {

          for (const result of test.results ?? []) {

            if (result.status === 'failed') {
              failures.push({
                title: spec.title,
                browser: test.projectName,
                file: spec.file,
                line: spec.line,

                error: result.error?.message ?? 'Unknown error',

                duration: result.duration,

                attachments:
                  result.attachments?.map((attachment) => ({
                    name: attachment.name,
                    path: attachment.path,
                    contentType: attachment.contentType,
                  })) ?? [],
              });
            }

          }
        }

      }
    }

    walkSuites(suite.suites);
  }
}

walkSuites(report.suites);

fs.writeFileSync(
  outputPath,
  JSON.stringify(failures, null, 2)
);

console.log(`Found ${failures.length} failed test result(s).`);
console.log(`Written to ${outputPath}`);