import React from 'react';
import { useQuery } from 'graphql-hooks';
import ms from 'ms';
import './App.css';

const ALL_ITEMS_QUERY = `
  {
    applicationStatus {
      building {
        npmSearch
        npmSearchBootstrap
      }
    }

    indexStatus {
      npmSearch {
        nbHits
      }
      npmSearchBootstrap {
        nbHits
      }
    }

    indexerStatus {
      seq
      stage
      bootstrapLastDone
      bootstrapLastId
    }

    npmStatus {
      seq
      nbDocs
    }
  }
`;

const Info = ({ as: Tag = 'span', className = '', ...props }) => (
  <Tag className={`${className} info-icon`} {...props}>
    <svg viewBox="-255 347 100 100">
      <path
        d="M-207.7 385.7h8.3c2 0 3.2.9 3.2 2.9 0 1.6-.2 3.3-.5 4.9-1.1 6-2.2 12.1-3.3 18.1-.4 2-.8 4-1 6-.1 1 0 2 .3 2.9.3 1.3 1.3 2 2.6 1.8 1.1-.1 2.1-.5 3.2-.9.8-.3 1.6-.9 2.4-1.2 1.2-.5 2.3.4 1.9 1.6-.2.7-.6 1.5-1.2 2-3.1 3.1-6.8 5-11.2 5-2.1 0-4.1 0-6.2-.3-3.4-.5-7.7-4.7-7.1-9.1.4-3.1.9-6.1 1.4-9.1.9-5.3 1.8-10.6 2.8-15.9.1-.3.1-.7.1-1 0-2.2-.7-3-2.9-3.3-.9-.1-1.9-.2-2.8-.5-1.1-.4-1.6-1.2-1.5-2.1.1-.9.7-1.5 1.9-1.7.6-.1 1.3-.1 1.9-.1h7.7zM-202.8 364.9c4.7 0 8.4 3.8 8.4 8.6 0 4.7-3.8 8.5-8.4 8.5-4.7 0-8.5-3.9-8.5-8.6 0-4.7 3.8-8.5 8.5-8.5z"
        fill="currentColor"
      />
    </svg>
  </Tag>
);

export default function App() {
  const {
    data,
    error,
    loading,
    refetch,
    fetchError,
    httpError,
    graphQLErrors,
  } = useQuery(ALL_ITEMS_QUERY);

  return (
    <>
      <div className="header">
        <button onClick={refetch} className="inaccessible-button">
          <svg viewBox="0 0 65 65" className={loading ? 'spin' : ''}>
            <title>refresh</title>
            <g fill="currentColor">
              <path d="M32.5 4.999c-5.405 0-10.444 1.577-14.699 4.282l-5.75-5.75v16.11h16.11l-6.395-6.395c3.18-1.787 6.834-2.82 10.734-2.82 12.171 0 22.073 9.902 22.073 22.074 0 2.899-.577 5.664-1.599 8.202l4.738 2.762C59.182 40.101 60 36.396 60 32.5 60 17.336 47.663 4.999 32.5 4.999zM43.227 51.746c-3.179 1.786-6.826 2.827-10.726 2.827-12.171 0-22.073-9.902-22.073-22.073 0-2.739.524-5.35 1.439-7.771l-4.731-2.851C5.761 25.149 5 28.736 5 32.5 5 47.664 17.336 60 32.5 60c5.406 0 10.434-1.584 14.691-4.289l5.758 5.759V45.358H36.838l6.389 6.388z" />
            </g>
          </svg>
        </button>
        <Info
          title="More information on GitHub"
          as="a"
          className="inaccessible-link"
          href="https://github.com/yarnpkg/search-indexer-dashboard"
        />
      </div>

      {error && (
        <Error
          httpError={httpError}
          fetchError={fetchError}
          graphQLErrors={graphQLErrors}
        />
      )}

      {!error && data && <Visualization data={data} />}
    </>
  );
}

function Visualization({ data }) {
  const {
    applicationStatus: { building },
    npmStatus,
    indexStatus: { npmSearch, npmSearchBootstrap },
    indexerStatus: {
      bootstrapLastId,
      stage,
      bootstrapLastDone: bootstrapLastDoneString,
      seq,
    },
  } = data;

  const bootstrapLastDone = Number(bootstrapLastDoneString);
  const nextBootstrap = bootstrapLastDone + ms('2 weeks');
  const timeSinceLastBootstrap = new Date().getTime() - bootstrapLastDone;

  return (
    <div>
      <div className="title">
        stage: <strong>{stage}</strong>
      </div>
      <div className="table">
        {stage === 'bootstrap' && (
          <BootstrapStage
            lastProcessed={{
              id: bootstrapLastId,
            }}
            progress={{
              npm: npmStatus.seq,
              diff: seq - npmStatus.seq,
              npmSearchBootstrap: seq,
            }}
            packages={{
              npmSearchBootstrap: npmSearchBootstrap.nbHits,
              diff: npmSearchBootstrap.nbHits - npmStatus.nbDocs,
              npm: npmStatus.nbDocs,
            }}
            jobs={{
              processing: building.npmSearchBootstrap,
            }}
          />
        )}
        {(stage === 'watch' || stage === 'replicate') && (
          <WatchStage
            bootstrap={{
              last: new Date(bootstrapLastDone),
              diff: ms(timeSinceLastBootstrap, { long: true }),
              next: new Date(nextBootstrap),
            }}
            sequence={{
              npmSearch: seq,
              diff: npmStatus.seq - seq,
              npm: npmStatus.seq,
            }}
            packages={{
              npmSearch: npmSearch.nbHits,
              diff: npmSearch.nbHits - npmStatus.nbDocs,
              npm: npmStatus.nbDocs,
            }}
            jobs={{
              processing: building.npmSearch,
            }}
          />
        )}
      </div>

      <small>
        <details className="raw-data">
          <summary>Raw data</summary>
          <p>
            If you are interested, there's also a{' '}
            <a href="/.netlify/functions/graphql">GraphQL playground</a>{' '}
            available for this data.
          </p>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </details>
      </small>
    </div>
  );
}

const BootstrapStage = ({ lastProcessed, progress, packages, jobs }) => (
  <>
    <div className="table-item" style={{ '--col-span': 3 }}>
      <progress
        min={0}
        max={packages.npm}
        value={packages.npmSearchBootstrap}
        title={`${Math.round(
          (100 * packages.npmSearchBootstrap) / packages.npm
        )}% (${packages.npmSearchBootstrap} out of ${packages.npm})`}
      />
    </div>

    <div className="table-item">
      <div>
        <code>bootstrap</code> sequence
      </div>
      <div className="medium">
        {(progress.npmSearchBootstrap || 0).toLocaleString('fr-FR')}
      </div>
    </div>
    <div className="table-item">
      <div>
        <span>sequence difference</span>
        <Info title="the difference in sequence defines how far the main index is behind. A sequence is an update on the npm registry" />
      </div>
      <div className="massive">{progress.diff}</div>
    </div>
    <div className="table-item">
      <div>
        <code>npm</code> sequence
      </div>
      <div className="medium">
        {(progress.npm || 0).toLocaleString('fr-FR')}
      </div>
    </div>

    <div className="table-item">
      <div>
        # packages in <code>bootstrap</code>
      </div>
      <div className="medium">
        {(packages.npmSearchBootstrap || 0).toLocaleString('fr-FR')}
      </div>
    </div>
    <div className="table-item">
      <div>
        <span># packages difference</span>
        <Info title="this should trend towards 0 in ±24h" />
      </div>
      <div className="massive">
        {(packages.diff || 0).toLocaleString('fr-FR')}
      </div>
    </div>
    <div className="table-item">
      <div>
        # packages in <code>npm</code>
      </div>
      <div className="medium">
        {(packages.npm || 0).toLocaleString('fr-FR')}
      </div>
    </div>

    <div className="table-item" style={{ '--col-span': 3 }}>
      <div>
        <span>jobs processing</span>
        <Info title="should be close to 0" />
      </div>
      <div className="massive">
        {(jobs.processing || 0).toLocaleString('fr-FR')}
      </div>
    </div>

    <div className="table-item" style={{ '--col-span': 3 }}>
      <div>
        <span>last processed</span>
        <Info title="this package was last added to the bootstrap index" />
      </div>
      <div className="mega">
        <code>{lastProcessed.id}</code>
      </div>
    </div>
  </>
);

const dayFormat = new Intl.DateTimeFormat('en-FR', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
});

const WatchStage = ({ bootstrap, sequence, packages, jobs }) => (
  <>
    <div className="table-item">
      <div>last bootstrap</div>
      <div className="medium" title={dayFormat.format(bootstrap.last)}>
        {(bootstrap.last || 0).toLocaleDateString('nl-BE')}
      </div>
      <div>{(bootstrap.last || 0).toLocaleTimeString('nl-BE')}</div>
    </div>
    <div className="table-item">
      <div>
        <span>time ago</span>
        <Info title="there is one bootstrap every 7 days" />
      </div>
      <div className="massive">{bootstrap.diff}</div>
    </div>
    <div className="table-item">
      <div>next bootstrap</div>
      <div className="medium" title={dayFormat.format(bootstrap.next)}>
        {(bootstrap.next || 0).toLocaleDateString('nl-BE')}
      </div>
      <div>{(bootstrap.next || 0).toLocaleTimeString('nl-BE')}</div>
    </div>

    <div className="table-item">
      <div>
        <code>npm-search</code> sequence
      </div>
      <div className="medium">
        {(sequence.npmSearch || 0).toLocaleString('fr-FR')}
      </div>
    </div>
    <div className="table-item">
      <div>
        <span>sequence difference</span>
        <Info title="the sequence difference should be close to 0. Any change in the npm registry is a sequence" />
      </div>
      <div className="massive">
        {(sequence.diff || 0).toLocaleString('fr-FR')}
      </div>
    </div>
    <div className="table-item">
      <div>
        <code>npm</code> sequence
      </div>
      <div className="medium">
        {(sequence.npm || 0).toLocaleString('fr-FR')}
      </div>
    </div>

    <div className="table-item">
      <div>
        # packages in <code>npm-search</code>
      </div>
      <div className="medium">
        {(packages.npmSearch || 0).toLocaleString('fr-FR')}
      </div>
    </div>
    <div className="table-item">
      <div>
        <span># packages difference</span>
        <Info title="the difference in number of packages should be close to 200 (packages we don't consider as real due to having no author)" />
      </div>
      <div className="massive">
        {(packages.diff || 0).toLocaleString('fr-FR')}
      </div>
    </div>
    <div className="table-item">
      <div>
        # packages in <code>npm</code>
      </div>
      <div className="medium">
        {(packages.npm || 0).toLocaleString('fr-FR')}
      </div>
    </div>

    <div className="table-item" />
    <div className="table-item">
      <div>
        <span>jobs processing</span>
        <Info title="should be close to 0" />
      </div>
      <div className="massive">
        {(jobs.processing || 0).toLocaleString('fr-FR')}
      </div>
    </div>
    <div className="table-item" />
  </>
);

function Error({ httpError, fetchError, graphQLErrors }) {
  if (httpError) {
    return <div className="error">{httpError.statusText}</div>;
  }
  if (graphQLErrors) {
    return (
      <div className="error">
        GraphQL Errors:
        {graphQLErrors.map((error) => (
          <ErrorMessage {...error} />
        ))}
      </div>
    );
  }

  return (
    <div className="error">
      A network error occurred:
      <ErrorMessage {...fetchError} />
    </div>
  );
}

function ErrorMessage({ message, ...more }) {
  return (
    <div>
      {message}
      <details>
        <summary>Full error</summary>
        <pre>{JSON.stringify(more, null, 2)}</pre>
      </details>
    </div>
  );
}
