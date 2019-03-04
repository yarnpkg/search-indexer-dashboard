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
      <button onClick={refetch} className="inaccessible-button">
        <svg viewBox="0 0 65 65" className={loading ? 'spin' : ''}>
          <title>refresh</title>
          <g fill="currentColor">
            <path d="M32.5 4.999c-5.405 0-10.444 1.577-14.699 4.282l-5.75-5.75v16.11h16.11l-6.395-6.395c3.18-1.787 6.834-2.82 10.734-2.82 12.171 0 22.073 9.902 22.073 22.074 0 2.899-.577 5.664-1.599 8.202l4.738 2.762C59.182 40.101 60 36.396 60 32.5 60 17.336 47.663 4.999 32.5 4.999zM43.227 51.746c-3.179 1.786-6.826 2.827-10.726 2.827-12.171 0-22.073-9.902-22.073-22.073 0-2.739.524-5.35 1.439-7.771l-4.731-2.851C5.761 25.149 5 28.736 5 32.5 5 47.664 17.336 60 32.5 60c5.406 0 10.434-1.584 14.691-4.289l5.758 5.759V45.358H36.838l6.389 6.388z" />
          </g>
        </svg>
      </button>

      {error && (
        <Error
          httpError={httpError}
          fetchError={fetchError}
          graphQLErrors={graphQLErrors}
        />
      )}

      {data && <Visualization data={data} />}
    </>
  );
}

function Visualization({ data }) {
  const {
    applicationStatus: { building },
    npmStatus,
    indexStatus: { npmSearch, npmSearchBootstrap },
    indexerStatus: { bootstrapLastId, bootstrapDone, bootstrapLastDone, seq },
  } = data;

  const stage = bootstrapDone ? 'watch' : 'bootstrap';

  const bootstrapLastDoneDate = new Date(Number(bootstrapLastDone));
  const nextBootstrapDate = new Date(
    bootstrapLastDoneDate.getFullYear(),
    bootstrapLastDoneDate.getMonth(),
    bootstrapLastDoneDate.getDate() + 7
  );
  nextBootstrapDate.setUTCHours(bootstrapLastDoneDate.getUTCHours());
  nextBootstrapDate.setUTCMinutes(bootstrapLastDoneDate.getUTCMinutes());
  nextBootstrapDate.setUTCSeconds(bootstrapLastDoneDate.getUTCSeconds());
  const timeSinceLastBootstrap =
    new Date().getTime() - bootstrapLastDoneDate.getTime();

  return (
    <div>
      <div className="title">
        stage: <strong>{stage}</strong>
      </div>
      <div className="table">
        {stage === 'bootstrap' && (
          <BootstrapStage
            lastProcessed={{ id: bootstrapLastId }}
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
            jobs={{ processing: building.npmSearchBootstrap }}
          />
        )}
        {stage === 'watch' && (
          <WatchStage
            bootstrap={{
              last: bootstrapLastDoneDate,
              diff: ms(timeSinceLastBootstrap, { long: true }),
              next: nextBootstrapDate,
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
            jobs={{ processing: building.npmSearch }}
          />
        )}
      </div>
      <small>
        <details className="raw-data">
          <summary>Raw data</summary>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </details>
      </small>
    </div>
  );
}

const BootstrapStage = ({ lastProcessed, progress, packages, jobs }) => (
  <>
    <div className="table-item">
      <div>
        <code>bootstrap</code> sequence
      </div>
      <div className="medium">
        {progress.npmSearchBootstrap.toLocaleString('fr-FR')}
      </div>
    </div>
    <div className="table-item">
      <div>sequence difference</div>
      <div className="massive">{progress.diff}</div>
    </div>
    <div className="table-item">
      <div>
        <code>npm</code> sequence
      </div>
      <div className="medium">{progress.npm.toLocaleString('fr-FR')}</div>
    </div>

    <div className="table-item">
      <div>
        # packages in <code>bootstrap</code>
      </div>
      <div className="medium">
        {packages.npmSearchBootstrap.toLocaleString('fr-FR')}
      </div>
    </div>
    <div className="table-item">
      <div># packages difference</div>
      <div className="massive">{packages.diff.toLocaleString('fr-FR')}</div>
    </div>
    <div className="table-item">
      <div>
        # packages in <code>npm</code>
      </div>
      <div className="medium">{packages.npm.toLocaleString('fr-FR')}</div>
    </div>

    <div className="table-item" style={{ '--col-span': 3 }}>
      <div>jobs processing</div>
      <div className="massive">{jobs.processing.toLocaleString('fr-FR')}</div>
    </div>

    <div className="table-item" style={{ '--col-span': 3 }}>
      <div>last processed</div>
      <div className="mega">
        <code>{lastProcessed.id}</code>
      </div>
    </div>
  </>
);

const WatchStage = ({ bootstrap, sequence, packages, jobs }) => (
  <>
    <div className="table-item">
      <div>last bootstrap</div>
      <div className="medium">{bootstrap.last.toLocaleDateString('nl-BE')}</div>
      <div>{bootstrap.last.toLocaleTimeString('nl-BE')}</div>
    </div>
    <div className="table-item">
      <div>time ago</div>
      <div className="massive">{bootstrap.diff}</div>
    </div>
    <div className="table-item">
      <div>next bootstrap</div>
      <div className="medium">{bootstrap.next.toLocaleDateString('nl-BE')}</div>
      <div>{bootstrap.next.toLocaleTimeString('nl-BE')}</div>
    </div>

    <div className="table-item">
      <div>
        <code>npm-search</code> sequence
      </div>
      <div className="medium">{sequence.npmSearch.toLocaleString('fr-FR')}</div>
    </div>
    <div className="table-item">
      <div>sequence difference</div>
      <div className="massive">{sequence.diff.toLocaleString('fr-FR')}</div>
    </div>
    <div className="table-item">
      <div>
        <code>npm</code> sequence
      </div>
      <div className="medium">{sequence.npm.toLocaleString('fr-FR')}</div>
    </div>

    <div className="table-item">
      <div>
        # packages in <code>npm-search</code>
      </div>
      <div className="medium">{packages.npmSearch.toLocaleString('fr-FR')}</div>
    </div>
    <div className="table-item">
      <div># packages difference</div>
      <div className="massive">{packages.diff.toLocaleString('fr-FR')}</div>
    </div>
    <div className="table-item">
      <div>
        # packages in <code>npm</code>
      </div>
      <div className="medium">{packages.npm.toLocaleString('fr-FR')}</div>
    </div>

    <div className="table-item" />
    <div className="table-item">
      <div>jobs processing</div>
      <div className="massive">{jobs.processing.toLocaleString('fr-FR')}</div>
    </div>
    <div className="table-item" />
  </>
);

function Error({ httpError, fetchError, graphQLErrors }) {
  if (httpError) return <div className="error">{httpError.statusText}</div>;

  return (
    <div className="error">
      An error occurred
      <pre>{JSON.stringify([fetchError, graphQLErrors])}</pre>
    </div>
  );
}