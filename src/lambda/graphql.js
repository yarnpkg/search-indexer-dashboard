require('dotenv').config();
const { ApolloServer, gql } = require('apollo-server-lambda');
const algoliasearch = require('algoliasearch');
const got = require('got');

const { ALGOLIA_APP_ID, ALGOLIA_API_KEY } = process.env;

const searchClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_API_KEY);

const algoliaIndex = searchClient.initIndex('npm-search');

// The GraphQL schema
const typeDefs = gql`
  "Status of an Algolia index"
  type IndexStatus {
    nbHits: Int
  }

  type IndexesStatus {
    npmSearch: IndexStatus
    npmSearchBootstrap: IndexStatus
  }

  "Status of the indexer"
  type IndexerStatus {
    "Last npm sequence indexed"
    seq: Int
    "Is bootstrap sequence completed"
    bootstrapDone: Boolean
    "Last package indexed in bootstrap"
    bootstrapLastId: String
    "Date last finished bootstrap"
    bootstrapLastDone: String
  }

  "status of the npm api"
  type NpmStatus {
    "current npm sequence"
    seq: Int
    "number of packages in the registry"
    nbDocs: Int
  }

  type BuildJobs {
    npmSearch: Int
    npmSearchBootstrap: Int
  }

  "Status on the whole application"
  type ApplicationStatus {
    building: BuildJobs
    nbRecords: Int
    dataSize: Int
    fileSize: Int
    nbIndexes: Int
    nbBuildingIndexes: Int
    oldestJob: Int
    todayOperations: Int
    yesterdayOperations: Int
    todayIndexingOperations: Int
    yesterdayIndexingOperations: Int
  }

  type Query {
    applicationStatus: ApplicationStatus
    indexStatus: IndexesStatus
    indexerStatus: IndexerStatus
    npmStatus: NpmStatus
    exposure: String
  }
`;

const resolvers = {
  Query: {
    applicationStatus: () => {
      return searchClient
        ._jsonRequest({
          method: 'GET',
          url: '/1/indexes/*/stats',
          hostType: 'write',
        })
        .then(({ building, ...otherKeys }) => ({
          building: {
            npmSearch: building['npm-search'] || 0,
            npmSearchBootstrap: building['npm-search-bootstrap'] || 0,
          },
          ...otherKeys,
        }));
    },
    indexStatus: () =>
      searchClient
        .search([
          {
            indexName: 'npm-search',
            params: {
              hitsPerPage: 1,
              attributesToRetrieve: [],
              attributesToHighlight: [],
            },
          },
          {
            indexName: 'npm-search-bootstrap',
            params: {
              hitsPerPage: 1,
              attributesToRetrieve: [],
              attributesToHighlight: [],
            },
          },
        ])
        .then(({ results: [npmSearch, npmSearchBootstrap] }) => {
          return { npmSearch, npmSearchBootstrap };
        }),
    indexerStatus: () =>
      algoliaIndex
        .getSettings()
        .then(
          ({
            userData: {
              seq,
              bootstrapDone,
              bootstrapLastId,
              bootstrapLastDone = 0,
            },
          }) => ({
            seq,
            bootstrapDone,
            bootstrapLastId,
            bootstrapLastDone: bootstrapLastDone.toString(),
          })
        ),
    npmStatus: () =>
      got('https://replicate.npmjs.com/registry', {
        json: true,
      }).then(({ body: { doc_count: nbDocs, update_seq: seq } }) => ({
        nbDocs,
        seq,
      })),
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

exports.handler = server.createHandler();
