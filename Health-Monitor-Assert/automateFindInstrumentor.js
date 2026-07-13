const fs = require('fs');
const path = require('path');
const { createInstrumenter } = require('istanbul-lib-instrument'); 

const skipFiles = new Set([
  'manualFindInstrumentor.js', 
  'i_manualFindInstrumentor.js','newFuzz.js','automateFindInstrumentor.js','instr.js'
]);
const skipDirs = new Set(['node_modules', '.git']);

const instrumenter = createInstrumenter({
  coverageVariable: '__coverage__',
  preserveComments: true,
  autoWrap: true
});

function shouldSkipFile(filePath) {
  const fileName = path.basename(filePath);
  return skipFiles.has(fileName);
}

function instrumentFile(filePath) {
  if (!filePath.endsWith('.js') || shouldSkipFile(filePath)) return;

  const topicName = path.basename(filePath, '.js');
  let code = fs.readFileSync(filePath, 'utf8');

  if (code.includes(`client.on('message'`)) {
    const coverageHandler = `

client.on('message', (topic, message) => {
    let testCaseId = null;

    try {
        const parsed = JSON.parse(message.toString());
        if (parsed.testCaseId) testCaseId = parsed.testCaseId;
    } catch {}

    if (global.__coverage__ && testCaseId !== null) {
        const payload = JSON.stringify({
            testCaseId,
            coverage: global.__coverage__
        });
        client.publish('coverage/${topicName}', payload);
    }
});
`;
    code += '\n' + coverageHandler;
  }

  instrumenter.instrument(code, filePath, (err, instrumentedCode) => {
    if (err) {
      console.error(`Error instrumenting ${filePath}:`, err.message);
      return;
    }

    const dir = path.dirname(filePath);
    const outFile = path.join(dir, `i_${path.basename(filePath)}`);
    fs.writeFileSync(outFile, instrumentedCode, 'utf8');
    console.log(`Instrumented and saved: ${outFile}`);
  });
}

function processDirectory(dir) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!skipDirs.has(entry.name)) {
        processDirectory(fullPath);
      }
    } else if (entry.isFile()) {
      instrumentFile(fullPath);
    }
  });
}

// Start from current directory
processDirectory(process.cwd());
