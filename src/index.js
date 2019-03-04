import React from 'react';
import ReactDOM from 'react-dom';
import { GraphQLClient, ClientContext } from 'graphql-hooks';

import './index.css';
import App from './App';

const client = new GraphQLClient({
  url: '/.netlify/functions/graphql',
});

ReactDOM.render(
  <ClientContext.Provider value={client}>
    <App />
  </ClientContext.Provider>,
  document.getElementById('root')
);
