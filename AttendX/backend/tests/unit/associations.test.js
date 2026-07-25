/**
 * Safety net for the src/index.js → src/app.js + src/associations.js split.
 *
 * tests/fixtures/associations.snapshot.json was generated from the pre-split src/index.js.
 * Requiring src/app.js must reproduce it exactly — same 24 models, same 64 associations,
 * same alias/foreignKey/type/target for each. Any drift here means an include-based query
 * somewhere has silently changed shape.
 *
 * No database is touched: sequelize.define() and Model.hasMany() are pure metadata.
 */
const expected = require('../fixtures/associations.snapshot.json');

const describeGraph = (sequelize) => {
  const graph = {};
  for (const modelName of Object.keys(sequelize.models).sort()) {
    const model = sequelize.models[modelName];
    const assocs = {};
    for (const key of Object.keys(model.associations).sort()) {
      const a = model.associations[key];
      assocs[key] = {
        as: a.as,
        foreignKey: a.foreignKey,
        associationType: a.associationType,
        target: a.target.name,
      };
    }
    graph[modelName] = assocs;
  }
  return graph;
};

describe('model association graph', () => {
  let sequelize;

  beforeAll(() => {
    require('../../src/app');
    sequelize = require('../../src/config/database');
  });

  it('matches the pre-split snapshot exactly', () => {
    expect(describeGraph(sequelize)).toEqual(expected);
  });

  it('registers every model', () => {
    expect(Object.keys(sequelize.models).sort()).toEqual(Object.keys(expected).sort());
  });

  it('is idempotent — calling defineAssociations() again changes nothing', () => {
    const before = describeGraph(sequelize);
    require('../../src/associations')();
    expect(describeGraph(sequelize)).toEqual(before);
  });
});
