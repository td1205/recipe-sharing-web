// Synthetic in-memory lifecycle tests only; never import the real DB repository.
const assert = require('node:assert/strict');
const Module = require('node:module');

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (/prisma|mysql|gemini|nodemailer|google\/genai/i.test(request)) {
    throw new Error('External dependency forbidden in lifecycle fixture');
  }
  return originalLoad.call(this, request, parent, isMain);
};

let now = 1700000000000;
Date.now = () => now;
let featureCalls = 0;
let interactionCalls = 0;
let loadFeatures = async () => [{ id: 1, title: 'Fixture', ingredients: [], tags: [] }];
const repositoryPath = require.resolve('../../repositories/recommendationRepository');
require.cache[repositoryPath] = {
  id: repositoryPath, filename: repositoryPath, loaded: true,
  exports: {
    loadRecipeFeatures: () => { featureCalls++; return loadFeatures(); },
    loadInteractions: async () => {
      interactionCalls++;
      return { interactions: [], anonymousViews: new Map() };
    },
  },
};

const logs = [];
const output = console.log;
console.log = () => {};
console.error = (...args) => logs.push(args);
const service = require('../../services/recommender');
const tick = () => new Promise(resolve => setImmediate(resolve));
const stale = () => { now += 11 * 60 * 1000; };
const failure = new Error('SYNTHETIC_FAILURE_PRIVATE_DETAIL');
const fail = () => { loadFeatures = async () => { throw failure; }; };
const succeed = (id = 2) => { loadFeatures = async () => [{ id, title: 'Fixture', ingredients: [], tags: [] }]; };
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const checkLoggedFailure = () => {
  assert.equal(logs.length, 1, 'one controlled log per failed build');
  assert.ok(!JSON.stringify(logs).includes(failure.message), 'do not log raw repository error details');
};

async function run(scenario) {
  switch (scenario) {
    case 'stale-failure-retry': {
      const old = await service.getModels();
      stale(); fail();
      assert.equal(await service.getModels(), old);
      // Strict Node rejection mode terminates the child if background rejection leaks.
      await tick(); await tick();
      checkLoggedFailure();
      assert.equal(featureCalls, 2);
      succeed();
      assert.equal(await service.getModels(), old, 'failed rebuild must not refresh old TTL');
      const fresh = await service.getModels({ forceRebuild: true });
      assert.notEqual(fresh, old);
      assert.ok(fresh.content.has(2));
      assert.equal(featureCalls, 3);
      break;
    }
    case 'cold-failure-retry': {
      fail();
      await assert.rejects(service.getModels(), error => error === failure);
      await tick(); checkLoggedFailure();
      succeed();
      assert.ok((await service.getModels()).content.has(2));
      assert.equal(featureCalls, 2);
      break;
    }
    case 'force-failure-retains-cache': {
      const old = await service.getModels();
      fail();
      await assert.rejects(service.getModels({ forceRebuild: true }), error => error === failure);
      await tick(); checkLoggedFailure();
      assert.equal(await service.getModels(), old);
      assert.equal(featureCalls, 2, 'fresh old cache still usable');
      succeed();
      const fresh = await service.getModels({ forceRebuild: true });
      assert.notEqual(fresh, old);
      assert.equal(featureCalls, 3);
      break;
    }
    case 'concurrent-cold': {
      const pending = deferred(); loadFeatures = () => pending.promise;
      const requests = Array.from({ length: 12 }, () => service.getModels());
      assert.equal(featureCalls, 1); assert.equal(interactionCalls, 1);
      pending.resolve([{ id: 1, title: 'Fixture', ingredients: [], tags: [] }]);
      const models = await Promise.all(requests);
      assert.ok(models.every(model => model === models[0]));
      assert.ok(models[0].content.has(1));
      break;
    }
    case 'concurrent-stale': {
      const old = await service.getModels(); stale();
      const pending = deferred(); loadFeatures = () => pending.promise;
      const models = await Promise.all(Array.from({ length: 12 }, () => service.getModels()));
      assert.ok(models.every(model => model === old));
      assert.equal(featureCalls, 2);
      const forced = service.getModels({ forceRebuild: true });
      pending.resolve([{ id: 2, title: 'Fixture', ingredients: [], tags: [] }]);
      const fresh = await forced;
      assert.notEqual(fresh, old); assert.ok(fresh.content.has(2));
      assert.equal(featureCalls, 2, 'force joins existing background build');
      assert.equal(await service.getModels(), fresh);
      break;
    }
    case 'concurrent-force-failure-retry': {
      const old = await service.getModels(); stale();
      const pending = deferred(); loadFeatures = () => pending.promise;
      const settled = Promise.allSettled(Array.from({ length: 12 }, () => service.getModels({ forceRebuild: true })));
      assert.equal(await service.getModels(), old);
      assert.equal(featureCalls, 2);
      pending.reject(failure);
      const results = await settled;
      assert.ok(results.every(result => result.status === 'rejected' && result.reason === failure));
      await tick(); checkLoggedFailure();
      succeed();
      assert.ok((await service.getModels({ forceRebuild: true })).content.has(2));
      assert.equal(featureCalls, 3);
      break;
    }
    case 'fresh-cache': {
      const model = await service.getModels();
      const models = await Promise.all(Array.from({ length: 12 }, () => service.getModels()));
      assert.ok(models.every(item => item === model));
      assert.equal(featureCalls, 1); assert.equal(interactionCalls, 1);
      assert.equal(logs.length, 0);
      break;
    }
    default: throw new Error('Unknown lifecycle scenario');
  }
  await tick(); await tick();
  output(`SCENARIO PASS: ${scenario}; featureLoads=${featureCalls}; controlledErrors=${logs.length}`);
}

run(process.argv[2]).catch(error => {
  process.stderr.write(`${error.stack}\n`);
  process.exitCode = 1;
});
