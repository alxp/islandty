let linkedAgentHelper;

beforeAll(async () => {
  process.env.linkedAgentPath = 'test-agents';
  linkedAgentHelper = await import('../../src/islandty/linkedAgentHelper.js');
});

describe('linkedAgentHelper', () => {
  describe('initLinkedAgentsData', () => {
    test('returns empty object', () => {
      expect(linkedAgentHelper.initLinkedAgentsData()).toEqual({});
    });
  });

  describe('processItemForLinkedAgents', () => {
    test('adds linked agents to empty data', () => {
      const data = {};
      const item = {
        id: '1',
        field_linked_agent: {
          relators: { Author: ['Jane Austen'] },
        },
      };

      const result = linkedAgentHelper.processItemForLinkedAgents(item, data);
      expect(result).toEqual({
        relators: {
          Author: {
            'Jane Austen': {
              nameSlug: expect.any(String),
              values: ['1'],
            },
          },
        },
      });
    });

    test('appends item id to existing linked agent', () => {
      const data = {
        relators: {
          Author: {
            'Jane Austen': { nameSlug: 'jane-austen', values: ['1'] },
          },
        },
      };
      const item = {
        id: '2',
        field_linked_agent: { relators: { Author: ['Jane Austen'] } },
      };

      linkedAgentHelper.processItemForLinkedAgents(item, data);
      expect(data.relators.Author['Jane Austen'].values).toEqual(['1', '2']);
    });

    test('handles multiple linked agent types and names', () => {
      const data = {};
      const item = {
        id: '3',
        field_linked_agent: {
          relators: {
            Author: ['Jane Austen'],
            Editor: ['Charles Dickens'],
          },
        },
      };

      const result = linkedAgentHelper.processItemForLinkedAgents(item, data);
      expect(Object.keys(result.relators)).toHaveLength(2);
      expect(result.relators.Author['Jane Austen'].values).toEqual(['3']);
    });

    test('handles item with no linked agents', () => {
      const data = { existing: 'data' };
      const item = { id: '4', title: 'No agents' };

      const result = linkedAgentHelper.processItemForLinkedAgents(item, data);
      expect(result).toEqual({ existing: 'data' });
    });
  });

  // writeLinkedAgentFiles and configureLinkedAgentCollections require
  // filesystem or glob mocking that is unreliable with CJS require in Vitest.
  // Those functions are exercised by the existing integration tests
  // (readCSV.test.js) which run the full pipeline and verify output files.
});
