require('dotenv').config();
const { ApolloServer, gql } = require('apollo-server-lambda');
const algoliasearch = require('algoliasearch');
const got = require('got');

const { ALGOLIA_APP_ID, ALGOLIA_API_KEY } = process.env;

const searchClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_API_KEY);

// The GraphQL schema
const typeDefs = gql`
  # Status of an Algolia index
  type IndexStatus {
    nbHits: Int
  }

  type IndexesStatus {
    main: IndexStatus
    bootstrap: IndexStatus
  }

  # Current stage of the indexer
  enum IndexerStage {
    bootstrap
    replicate
    watch
  }

  # Status of the indexer process
  type IndexerStatus {
    # Last npm sequence indexed
    seq: Int
    # Is bootstrap sequence completed
    bootstrapDone: Boolean
    # Last package indexed in bootstrap
    bootstrapLastId: String
    # Date last finished bootstrap
    bootstrapLastDone: String
    # stage
    stage: IndexerStage
  }

  # status of the npm api
  type NpmStatus {
    # current npm sequence
    seq: Int
    # number of packages in the registry
    nbDocs: Int
  }

  type BuildJobs {
    main: Int
    bootstrap: Int
  }

  # Status on the whole application
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
    applicationStatus(
      mainIndexName: String
      bootstrapIndexName: String
    ): ApplicationStatus
    indexStatus(
      mainIndexName: String
      bootstrapIndexName: String
    ): IndexesStatus
    indexerStatus(mainIndexName: String): IndexerStatus
    npmStatus: NpmStatus
  }
`;

const resolvers = {
  Query: {
    applicationStatus: (
      _parent,
      {
        mainIndexName = 'npm-search',
        bootstrapIndexName = 'npm-search-bootstrap',
      }
    ) => {
      return searchClient
        ._jsonRequest({
          method: 'GET',
          url: '/1/indexes/*/stats',
          hostType: 'write',
        })
        .then(({ building, ...otherKeys }) => ({
          building: {
            main: building[mainIndexName] || 0,
            bootstrap: building[bootstrapIndexName] || 0,
          },
          ...otherKeys,
        }));
    },
    indexStatus: (
      _parent,
      {
        mainIndexName = 'npm-search',
        bootstrapIndexName = 'npm-search-bootstrap',
      }
    ) => {
      return searchClient
        .search([
          {
            indexName: mainIndexName,
            params: {
              hitsPerPage: 1,
              attributesToRetrieve: [],
              attributesToHighlight: [],
            },
          },
          {
            indexName: bootstrapIndexName,
            params: {
              hitsPerPage: 1,
              attributesToRetrieve: [],
              attributesToHighlight: [],
            },
          },
        ])
        .then(({ results: [main, bootstrap] }) => {
          return { main, bootstrap };
        });
    },
    indexerStatus: (_parent, { mainIndexName = 'npm-search' }) =>
      searchClient
        .initIndex(mainIndexName)
        .getSettings()
        .then(
          ({
            userData: {
              seq,
              bootstrapDone,
              bootstrapLastId,
              bootstrapLastDone = 0,
              stage,
            },
          }) => ({
            seq,
            bootstrapDone,
            bootstrapLastId,
            bootstrapLastDone: bootstrapLastDone.toString(),
            stage,
          })
        ),
    npmStatus: () =>
      got('https://replicate.npmjs.com', { json: true }).then(
        ({ body: { doc_count: nbDocs, update_seq: seq } }) => ({
          nbDocs,
          seq,
        })
      ),
  },
};

const ALL_ITEMS_QUERY = `
  {
    applicationStatus(
      mainIndexName: "npm-search"
      bootstrapIndexName: "npm-search-bootstrap"
    ) {
      building {
        main
        bootstrap
      }
    }

    indexStatus(
      mainIndexName: "npm-search"
      bootstrapIndexName: "npm-search-bootstrap"
    ) {
      main {
        nbHits
      }
      bootstrap {
        nbHits
      }
    }

    indexerStatus(mainIndexName: "npm-search") {
      seq
      stage
      bootstrapLastDone
      bootstrapDone
      bootstrapLastId
    }

    npmStatus {
      seq
      nbDocs
    }
  }
`;

const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true,
  playground: {
    settings: {
      'editor.theme': 'light',
    },
    endpoint: '/.netlify/functions/graphql',
    tabs: [
      {
        endpoint: '/.netlify/functions/graphql',
        name: 'all items',
        query: ALL_ITEMS_QUERY,
      },
    ],
  },
});

exports.handler = server.createHandler();
