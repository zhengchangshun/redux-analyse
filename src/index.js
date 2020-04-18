import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware } from './redux';
import rootReducer from './reducers';
import App from './components/App';

// middleware
const logger = (store) => (next) => (action) => {
    console.info('logger start');
    let result = next(action);
    console.info('logger end');
};
const Test = (store) => (next) => (action) => {
    console.info('test start');
    let result = next(action);
    console.info('test end');
};

let store = createStore(rootReducer, applyMiddleware(logger, Test));

render(
    <Provider store={store}>
        <App />
    </Provider>,
    document.getElementById('root')
);